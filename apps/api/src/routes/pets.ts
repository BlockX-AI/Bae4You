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
      const pageNum  = Math.max(1, parseInt(page)  || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
      const offset   = (pageNum - 1) * limitNum;

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
      params.push(limitNum, offset);

      const { rows } = await db.query(query, params);
      return { pets: rows, page: pageNum, limit: limitNum };
    }
  );

  // GET /pets/:tokenId
  fastify.get<{ Params: { tokenId: string } }>(
    "/:tokenId",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const tokenId = parseInt(req.params.tokenId);
      if (isNaN(tokenId) || tokenId <= 0) return reply.code(400).send({ error: "Invalid token ID" });
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
      const tokenId = parseInt(req.params.tokenId);
      if (isNaN(tokenId) || tokenId <= 0) return reply.code(400).send({ error: "Invalid token ID" });
      const { rows } = await db.query(
        `SELECT tx_hash, from_address, to_address, sale_price_wei, new_price_wei, block_number, created_at
         FROM pet_transactions
         WHERE token_id = $1
         ORDER BY block_number DESC
         LIMIT 50`,
        [tokenId]
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
      const tokenId = parseInt(req.params.tokenId);
      if (isNaN(tokenId) || tokenId <= 0) return reply.code(400).send({ error: "Invalid token ID" });
      await db.query(
        "DELETE FROM wish_list WHERE wisher_id = $1 AND target_token_id = $2",
        [payload.userId, tokenId]
      );
      return { success: true };
    }
  );

  // ============================================
  // TRADING CORE ENDPOINTS
  // ============================================

  const buyBodySchema = z.object({});
  const bidBodySchema = z.object({ amount: z.string().regex(/^\d+$/) });
  const listBodySchema = z.object({ price: z.string().regex(/^\d+$/) });

  // POST /pets/:tokenId/buy - Buy a pet at current price
  fastify.post<{ Params: { tokenId: string } }>(
    "/:tokenId/buy",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const tokenId = parseInt(req.params.tokenId);
      if (isNaN(tokenId) || tokenId <= 0) {
        return reply.code(400).send({ error: "Invalid token ID", code: "ERR_INVALID_TOKEN" });
      }

      try {
        const result = await db.query(
          `SELECT buy_pet($1::bigint, $2::uuid)`,
          [tokenId, payload.userId]
        );
        const outcome = result.rows[0]?.buy_pet;
        if (outcome?.error) {
          const code = outcome.code;
          let status = 400;
          if (code === "ERR_INSUFFICIENT_FUNDS") status = 402;
          if (code === "ERR_OWNERSHIP_LIMIT" || code === "ERR_PET_LOCKED" || code === "ERR_ALREADY_OWNED") status = 409;
          return reply.code(status).send({ error: outcome.error, code });
        }
        return reply.code(200).send({
          success: true,
          transactionId: outcome.transaction_id,
          newValue: outcome.new_value,
          prevOwnerValue: outcome.prev_owner_value,
          boughtUserValue: outcome.bought_user_value
        });
      } catch (err) {
        console.error("Buy pet error:", err);
        return reply.code(500).send({ error: "Internal error", code: "ERR_INTERNAL" });
      }
    }
  );

  // POST /pets/:tokenId/bid - Place a bid on a pet
  fastify.post<{ Params: { tokenId: string } }>(
    "/:tokenId/bid",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const tokenId = parseInt(req.params.tokenId);
      if (isNaN(tokenId) || tokenId <= 0) {
        return reply.code(400).send({ error: "Invalid token ID", code: "ERR_INVALID_TOKEN" });
      }

      const parsed = bidBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Invalid amount", code: "ERR_INVALID_BID_AMOUNT" });
      }

      const amount = parseInt(parsed.data.amount);
      if (isNaN(amount) || amount <= 0) {
        return reply.code(400).send({ error: "Invalid amount", code: "ERR_INVALID_BID_AMOUNT" });
      }

      try {
        const { rows } = await db.query(
          `INSERT INTO bids (bidder_id, pet_id, amount, status, expires_at)
           VALUES ($1, $2, $3, 'active', NOW() + INTERVAL '7 days')
           RETURNING id, amount, created_at, expires_at`,
          [payload.userId, tokenId, amount]
        );
        return reply.code(201).send({
          success: true,
          bidId: rows[0].id,
          amount: rows[0].amount,
          createdAt: rows[0].created_at,
          expiresAt: rows[0].expires_at
        });
      } catch (err) {
        console.error("Place bid error:", err);
        return reply.code(500).send({ error: "Internal error", code: "ERR_INTERNAL" });
      }
    }
  );

  // POST /pets/:tokenId/list - List pet for sale
  fastify.post<{ Params: { tokenId: string } }>(
    "/:tokenId/list",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const tokenId = parseInt(req.params.tokenId);
      if (isNaN(tokenId) || tokenId <= 0) {
        return reply.code(400).send({ error: "Invalid token ID", code: "ERR_INVALID_TOKEN" });
      }

      const parsed = listBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Invalid price", code: "ERR_INVALID_PRICE" });
      }

      const price = parseInt(parsed.data.price);
      if (isNaN(price) || price <= 0) {
        return reply.code(400).send({ error: "Invalid price", code: "ERR_INVALID_PRICE" });
      }

      // Verify ownership
      const { rows: ownership } = await db.query(
        `SELECT po.id FROM pets_ownership po
         WHERE po.pet_id = $1 AND po.owner_id = $2 AND po.released_at IS NULL`,
        [tokenId, payload.userId]
      );
      if (!ownership[0]) {
        return reply.code(403).send({ error: "Not owner", code: "ERR_UNAUTHORIZED" });
      }

      // Update pets_state with listed price
      await db.query(
        `UPDATE pets_state SET current_price_wei = $1 WHERE token_id = $2`,
        [price, tokenId]
      );

      return reply.code(200).send({ success: true });
    }
  );

  // GET /pets/:tokenId/bids - Get active bids on a pet
  fastify.get<{ Params: { tokenId: string } }>(
    "/:tokenId/bids",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const tokenId = parseInt(req.params.tokenId);
      if (isNaN(tokenId) || tokenId <= 0) {
        return reply.code(400).send({ error: "Invalid token ID", code: "ERR_INVALID_TOKEN" });
      }

      const { rows } = await db.query(
        `SELECT b.id, b.amount, b.created_at, b.expires_at,
                u.id as bidder_id, u.username as bidder_name, u.display_name as bidder_display_name
         FROM bids b
         JOIN users u ON u.id = b.bidder_id
         WHERE b.pet_id = $1 AND b.status = 'active' AND b.expires_at > NOW()
         ORDER BY b.amount DESC`,
        [tokenId]
      );

      return { bids: rows };
    }
  );
};

export default petsRoutes;
