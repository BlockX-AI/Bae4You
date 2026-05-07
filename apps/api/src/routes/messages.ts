import { FastifyPluginAsync } from "fastify";
import { db } from "../db/client";
import type { JwtPayload } from "../plugins/auth";

const messagesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /messages/:matchId — load message history
  fastify.get<{ Params: { matchId: string } }>(
    "/:matchId",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { matchId } = req.params;
      const { before, limit = "50" } = req.query as Record<string, string>;

      // Verify user is part of this match
      const { rows: matchRows } = await db.query(
        "SELECT id FROM matches WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2) AND status = 'matched'",
        [matchId, payload.userId]
      );
      if (!matchRows[0]) return reply.code(403).send({ error: "Not your match" });

      const params: unknown[] = [matchId, parseInt(limit)];
      let query = `
        SELECT m.id, m.sender_id, m.content, m.msg_type, m.sent_at,
               u.username, u.display_name, u.avatar_ipfs_hash
        FROM messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.match_id = $1
      `;

      if (before) {
        query += ` AND m.sent_at < $3`;
        params.push(before);
      }

      query += ` ORDER BY m.sent_at DESC LIMIT $2`;

      const { rows } = await db.query(query, params);
      return { messages: rows.reverse() }; // reverse to chronological order
    }
  );
};

export default messagesRoutes;
