import { FastifyPluginAsync } from "fastify";
import { ethers } from "ethers";
import { SiweMessage } from "siwe";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "../db/client";
import { config } from "../config";
import { getUserTokenId } from "../services/token-gate";
import { initPetState, initPetStateOffchain } from "../services/pets-sync";
import { scrypt as scryptCb, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number
) => Promise<Buffer>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  const derived = await scrypt(password, salt, expected.length);
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** Deterministic synthetic wallet for non-crypto (email) users, so
 *  pets_state.user_address links back to the user row for buy_pet() credits. */
function syntheticWalletForEmail(email: string): string {
  const h = crypto.createHash("md5").update(`email:${email.toLowerCase()}`).digest("hex");
  return `0x${h.slice(0, 40)}`;
}

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

      // Upsert user first — only consume nonce after successful upsert
      const { rows } = await db.query(
        `INSERT INTO users (wallet_address, last_login_at)
         VALUES ($1, NOW())
         ON CONFLICT (wallet_address) DO UPDATE SET last_login_at = NOW()
         RETURNING id, wallet_address, token_id, username, display_name, role, status, is_creator, bonus_claimed_at`,
        [wallet]
      );
      const user = rows[0];

      if (user.status === "suspended") {
        return reply.code(403).send({ error: "Account suspended" });
      }

      // Consume nonce now — user is verified and not suspended
      await db.query("DELETE FROM nonces WHERE wallet_address = $1", [wallet]);

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

      const accessToken  = fastify.jwt.sign(
        { userId: user.id, wallet: user.wallet_address, role: user.role },
        { expiresIn: "1h" }
      );
      const refreshToken = jwt.sign(
        { userId: user.id, wallet: user.wallet_address, role: user.role, type: "refresh" },
        config.JWT_REFRESH_SECRET,
        { expiresIn: "30d" }
      );

      return {
        accessToken,
        refreshToken,
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

  // POST /auth/refresh — exchange a valid refresh token for a new access token
  fastify.post(
    "/refresh",
    async (req, reply) => {
      const { refreshToken } = req.body as { refreshToken?: string };
      if (!refreshToken) {
        return reply.code(400).send({ error: "refreshToken required" });
      }

      let decoded: { userId: string; wallet: string; role: string; type?: string };
      try {
        decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as {
          userId: string; wallet: string; role: string; type?: string;
        };
      } catch {
        return reply.code(401).send({ error: "Invalid or expired refresh token" });
      }

      if (decoded.type !== "refresh") {
        return reply.code(401).send({ error: "Not a refresh token" });
      }

      const { rows } = await db.query(
        "SELECT id, wallet_address, role, status FROM users WHERE id = $1",
        [decoded.userId]
      );
      if (!rows[0] || rows[0].status === "suspended") {
        return reply.code(403).send({ error: "Account unavailable" });
      }

      const newAccessToken = fastify.jwt.sign(
        { userId: rows[0].id, wallet: rows[0].wallet_address, role: rows[0].role },
        { expiresIn: "1h" }
      );

      return { accessToken: newAccessToken };
    }
  );

  // POST /auth/team-login — internal team testing only (requires TEAM_SECRET env var)
  fastify.post("/team-login", async (req, reply) => {
    const { secret, name } = req.body as { secret?: string; name?: string };

    if (!config.TEAM_SECRET) {
      return reply.code(404).send({ error: "Not found" });
    }
    if (secret !== config.TEAM_SECRET) {
      return reply.code(401).send({ error: "Invalid team secret" });
    }

    const memberName  = (name ?? "tester").trim().toLowerCase().replace(/\s+/g, "-").slice(0, 20);
    const h           = crypto.createHash("md5").update(`team:${memberName}`).digest("hex");
    const memberId    = `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
    const fakeWallet  = `0x${h.slice(0, 40)}`;

    await db.query(`
      INSERT INTO users (id, wallet_address, role, wallet_type, created_at)
      VALUES ($1, $2, 'user', 'self_custody', NOW())
      ON CONFLICT (id) DO NOTHING
    `, [memberId, fakeWallet]);

    const token = fastify.jwt.sign(
      { userId: memberId, wallet: fakeWallet, role: "user" },
      { expiresIn: "7d" }
    );

    return { token, userId: memberId, name: memberName };
  });

  // Issue access + refresh tokens for a user row (shared by register/login).
  function issueTokens(user: { id: string; wallet_address: string | null; role: string }) {
    const wallet = user.wallet_address ?? "";
    const accessToken = fastify.jwt.sign(
      { userId: user.id, wallet, role: user.role },
      { expiresIn: "1h" }
    );
    const refreshToken = jwt.sign(
      { userId: user.id, wallet, role: user.role, type: "refresh" },
      config.JWT_REFRESH_SECRET,
      { expiresIn: "30d" }
    );
    return { accessToken, refreshToken };
  }

  // POST /auth/register — email/password signup for non-crypto users.
  // Grants starting PCASH and seeds an off-chain pet so the user is tradeable.
  fastify.post("/register", async (req, reply) => {
    const { email, password, displayName } = (req.body ?? {}) as {
      email?: string; password?: string; displayName?: string;
    };

    if (!email || !EMAIL_RE.test(email)) {
      return reply.code(400).send({ error: "Valid email required" });
    }
    if (!password || password.length < 8) {
      return reply.code(400).send({ error: "Password must be at least 8 characters" });
    }

    const normEmail = email.toLowerCase();

    const { rows: existing } = await db.query(
      "SELECT id FROM users WHERE LOWER(email) = $1",
      [normEmail]
    );
    if (existing[0]) {
      return reply.code(409).send({ error: "Email already registered" });
    }

    const passwordHash = await hashPassword(password);
    const wallet = syntheticWalletForEmail(normEmail);

    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash, display_name, wallet_address, wallet_type,
                          pcash_balance, current_value, last_login_at)
       VALUES ($1, $2, $3, $4, 'self_custody', $5, $6, NOW())
       ON CONFLICT (wallet_address) DO NOTHING
       RETURNING id, wallet_address, token_id, username, display_name, role, status, is_creator, bonus_claimed_at`,
      [normEmail, passwordHash, displayName ?? null, wallet,
       config.STARTING_PCASH_GRANT, config.STARTING_PRICE_PCASH_OFFCHAIN]
    );

    if (!rows[0]) {
      return reply.code(409).send({ error: "Email already registered" });
    }
    const user = rows[0];

    // Seed an off-chain pet representing this user so they can be discovered/bought.
    try {
      const tokenId = await initPetStateOffchain(wallet, config.STARTING_PRICE_PCASH_OFFCHAIN);
      await db.query("UPDATE users SET token_id = $1 WHERE id = $2", [tokenId, user.id]);
      user.token_id = tokenId;
    } catch (err) {
      fastify.log.error({ err, wallet }, "[auth] off-chain pet seed failed");
    }

    const { accessToken, refreshToken } = issueTokens(user);
    return reply.code(201).send({
      accessToken,
      refreshToken,
      user: {
        id:          user.id,
        wallet:      user.wallet_address,
        tokenId:     user.token_id,
        username:    user.username,
        displayName: user.display_name,
        isCreator:   user.is_creator,
      },
    });
  });

  // POST /auth/login — email/password login.
  fastify.post("/login", async (req, reply) => {
    const { email, password } = (req.body ?? {}) as { email?: string; password?: string };
    if (!email || !password) {
      return reply.code(400).send({ error: "Email and password required" });
    }
    const normEmail = email.toLowerCase();

    const { rows } = await db.query(
      `SELECT id, wallet_address, token_id, username, display_name, role, status,
              is_creator, bonus_claimed_at, password_hash
       FROM users WHERE LOWER(email) = $1`,
      [normEmail]
    );
    const user = rows[0];
    if (!user || !user.password_hash) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }
    if (user.status === "suspended") {
      return reply.code(403).send({ error: "Account suspended" });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    await db.query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [user.id]);

    const { accessToken, refreshToken } = issueTokens(user);
    return {
      accessToken,
      refreshToken,
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
  });

  // POST /auth/logout — stateless ack; client drops its tokens.
  fastify.post("/logout", async (_req, reply) => {
    return reply.send({ success: true });
  });
};

export default authRoutes;
