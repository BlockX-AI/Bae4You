import { FastifyPluginAsync } from "fastify";
import { db } from "../db/client";
import { computeHeroScores, getHeroLeaderboard, getUserHeroScore } from "../services/hero-oracle";
import type { JwtPayload } from "../plugins/auth";

const heroesRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /heroes/leaderboard?week=&year=&limit=
  fastify.get(
    "/leaderboard",
    { preHandler: fastify.authenticate },
    async (req, _reply) => {
      const { week, year, limit = "50" } = req.query as Record<string, string>;
      const board = await getHeroLeaderboard(
        week  ? parseInt(week)  : undefined,
        year  ? parseInt(year)  : undefined,
        Math.min(parseInt(limit), 100)
      );
      return { heroes: board };
    }
  );

  // GET /heroes/me — caller's current week score
  fastify.get(
    "/me",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { week, year } = req.query as Record<string, string>;
      const score = await getUserHeroScore(
        payload.userId,
        week ? parseInt(week) : undefined,
        year ? parseInt(year) : undefined
      );
      if (!score) return reply.code(404).send({ error: "No score found for this period" });
      return { score };
    }
  );

  // GET /heroes/:address/score — any address lookup
  fastify.get<{ Params: { address: string } }>(
    "/:address/score",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const addr = req.params.address.toLowerCase();
      const { week, year } = req.query as Record<string, string>;

      const { rows } = await db.query(
        `SELECT id FROM users WHERE LOWER(wallet_address) = $1`,
        [addr]
      );
      if (!rows[0]) return reply.code(404).send({ error: "User not found" });

      const score = await getUserHeroScore(
        rows[0].id,
        week ? parseInt(week) : undefined,
        year ? parseInt(year) : undefined
      );
      if (!score) return reply.code(404).send({ error: "No score found for this period" });
      return { score };
    }
  );

  // POST /heroes/recompute — admin triggers fresh score computation
  fastify.post(
    "/recompute",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { rows } = await db.query(
        `SELECT role FROM users WHERE id = $1`, [payload.userId]
      );
      if (rows[0]?.role !== "admin") {
        return reply.code(403).send({ error: "Admin only" });
      }
      const { week, year } = req.body as Record<string, number>;
      const scores = await computeHeroScores(week, year);
      return { recomputed: scores.length, message: `Scores updated for ${scores.length} heroes` };
    }
  );

  // GET /heroes/:address/cards — Bae Cards minted for a subject
  fastify.get<{ Params: { address: string } }>(
    "/:address/cards",
    { preHandler: fastify.authenticate },
    async (req, _reply) => {
      const addr = req.params.address.toLowerCase();
      const { rows } = await db.query(
        `SELECT bc.token_id, bc.rarity, bc.minted_at,
                cs.owner_address, cs.current_price_wei, cs.total_trades
         FROM bae_cards bc
         LEFT JOIN card_states cs ON cs.token_id = bc.token_id
         WHERE LOWER(bc.subject_address) = $1
         ORDER BY bc.token_id ASC`,
        [addr]
      );
      return { address: addr, cards: rows };
    }
  );
};

export default heroesRoutes;
