import { FastifyPluginAsync } from "fastify";
import { db } from "../db/client";
import type { JwtPayload } from "../plugins/auth";
import { querySimilar } from "../services/pinecone-match";
import { sendPushToUser } from "../services/push";

const matchesRoutes: FastifyPluginAsync = async (fastify) => {
  async function likeSomeone(
    _fapp: unknown,
    myId: string,
    targetId: string,
    reply: any
  ) {
    if (myId === targetId) return reply.code(400).send({ error: "Cannot like yourself" });

    const { rows: targetRows } = await db.query(
      "SELECT id FROM users WHERE id = $1 AND status = 'active'",
      [targetId]
    );
    if (!targetRows[0]) return reply.code(404).send({ error: "User not found" });

    const { rows: existing } = await db.query(
      `SELECT id, status FROM matches
       WHERE (user_a_id = $1 AND user_b_id = $2) OR (user_a_id = $2 AND user_b_id = $1)`,
      [myId, targetId]
    );

    if (existing[0]?.status === "matched") return reply.code(409).send({ error: "Already matched" });

    if (existing[0]?.status === "pending") {
      const { rows: matchRows } = await db.query(
        `UPDATE matches SET status = 'matched', matched_at = NOW() WHERE id = $1 RETURNING *`,
        [existing[0].id]
      );
      const { rows: names } = await db.query(
        "SELECT id, COALESCE(display_name, username, wallet_address) AS name FROM users WHERE id = ANY($1::uuid[])",
        [[myId, targetId]]
      );
      const nameMap = new Map(names.map((n: { id: string; name: string }) => [n.id, n.name]));
      notifyNewMatch(matchRows[0].id, myId, targetId, nameMap.get(myId) ?? "Someone", nameMap.get(targetId) ?? "Someone").catch(() => {});
      return { match: matchRows[0], isNewMatch: true };
    }

    const { rows } = await db.query(
      `INSERT INTO matches (user_a_id, user_b_id, status) VALUES ($1, $2, 'pending')
       ON CONFLICT DO NOTHING RETURNING *`,
      [myId, targetId]
    );
    return { match: rows[0] ?? null, isNewMatch: false };
  }

  async function passSomeone(
    myId: string,
    targetId: string,
    reply: any
  ) {
    if (myId === targetId) return reply.code(400).send({ error: "Cannot pass yourself" });

    const { rows: targetRows } = await db.query(
      "SELECT id FROM users WHERE id = $1 AND status = 'active'",
      [targetId]
    );
    if (!targetRows[0]) return reply.code(404).send({ error: "User not found" });

    await db.query(
      `INSERT INTO swipe_passes (user_id, target_id) VALUES ($1, $2)
       ON CONFLICT (user_id, target_id) DO NOTHING`,
      [myId, targetId]
    );
    return { passed: true };
  }

  // GET /matches — get all my active matches
  fastify.get(
    "/",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;

      const { rows } = await db.query(
        `SELECT m.id, m.compatibility_score, m.matched_at,
                CASE WHEN m.user_a_id = $1 THEN m.user_b_id ELSE m.user_a_id END AS partner_id,
                u.username, u.display_name, u.avatar_ipfs_hash, u.is_verified,
                (SELECT content FROM messages WHERE match_id = m.id ORDER BY sent_at DESC LIMIT 1) AS last_message,
                (SELECT sent_at FROM messages WHERE match_id = m.id ORDER BY sent_at DESC LIMIT 1) AS last_message_at
         FROM matches m
         JOIN users u ON u.id = (CASE WHEN m.user_a_id = $1 THEN m.user_b_id ELSE m.user_a_id END)
         WHERE (m.user_a_id = $1 OR m.user_b_id = $1) AND m.status = 'matched'
         ORDER BY last_message_at DESC NULLS LAST`,
        [payload.userId]
      );
      return { matches: rows };
    }
  );

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // POST /matches/like — like someone (body: { targetUserId })
  fastify.post<{ Body: { targetUserId: string } }>(
    "/like",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload  = req.user as JwtPayload;
      const targetId = (req.body as { targetUserId?: string }).targetUserId;
      if (!targetId) return reply.code(400).send({ error: "targetUserId required" });
      if (!UUID_RE.test(targetId)) return reply.code(400).send({ error: "Invalid targetUserId" });
      return likeSomeone(fastify, payload.userId, targetId, reply);
    }
  );

  // POST /matches/pass — pass (body: { targetUserId })
  fastify.post<{ Body: { targetUserId: string } }>(
    "/pass",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload  = req.user as JwtPayload;
      const targetId = (req.body as { targetUserId?: string }).targetUserId;
      if (!targetId) return reply.code(400).send({ error: "targetUserId required" });
      if (!UUID_RE.test(targetId)) return reply.code(400).send({ error: "Invalid targetUserId" });
      return passSomeone(payload.userId, targetId, reply);
    }
  );

  // POST /matches/like/:targetUserId — like someone (param-based, delegates to helper)
  fastify.post<{ Params: { targetUserId: string } }>(
    "/like/:targetUserId",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      if (!UUID_RE.test(req.params.targetUserId)) return reply.code(400).send({ error: "Invalid targetUserId" });
      return likeSomeone(null, payload.userId, req.params.targetUserId, reply);
    }
  );

  // DELETE /matches/:matchId — unmatch
  fastify.delete<{ Params: { matchId: string } }>(
    "/:matchId",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { rows } = await db.query(
        `UPDATE matches SET status = 'unmatched'
         WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2)
           AND status = 'matched'
         RETURNING id`,
        [req.params.matchId, payload.userId]
      );
      if (!rows[0]) return reply.code(404).send({ error: "Active match not found" });
      return { success: true };
    }
  );

  // GET /matches/discover — Pinecone vector-matched candidates (falls back to random)
  fastify.get(
    "/discover",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { limit = "10", offset = "0", country } = req.query as Record<string, string>;
      const limitNum  = Math.min(Math.max(1, parseInt(limit)  || 10), 100);
      const offsetNum = Math.max(0, parseInt(offset) || 0);

      // Collect already-interacted + already-passed user IDs to exclude
      const [{ rows: interacted }, { rows: passed }] = await Promise.all([
        db.query(
          "SELECT user_a_id, user_b_id FROM matches WHERE user_a_id = $1 OR user_b_id = $1",
          [payload.userId]
        ),
        db.query("SELECT target_id FROM swipe_passes WHERE user_id = $1", [payload.userId]),
      ]);

      const excludeIds = new Set<string>([payload.userId]);
      interacted.forEach((r: Record<string, string>) => {
        excludeIds.add(r.user_a_id);
        excludeIds.add(r.user_b_id);
      });
      passed.forEach((r: { target_id: string }) => excludeIds.add(r.target_id));

      const excludeArr = Array.from(excludeIds);

      // Try Pinecone vector matching first
      const { rows: meRows } = await db.query(
        "SELECT personality_vector FROM users WHERE id = $1",
        [payload.userId]
      );
      const myVector = meRows[0]?.personality_vector;

      let orderedIds: string[] | null = null;
      if (myVector) {
        try {
          orderedIds = await querySimilar(myVector, limitNum * 3, excludeArr);
        } catch {
          orderedIds = null;
        }
      }

      let rows: unknown[];

      if (orderedIds && orderedIds.length > 0) {
        // Fetch users in Pinecone similarity order, apply optional country filter
        const params: unknown[] = [orderedIds];
        let q = `
          SELECT id, username, display_name, avatar_ipfs_hash, bio,
                 country_code, is_verified, token_id, created_at
          FROM users
          WHERE id = ANY($1::uuid[]) AND status = 'active'
        `;
        if (country) {
          q += ` AND country_code = $2`;
          params.push(country.toUpperCase());
        }
        const { rows: fetched } = await db.query(q, params);
        // Re-sort by Pinecone rank order
        const byId = new Map((fetched as Array<{ id: string }>).map((u) => [u.id, u]));
        rows = orderedIds.map((id) => byId.get(id)).filter(Boolean).slice(offsetNum, offsetNum + limitNum);
      } else {
        // Fallback: random
        const params: unknown[] = [excludeArr, limitNum, offsetNum];
        let q = `
          SELECT id, username, display_name, avatar_ipfs_hash, bio,
                 country_code, is_verified, token_id, created_at
          FROM users
          WHERE id != ALL($1::uuid[]) AND status = 'active'
        `;
        if (country) {
          q += ` AND country_code = $4`;
          params.push(country.toUpperCase());
        }
        q += ` ORDER BY RANDOM() LIMIT $2 OFFSET $3`;
        const { rows: fetched } = await db.query(q, params);
        rows = fetched;
      }

      return { 
        candidates: rows, 
        matchedBy: orderedIds ? "pinecone" : "random",
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          hasMore: rows.length === limitNum,
        }
      };
    }
  );

  // POST /matches/pass/:targetUserId — swipe left / skip (param-based, delegates to helper)
  fastify.post<{ Params: { targetUserId: string } }>(
    "/pass/:targetUserId",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      if (!UUID_RE.test(req.params.targetUserId)) return reply.code(400).send({ error: "Invalid targetUserId" });
      return passSomeone(payload.userId, req.params.targetUserId, reply);
    }
  );
};

// Internal helper reused by socket plugin
export async function notifyNewMatch(
  matchId: string,
  userAId: string,
  userBId: string,
  userADisplay: string,
  userBDisplay: string
) {
  await Promise.all([
    sendPushToUser(userAId, {
      title: "New Match! 💖",
      body:  `You and ${userBDisplay} matched!`,
      data:  { type: "new_match", matchId },
    }),
    sendPushToUser(userBId, {
      title: "New Match! 💖",
      body:  `You and ${userADisplay} matched!`,
      data:  { type: "new_match", matchId },
    }),
  ]);
}

export default matchesRoutes;
