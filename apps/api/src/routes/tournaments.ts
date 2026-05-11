import { FastifyPluginAsync } from "fastify";
import { db } from "../db/client";
import { ethers } from "ethers";
import { config } from "../config";
import type { JwtPayload } from "../plugins/auth";

const tournamentsRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /tournaments/current — active tournament info + player's deck
  fastify.get(
    "/current",
    { preHandler: fastify.authenticate },
    async (req, _reply) => {
      const payload = req.user as JwtPayload;
      const { rows: userRows } = await db.query(
        `SELECT wallet_address FROM users WHERE id = $1`, [payload.userId]
      );
      const walletAddress = userRows[0]?.wallet_address ?? null;

      const { rows } = await db.query(
        `SELECT t.id, t.chain_id, t.start_time, t.end_time,
                t.prize_pool_wei, t.status,
                td.card_ids, td.total_score, td.rank, td.prize_claimed
         FROM tournaments t
         LEFT JOIN tournament_decks td ON td.tournament_id = t.id
           AND LOWER(td.player_address) = LOWER($1)
         WHERE t.status = 'active'
         ORDER BY t.created_at DESC
         LIMIT 1`,
        [walletAddress ?? ""]
      );

      if (!rows[0]) return { tournament: null };

      const { rows: standings } = await db.query(
        `SELECT COUNT(*) AS total_players
         FROM tournament_decks
         WHERE tournament_id = $1`,
        [rows[0].id]
      );

      const totalPlayers = parseInt(standings[0]?.total_players ?? "0", 10);
      const prizePoolWei = BigInt(rows[0].prize_pool_wei ?? "0");
      const avgPrize     = totalPlayers > 0
        ? (prizePoolWei / BigInt(totalPlayers)).toString()
        : "0";

      return {
        tournament: rows[0],
        stats: { total_players: totalPlayers, avg_prize: avgPrize },
      };
    }
  );

  // GET /tournaments/leaderboard?tournamentId= — live score table
  fastify.get(
    "/leaderboard",
    { preHandler: fastify.authenticate },
    async (req, _reply) => {
      const { tournamentId, limit = "50" } = req.query as Record<string, string>;

      let filter = "";
      const params: (string | number)[] = [];

      if (tournamentId) {
        params.push(tournamentId);
        filter = `WHERE td.tournament_id = $1`;
      } else {
        filter = `WHERE t.status = 'active'`;
      }

      params.push(Math.min(parseInt(limit), 100));

      const { rows } = await db.query(
        `SELECT td.player_address, td.card_ids, td.total_score, td.rank,
                u.display_name, u.avatar_ipfs_hash, u.username
         FROM tournament_decks td
         JOIN tournaments t ON t.id = td.tournament_id
         LEFT JOIN users u ON LOWER(u.wallet_address) = LOWER(td.player_address)
         ${filter}
         ORDER BY td.total_score DESC
         LIMIT $${params.length}`,
        params
      );

      return { leaderboard: rows };
    }
  );

  // POST /tournaments/enter — lock deck on-chain + record in DB
  fastify.post(
    "/enter",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { cardIds } = req.body as { cardIds: number[] };

      if (!Array.isArray(cardIds) || cardIds.length !== 5) {
        return reply.code(400).send({ error: "Must provide exactly 5 card IDs" });
      }

      const { rows: userRows } = await db.query(
        `SELECT wallet_address FROM users WHERE id = $1`, [payload.userId]
      );
      if (!userRows[0]?.wallet_address) {
        return reply.code(400).send({ error: "No wallet linked" });
      }

      const { rows: tRows } = await db.query(
        `SELECT id FROM tournaments WHERE status = 'active' ORDER BY created_at DESC LIMIT 1`
      );
      if (!tRows[0]) return reply.code(404).send({ error: "No active tournament" });

      const { rows: existing } = await db.query(
        `SELECT id FROM tournament_decks
         WHERE tournament_id = $1 AND LOWER(player_address) = LOWER($2)`,
        [tRows[0].id, userRows[0].wallet_address]
      );
      if (existing[0]) return reply.code(409).send({ error: "Deck already locked for this tournament" });

      const { rows: ownership } = await db.query(
        `SELECT token_id FROM card_states
         WHERE token_id = ANY($1::BIGINT[]) AND LOWER(owner_address) = LOWER($2)`,
        [cardIds, userRows[0].wallet_address]
      );
      if (ownership.length !== 5) {
        return reply.code(400).send({ error: "You must own all 5 cards" });
      }

      await db.query(
        `INSERT INTO tournament_decks
           (tournament_id, player_address, player_user_id, card_ids)
         VALUES ($1, $2, $3, $4)`,
        [tRows[0].id, userRows[0].wallet_address, payload.userId, cardIds]
      );

      return {
        success: true,
        tournamentId: tRows[0].id,
        deck: cardIds,
        message: "Deck locked — scores update nightly. Check back for results.",
      };
    }
  );

  // GET /tournaments/deck — my current locked deck
  fastify.get(
    "/deck",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { rows: userRows } = await db.query(
        `SELECT wallet_address FROM users WHERE id = $1`, [payload.userId]
      );
      if (!userRows[0]?.wallet_address) return reply.code(404).send({ error: "No wallet" });

      const { rows } = await db.query(
        `SELECT td.id, td.tournament_id, td.card_ids, td.total_score, td.rank, td.prize_claimed,
                t.start_time, t.end_time, t.status
         FROM tournament_decks td
         JOIN tournaments t ON t.id = td.tournament_id
         WHERE LOWER(td.player_address) = LOWER($1)
         ORDER BY td.created_at DESC
         LIMIT 1`,
        [userRows[0].wallet_address]
      );

      if (!rows[0]) return { deck: null };

      const { rows: cardDetails } = await db.query(
        `SELECT bc.token_id, bc.subject_address, bc.rarity,
                cs.current_price_wei,
                u.display_name, u.avatar_ipfs_hash
         FROM bae_cards bc
         LEFT JOIN card_states cs ON cs.token_id = bc.token_id
         LEFT JOIN users u ON LOWER(u.wallet_address) = LOWER(bc.subject_address)
         WHERE bc.token_id = ANY($1::BIGINT[])`,
        [rows[0].card_ids]
      );

      return { deck: rows[0], cards: cardDetails };
    }
  );

  // POST /tournaments/scores — oracle submits scores (admin only)
  fastify.post(
    "/scores",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { rows: adminCheck } = await db.query(
        `SELECT role FROM users WHERE id = $1`, [payload.userId]
      );
      if (adminCheck[0]?.role !== "admin") {
        return reply.code(403).send({ error: "Admin only" });
      }

      const { tournamentId, scores } = req.body as {
        tournamentId: string;
        scores: Array<{ playerAddress: string; rank: number; totalScore: number }>;
      };

      for (const s of scores) {
        await db.query(
          `UPDATE tournament_decks
           SET total_score = $1, rank = $2
           WHERE tournament_id = $3 AND LOWER(player_address) = LOWER($4)`,
          [s.totalScore, s.rank, tournamentId, s.playerAddress]
        );
      }

      return { updated: scores.length };
    }
  );

  // POST /tournaments/claim — record claim (on-chain tx done by user separately)
  fastify.post(
    "/claim",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { tournamentId, txHash } = req.body as { tournamentId: string; txHash: string };

      const { rows: userRows } = await db.query(
        `SELECT wallet_address FROM users WHERE id = $1`, [payload.userId]
      );

      const { rows } = await db.query(
        `UPDATE tournament_decks
         SET prize_claimed = true
         WHERE tournament_id = $1 AND LOWER(player_address) = LOWER($2) AND prize_claimed = false
         RETURNING rank, total_score`,
        [tournamentId, userRows[0].wallet_address]
      );

      if (!rows[0]) return reply.code(404).send({ error: "No claimable prize found" });

      return { success: true, rank: rows[0].rank, score: rows[0].total_score, txHash };
    }
  );

  // GET /tournaments/history — past tournaments
  fastify.get(
    "/history",
    { preHandler: fastify.authenticate },
    async (req, _reply) => {
      const { limit = "10" } = req.query as Record<string, string>;
      const { rows } = await db.query(
        `SELECT id, start_time, end_time, prize_pool_wei, status,
                (SELECT COUNT(*) FROM tournament_decks WHERE tournament_id = t.id) AS player_count
         FROM tournaments t
         WHERE status = 'closed'
         ORDER BY end_time DESC
         LIMIT $1`,
        [parseInt(limit)]
      );
      return { history: rows };
    }
  );
};

export default tournamentsRoutes;
