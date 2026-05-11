import { FastifyPluginAsync } from "fastify";
import { db } from "../db/client";
import { ethers } from "ethers";
import { config } from "../config";
import type { JwtPayload } from "../plugins/auth";

const COUPLE_TYPEHASH = ethers.keccak256(
  ethers.toUtf8Bytes("CoupleProof(address userA,address userB,bytes32 matchId,uint256 timestamp)")
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const couplesRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /couples/:matchId — get couple card for a match
  fastify.get<{ Params: { matchId: string } }>(
    "/:matchId",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const { matchId } = req.params;
      if (!UUID_RE.test(matchId)) return reply.code(400).send({ error: "Invalid matchId" });
      const payload     = req.user as JwtPayload;

      const { rows } = await db.query(
        `SELECT cc.*, ua.display_name AS name_a, ub.display_name AS name_b,
                ua.avatar_ipfs_hash AS avatar_a, ub.avatar_ipfs_hash AS avatar_b
         FROM couple_cards cc
         JOIN users ua ON ua.id = cc.user_a_id
         JOIN users ub ON ub.id = cc.user_b_id
         WHERE cc.match_id = $1`,
        [matchId]
      );

      if (!rows[0]) return reply.code(404).send({ error: "No couple card for this match" });

      const row = rows[0];
      if (row.user_a_id !== payload.userId && row.user_b_id !== payload.userId) {
        return reply.code(403).send({ error: "Not your match" });
      }

      return { coupleCard: row };
    }
  );

  // POST /couples/proof — backend signs a couple mint proof
  fastify.post(
    "/proof",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { matchId } = req.body as { matchId: string };
      if (!matchId || !UUID_RE.test(matchId)) return reply.code(400).send({ error: "Invalid matchId" });

      const { rows: matchRows } = await db.query(
        `SELECT m.id, m.user_a_id, m.user_b_id, m.status,
                ua.wallet_address AS wallet_a,
                ub.wallet_address AS wallet_b,
                (SELECT COUNT(*) FROM messages WHERE match_id = m.id) AS msg_count
         FROM matches m
         JOIN users ua ON ua.id = m.user_a_id
         JOIN users ub ON ub.id = m.user_b_id
         WHERE m.id = $1`,
        [matchId]
      );

      if (!matchRows[0]) return reply.code(404).send({ error: "Match not found" });

      const match = matchRows[0];
      if (match.user_a_id !== payload.userId && match.user_b_id !== payload.userId) {
        return reply.code(403).send({ error: "Not your match" });
      }
      if (match.status !== "matched") {
        return reply.code(400).send({ error: "Match not in matched state" });
      }
      if (parseInt(match.msg_count) < 10) {
        return reply.code(400).send({
          error: "Need at least 10 messages to mint a Couple Card",
          currentMessages: match.msg_count,
        });
      }

      const { rows: existing } = await db.query(
        `SELECT id FROM couple_cards WHERE match_id = $1 AND is_active = true`, [matchId]
      );
      if (existing[0]) return reply.code(409).send({ error: "Couple card already minted for this match" });

      if (!config.COUPLE_CARD_ADDRESS) {
        return reply.code(503).send({ error: "Couple card contract not configured" });
      }

      const signer    = new ethers.Wallet(config.SIGNER_PRIVATE_KEY);
      const timestamp = Math.floor(Date.now() / 1000);

      const matchIdBytes32 = ethers.zeroPadValue(
        ethers.toUtf8Bytes(matchId.replace(/-/g, "").slice(0, 32)),
        32
      );

      const domain = {
        name: "Bae4U",
        version: "1",
        chainId: parseInt(config.CHAIN_ID),
        verifyingContract: config.COUPLE_CARD_ADDRESS,
      };

      const types = {
        CoupleProof: [
          { name: "userA",     type: "address" },
          { name: "userB",     type: "address" },
          { name: "matchId",   type: "bytes32" },
          { name: "timestamp", type: "uint256" },
        ],
      };

      const value = {
        userA:     match.wallet_a,
        userB:     match.wallet_b,
        matchId:   matchIdBytes32,
        timestamp: BigInt(timestamp),
      };

      const sig = await signer.signTypedData(domain, types, value);

      return {
        proof: {
          userA:      match.wallet_a,
          userB:      match.wallet_b,
          matchId:    matchIdBytes32,
          timestamp,
          sig,
        },
        contract: config.COUPLE_CARD_ADDRESS,
        message:  "Submit proof to CoupleCard.mintCouple() on-chain",
      };
    }
  );

  // POST /couples/record — record a minted couple card (called after on-chain tx)
  fastify.post(
    "/record",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { matchId, tokenIdA, tokenIdB, txHash } = req.body as {
        matchId: string;
        tokenIdA: number;
        tokenIdB: number;
        txHash: string;
      };
      if (!matchId || !UUID_RE.test(matchId)) return reply.code(400).send({ error: "Invalid matchId" });

      const { rows: matchRows } = await db.query(
        `SELECT user_a_id, user_b_id FROM matches WHERE id = $1`, [matchId]
      );
      if (!matchRows[0]) return reply.code(404).send({ error: "Match not found" });

      const match = matchRows[0];
      if (match.user_a_id !== payload.userId && match.user_b_id !== payload.userId) {
        return reply.code(403).send({ error: "Not your match" });
      }

      await db.query(
        `INSERT INTO couple_cards
           (match_id, token_id_a, token_id_b, user_a_id, user_b_id, tx_hash)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (match_id) DO NOTHING`,
        [matchId, tokenIdA, tokenIdB, match.user_a_id, match.user_b_id, txHash]
      );

      return { success: true, matchId, tokenIdA, tokenIdB };
    }
  );

  // DELETE /couples/:matchId — burn couple card on unmatch
  fastify.delete<{ Params: { matchId: string } }>(
    "/:matchId",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { matchId } = req.params;

      const { rows } = await db.query(
        `UPDATE couple_cards
         SET is_active = false, burned_at = NOW()
         WHERE match_id = $1 AND is_active = true
           AND (user_a_id = $2 OR user_b_id = $2)
         RETURNING id`,
        [matchId, payload.userId]
      );

      if (!rows[0]) return reply.code(404).send({ error: "Active couple card not found" });

      return { success: true, message: "Couple card burned" };
    }
  );

  // GET /couples/my — list all my couple cards
  fastify.get(
    "/my",
    { preHandler: fastify.authenticate },
    async (req, _reply) => {
      const payload = req.user as JwtPayload;

      const { rows } = await db.query(
        `SELECT cc.*, ua.display_name AS name_a, ub.display_name AS name_b,
                ua.avatar_ipfs_hash AS avatar_a, ub.avatar_ipfs_hash AS avatar_b
         FROM couple_cards cc
         JOIN users ua ON ua.id = cc.user_a_id
         JOIN users ub ON ub.id = cc.user_b_id
         WHERE (cc.user_a_id = $1 OR cc.user_b_id = $1)
         ORDER BY cc.minted_at DESC`,
        [payload.userId]
      );

      return { coupleCards: rows };
    }
  );
};

export default couplesRoutes;
