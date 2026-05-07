import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/client";
import type { JwtPayload } from "../plugins/auth";

const wishlistSchema = z.object({
  targetTokenId: z.number().int().positive(),
  note: z.string().max(200).optional(),
});

const petsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /pets — browse all active pets (paginated)
  fastify.get(
    "/",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const { page = "1", limit = "20", country } = req.query as Record<string, string>;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = `
        SELECT
          p.token_id, p.owner_address, p.user_address, p.current_price_wei,
          p.total_purchases, p.is_locked, p.lock_expiry, p.pet_status,
          u.username, u.display_name, u.avatar_ipfs_hash, u.country_code, u.is_verified
        FROM pets_state p
        JOIN users u ON u.wallet_address = p.user_address
        WHERE p.pet_status = 'active'
      `;
      const params: unknown[] = [];
      let idx = 1;

      if (country) {
        query += ` AND u.country_code = $${idx++}`;
        params.push(country.toUpperCase());
      }

      query += ` ORDER BY p.current_price_wei DESC LIMIT $${idx++} OFFSET $${idx++}`;
      params.push(parseInt(limit), offset);

      const { rows } = await db.query(query, params);
      return { pets: rows, page: parseInt(page), limit: parseInt(limit) };
    }
  );

  // GET /pets/:tokenId
  fastify.get<{ Params: { tokenId: string } }>(
    "/:tokenId",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const tokenId = parseInt(req.params.tokenId);
      const { rows } = await db.query(
        `SELECT p.*, u.username, u.display_name, u.avatar_ipfs_hash, u.bio, u.country_code, u.is_verified
         FROM pets_state p
         JOIN users u ON u.wallet_address = p.user_address
         WHERE p.token_id = $1`,
        [tokenId]
      );
      if (!rows[0]) return reply.code(404).send({ error: "Pet not found" });
      return rows[0];
    }
  );

  // GET /pets/portfolio/:walletAddress — owned pets
  fastify.get<{ Params: { walletAddress: string } }>(
    "/portfolio/:walletAddress",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const { rows } = await db.query(
        `SELECT p.token_id, p.current_price_wei, p.total_purchases, p.is_locked, p.lock_expiry,
                u.username, u.display_name, u.avatar_ipfs_hash, u.country_code
         FROM pets_state p
         JOIN users u ON u.wallet_address = p.user_address
         WHERE p.owner_address = $1 AND p.pet_status = 'active'
         ORDER BY p.current_price_wei DESC`,
        [req.params.walletAddress.toLowerCase()]
      );
      return { portfolio: rows, count: rows.length };
    }
  );

  // GET /pets/history/:tokenId — transaction history
  fastify.get<{ Params: { tokenId: string } }>(
    "/history/:tokenId",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const { rows } = await db.query(
        `SELECT tx_hash, from_address, to_address, sale_price_wei, new_price_wei, block_number, created_at
         FROM pet_transactions
         WHERE token_id = $1
         ORDER BY block_number DESC
         LIMIT 50`,
        [parseInt(req.params.tokenId)]
      );
      return { history: rows };
    }
  );

  // GET /pets/wishlist — my wishlist
  fastify.get(
    "/wishlist",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { rows } = await db.query(
        `SELECT w.id, w.target_token_id, w.note, w.added_at,
                p.current_price_wei, u.username, u.display_name, u.avatar_ipfs_hash
         FROM wish_list w
         JOIN pets_state p ON p.token_id = w.target_token_id
         JOIN users u ON u.wallet_address = p.user_address
         WHERE w.wisher_id = $1
         ORDER BY w.added_at DESC`,
        [payload.userId]
      );
      return { wishlist: rows };
    }
  );

  // POST /pets/wishlist — add to wishlist
  fastify.post(
    "/wishlist",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const parsed  = wishlistSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

      const { targetTokenId, note } = parsed.data;
      try {
        const { rows } = await db.query(
          `INSERT INTO wish_list (wisher_id, target_token_id, note)
           VALUES ($1, $2, $3)
           ON CONFLICT (wisher_id, target_token_id) DO NOTHING
           RETURNING *`,
          [payload.userId, targetTokenId, note ?? null]
        );
        return reply.code(201).send(rows[0] ?? { message: "Already on wishlist" });
      } catch (err) {
        return reply.code(500).send({ error: "Failed to add" });
      }
    }
  );

  // DELETE /pets/wishlist/:tokenId
  fastify.delete<{ Params: { tokenId: string } }>(
    "/wishlist/:tokenId",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      await db.query(
        "DELETE FROM wish_list WHERE wisher_id = $1 AND target_token_id = $2",
        [payload.userId, parseInt(req.params.tokenId)]
      );
      return { success: true };
    }
  );
};

export default petsRoutes;
