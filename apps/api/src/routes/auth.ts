import { FastifyPluginAsync } from "fastify";
import { ethers } from "ethers";
import { SiweMessage } from "siwe";
import { z } from "zod";
import { db } from "../db/client";
import { config } from "../config";
import { getUserTokenId } from "../services/token-gate";
import { initPetState } from "../services/pets-sync";

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /auth/nonce — frontend calls this before building the SIWE message
  fastify.get<{ Params: { wallet: string } }>(
    "/nonce/:wallet",
    async (req, reply) => {
      const { wallet } = req.params;
      if (!ethers.isAddress(wallet)) {
        return reply.code(400).send({ error: "Invalid address" });
      }
      const nonce = ethers.hexlify(ethers.randomBytes(16)).slice(2);
      await db.query(
        `INSERT INTO nonces (wallet_address, nonce, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (wallet_address) DO UPDATE SET nonce = $2, created_at = NOW()`,
        [wallet.toLowerCase(), nonce]
      );
      return { nonce };
    }
  );

  // POST /auth/siwe — verify the signed SIWE message and issue JWT
  fastify.post(
    "/siwe",
    {
      schema: {
        body: {
          type: "object",
          required: ["message", "signature"],
          properties: {
            message:   { type: "string" },
            signature: { type: "string" },
          },
        },
      },
    },
    async (req, reply) => {
      const { message, signature } = req.body as { message: string; signature: string };

      let siweMsg: SiweMessage;
      try {
        siweMsg = new SiweMessage(message);
        const result = await siweMsg.verify({ signature, domain: config.SIWE_DOMAIN });
        if (!result.success) throw new Error("Verification failed");
      } catch (err) {
        return reply.code(401).send({ error: "SIWE verification failed" });
      }

      const wallet = siweMsg.address.toLowerCase();

      // Verify nonce matches and check expiration
      const { rows: nonceRows } = await db.query(
        "SELECT nonce, created_at FROM nonces WHERE wallet_address = $1",
        [wallet]
      );
      if (!nonceRows[0] || nonceRows[0].nonce !== siweMsg.nonce) {
        return reply.code(401).send({ error: "Invalid or expired nonce" });
      }

      // Check nonce expiration (5 minutes)
      const nonceAge = Date.now() - new Date(nonceRows[0].created_at).getTime();
      const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
      if (nonceAge > NONCE_EXPIRY_MS) {
        await db.query("DELETE FROM nonces WHERE wallet_address = $1", [wallet]);
        return reply.code(401).send({ error: "Nonce expired" });
      }

      // Check message expiration (SIWE expirationTime)
      if (siweMsg.expirationTime) {
        const expirationTime = new Date(siweMsg.expirationTime).getTime();
        if (Date.now() > expirationTime) {
          return reply.code(401).send({ error: "Message expired" });
        }
      }

      // Check not-before time (SIWE notBefore)
      if (siweMsg.notBefore) {
        const notBeforeTime = new Date(siweMsg.notBefore).getTime();
        if (Date.now() < notBeforeTime) {
          return reply.code(401).send({ error: "Message not yet valid" });
        }
      }

      // Verify domain matches
      if (siweMsg.domain !== config.SIWE_DOMAIN) {
        return reply.code(401).send({ error: "Invalid domain" });
      }

      // Verify chain ID matches
      if (siweMsg.chainId?.toString() !== config.SIWE_CHAIN_ID) {
        return reply.code(401).send({ error: "Invalid chain ID" });
      }

      // Clean up used nonce (prevent replay)
      await db.query("DELETE FROM nonces WHERE wallet_address = $1", [wallet]);

      // Upsert user
      const { rows } = await db.query(
        `INSERT INTO users (wallet_address, last_login_at)
         VALUES ($1, NOW())
         ON CONFLICT (wallet_address) DO UPDATE SET last_login_at = NOW()
         RETURNING id, wallet_address, token_id, username, display_name, role, status, is_creator, bonus_claimed_at`,
        [wallet]
      );
      const user = rows[0];

      // First time: no token_id yet — mint SFT on-chain via deployer wallet
      if (!user.token_id) {
        try {
          const provider = new ethers.JsonRpcProvider(config.BASE_SEPOLIA_RPC_URL);
          const deployer = new ethers.Wallet(config.DEPLOYER_PRIVATE_KEY, provider);

          const registryAbi = [
            "function mintProfile(address user, uint256 startingPrice) external returns (uint256)",
          ];
          const marketAbi = [
            "function initPet(uint256 tokenId, address owner, uint256 price) external",
          ];

          const registry = new ethers.Contract(config.PETS_REGISTRY_ADDRESS, registryAbi, deployer);
          const market   = new ethers.Contract(config.PETS_MARKET_ADDRESS,   marketAbi,   deployer);

          const startingPrice = BigInt(config.STARTING_PRICE_PCASH);

          const tx1 = await registry.mintProfile(wallet, startingPrice);
          const receipt1 = await tx1.wait();

          // Get the returned tokenId from the event or static call
          const tokenId = await registry.mintProfile.staticCall(wallet, startingPrice).catch(() => {
            // If static call fails (already minted), read from chain
            return null;
          });

          if (receipt1 && receipt1.status === 1) {
            // Parse tokenId from emitted ProfileMinted event
            const iface = new ethers.Interface([
              "event ProfileMinted(address indexed user, uint256 indexed tokenId, uint256 startingPrice)",
            ]);
            let mintedTokenId: bigint | null = null;
            for (const log of receipt1.logs) {
              try {
                const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
                if (parsed?.name === "ProfileMinted") {
                  mintedTokenId = parsed.args[1] as bigint;
                  break;
                }
              } catch {}
            }

            if (mintedTokenId !== null) {
              const tx2 = await market.initPet(mintedTokenId, wallet, startingPrice);
              await tx2.wait();

              await db.query("UPDATE users SET token_id = $1 WHERE wallet_address = $2", [
                Number(mintedTokenId),
                wallet,
              ]);
              user.token_id = Number(mintedTokenId);

              await initPetState(Number(mintedTokenId), wallet, startingPrice.toString());
            }
          }
        } catch (err) {
          // Log but don't fail login — user can still auth, token minting can be retried
          fastify.log.error({ err, wallet }, "[auth] SFT mint failed");
        }
      }

      if (user.status === "suspended") {
        return reply.code(403).send({ error: "Account suspended" });
      }

      const accessToken = fastify.jwt.sign({
        userId: user.id,
        wallet: user.wallet_address,
        role:   user.role,
      });

      return {
        accessToken,
        user: {
          id:             user.id,
          wallet:         user.wallet_address,
          tokenId:        user.token_id,
          username:       user.username,
          displayName:    user.display_name,
          isCreator:      user.is_creator,
          bonusClaimedAt: user.bonus_claimed_at,
        },
      };
    }
  );
};

export default authRoutes;
