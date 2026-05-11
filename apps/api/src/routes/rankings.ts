import { FastifyPluginAsync } from "fastify";
import { db } from "../db/client";
import { getUserBadgeProof } from "../services/ranking-engine";
import type { JwtPayload } from "../plugins/auth";
import { config } from "../config";

const rankingsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /rankings/global — top 100 by assets
  fastify.get(
    "/global",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const { limit = "100" } = req.query as Record<string, string>;

      const { rows } = await db.query(
        `SELECT r.assets_rank, r.badge_tier, r.snapshot_at,
                u.id, u.username, u.display_name, u.avatar_ipfs_hash,
                u.wallet_address, u.country_code, u.is_verified,
                (SELECT current_price_wei FROM pets_state
                 WHERE LOWER(user_address) = LOWER(u.wallet_address)
                 ORDER BY current_price_wei DESC LIMIT 1) AS current_price_wei
         FROM rankings_snapshot r
         JOIN users u ON u.id = r.user_id
         WHERE r.period_type = 'weekly'
           AND r.snapshot_at = (SELECT MAX(snapshot_at) FROM rankings_snapshot WHERE period_type = 'weekly')
         ORDER BY r.assets_rank ASC
         LIMIT $1`,
        [Math.min(parseInt(limit) || 100, 200)]
      );
      return { rankings: rows };
    }
  );

  // GET /rankings/country/:code — country leaderboard
  fastify.get<{ Params: { code: string } }>(
    "/country/:code",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const code = req.params.code.toUpperCase();
      const { limit = "50" } = req.query as Record<string, string>;

      const { rows } = await db.query(
        `SELECT r.country_rank, r.badge_tier,
                u.username, u.display_name, u.avatar_ipfs_hash, u.is_verified,
                (SELECT current_price_wei FROM pets_state
                 WHERE LOWER(user_address) = LOWER(u.wallet_address)
                 ORDER BY current_price_wei DESC LIMIT 1) AS current_price_wei
         FROM rankings_snapshot r
         JOIN users u ON u.id = r.user_id
         WHERE r.period_type = 'weekly'
           AND u.country_code = $1
           AND r.snapshot_at = (SELECT MAX(snapshot_at) FROM rankings_snapshot WHERE period_type = 'weekly')
           AND r.country_rank IS NOT NULL
         ORDER BY r.country_rank ASC
         LIMIT $2`,
        [code, Math.min(parseInt(limit) || 50, 200)]
      );
      return { country: code, rankings: rows };
    }
  );

  // GET /rankings/me — my current rank + badge proof for on-chain submission
  fastify.get(
    "/me",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;

      const { rows } = await db.query(
        `SELECT r.assets_rank, r.country_rank, r.badge_tier, r.snapshot_at
         FROM rankings_snapshot r
         WHERE r.user_id = $1 AND r.period_type = 'weekly'
         ORDER BY r.snapshot_at DESC
         LIMIT 1`,
        [payload.userId]
      );

      const badgeProof = await getUserBadgeProof(payload.userId);

      return {
        rank:       rows[0] ?? null,
        badgeProof,
        contractAddress: config.PETS_RANKING_ADDRESS,
        message: badgeProof
          ? "Submit badgeProof.proof to PetsRanking.issueBadge() to mint your badge on-chain"
          : "No badge earned in latest snapshot",
      };
    }
  );
};

export default rankingsRoutes;
