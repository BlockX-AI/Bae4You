import { FastifyPluginAsync } from "fastify";
import { db } from "../db/client";
import { ethers } from "ethers";
import { config } from "../config";
import type { JwtPayload } from "../plugins/auth";

const RARITY_MULTIPLIERS: Record<string, number> = {
  common: 100, rare: 180, epic: 320, legend: 600,
};

const cardsRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /cards — full card market feed
  fastify.get(
    "/",
    { preHandler: fastify.authenticate },
    async (req, _reply) => {
      const { rarity, limit = "50", offset = "0" } = req.query as Record<string, string>;

      let query = `
        SELECT bc.token_id, bc.subject_address, bc.rarity, bc.minted_at,
               cs.owner_address, cs.current_price_wei, cs.total_trades,
               u.display_name, u.avatar_ipfs_hash, u.username, u.is_verified
        FROM bae_cards bc
        LEFT JOIN card_states cs ON cs.token_id = bc.token_id
        LEFT JOIN users u ON LOWER(u.wallet_address) = LOWER(bc.subject_address)
      `;
      const limitNum  = Math.min(200, Math.max(1, parseInt(limit)  || 50));
      const offsetNum = Math.max(0, parseInt(offset) || 0);
      const params: (string | number)[] = [];
      if (rarity) {
        params.push(rarity);
        query += ` WHERE bc.rarity = $${params.length}::card_rarity_t`;
      }
      params.push(limitNum);
      params.push(offsetNum);
      query += ` ORDER BY cs.current_price_wei DESC NULLS LAST LIMIT $${params.length - 1} OFFSET $${params.length}`;

      const { rows } = await db.query(query, params);
      return {
        cards: rows.map((r) => ({
          ...r,
          score_multiplier: RARITY_MULTIPLIERS[r.rarity] ?? 100,
        })),
      };
    }
  );

  // GET /cards/:tokenId — single card detail
  fastify.get<{ Params: { tokenId: string } }>(
    "/:tokenId",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const tid = parseInt(req.params.tokenId);
      if (isNaN(tid) || tid <= 0) return reply.code(400).send({ error: "Invalid token ID" });
      const { rows } = await db.query(
        `SELECT bc.token_id, bc.subject_address, bc.rarity, bc.minted_at,
                cs.owner_address, cs.current_price_wei, cs.total_trades,
                u.display_name, u.avatar_ipfs_hash, u.username
         FROM bae_cards bc
         LEFT JOIN card_states cs ON cs.token_id = bc.token_id
         LEFT JOIN users u ON LOWER(u.wallet_address) = LOWER(bc.subject_address)
         WHERE bc.token_id = $1`,
        [tid]
      );
      if (!rows[0]) return reply.code(404).send({ error: "Card not found" });
      return { card: { ...rows[0], score_multiplier: RARITY_MULTIPLIERS[rows[0].rarity] ?? 100 } };
    }
  );

  // POST /cards/mint — admin / oracle mints a Bae Card for an eligible user
  fastify.post(
    "/mint",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { rows: adminCheck } = await db.query(
        `SELECT role FROM users WHERE id = $1`, [payload.userId]
      );
      if (adminCheck[0]?.role !== "admin") {
        return reply.code(403).send({ error: "Admin only" });
      }

      const { subjectAddress, rarity } = req.body as { subjectAddress: string; rarity: string };
      if (!subjectAddress || !["common", "rare", "epic", "legend"].includes(rarity)) {
        return reply.code(400).send({ error: "Invalid subjectAddress or rarity" });
      }

      const provider = new ethers.JsonRpcProvider(config.BASE_SEPOLIA_RPC_URL);
      const signer   = new ethers.Wallet(config.DEPLOYER_PRIVATE_KEY, provider);

      const { rows: dep } = await db.query(
        `SELECT value FROM kv_store WHERE key = 'deployments'`
      );
      if (!dep[0]) return reply.code(500).send({ error: "Deployments not found in DB" });

      const deployments = JSON.parse(dep[0].value);
      const registryAbi = [
        "function mintCard(address subject, uint8 rarity) external returns (uint256)"
      ];
      const registry = new ethers.Contract(deployments.BaeCardRegistry, registryAbi, signer);

      const rarityIndex = ["common", "rare", "epic", "legend"].indexOf(rarity);
      const tx = await registry.mintCard(subjectAddress, rarityIndex);
      const receipt = await tx.wait();

      const event = receipt.logs.find((l: { fragment?: { name: string } }) => l.fragment?.name === "CardMinted");
      const tokenId = event ? Number(event.args[1]) : null;

      if (tokenId !== null) {
        const { rows: subjectUser } = await db.query(
          `SELECT id FROM users WHERE LOWER(wallet_address) = $1`,
          [subjectAddress.toLowerCase()]
        );

        await db.query(
          `INSERT INTO bae_cards (token_id, subject_address, subject_user_id, rarity, tx_hash)
           VALUES ($1, $2, $3, $4::card_rarity_t, $5)
           ON CONFLICT (token_id) DO NOTHING`,
          [tokenId, subjectAddress, subjectUser[0]?.id ?? null, rarity, receipt.hash]
        );

        await db.query(
          `INSERT INTO card_states (token_id, owner_address, current_price_wei, total_trades)
           VALUES ($1, $2, $3, 0)
           ON CONFLICT (token_id) DO NOTHING`,
          [tokenId, signer.address, ethers.parseEther("200").toString()]
        );
      }

      return { success: true, tokenId, txHash: receipt.hash };
    }
  );

  // GET /cards/buyTxData/:tokenId — returns unsigned tx for external wallets
  fastify.get<{ Params: { tokenId: string } }>(
    "/buyTxData/:tokenId",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const tid = parseInt(req.params.tokenId);
      if (isNaN(tid) || tid <= 0) return reply.code(400).send({ error: "Invalid token ID" });
      const payload = req.user as JwtPayload;

      const { rows } = await db.query(
        `SELECT u.wallet_address FROM users u WHERE u.id = $1`, [payload.userId]
      );
      if (!rows[0]) return reply.code(404).send({ error: "User not found" });

      const { rows: card } = await db.query(
        `SELECT current_price_wei FROM card_states WHERE token_id = $1`, [tid]
      );
      if (!card[0]) return reply.code(404).send({ error: "Card not listed" });

      if (!config.BAE_CARD_MARKET_ADDRESS) {
        return reply.code(503).send({ error: "Card market contract not configured" });
      }

      const abi = ["function buyCard(uint256 tokenId) external"];
      const iface = new ethers.Interface(abi);

      return {
        to:        config.BAE_CARD_MARKET_ADDRESS,
        data:      iface.encodeFunctionData("buyCard", [tid]),
        value:     "0",
        price_wei: card[0].current_price_wei,
      };
    }
  );
};

export default cardsRoutes;
