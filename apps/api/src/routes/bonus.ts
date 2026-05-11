import { FastifyPluginAsync } from "fastify";
import { db } from "../db/client";
import { signBonusClaim } from "../services/eip712-signer";
import { config } from "../config";
import type { JwtPayload } from "../plugins/auth";

const BONUS_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours

const bonusRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /bonus/claim
   *
   * Returns an EIP-712 signature the user must submit to PetsCash.claimBonus().
   * Backend never calls the contract — user always submits the sig themselves.
   * This keeps the pattern trustless (contract verifies, not trusts, the backend).
   */
  fastify.post(
    "/claim",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;

      const { rows: userRows } = await db.query(
        "SELECT wallet_address FROM users WHERE id = $1",
        [payload.userId]
      );
      if (!userRows[0]) return reply.code(404).send({ error: "User not found" });

      const { wallet_address } = userRows[0];

      // Atomic: only update if cooldown has elapsed. Prevents race conditions.
      const { rows: updated } = await db.query(
        `UPDATE users
         SET bonus_claimed_at = NOW()
         WHERE id = $1
           AND (bonus_claimed_at IS NULL
                OR bonus_claimed_at < NOW() - INTERVAL '4 hours')
         RETURNING bonus_claimed_at`,
        [payload.userId]
      );

      if (updated.length === 0) {
        const { rows: cur } = await db.query(
          "SELECT bonus_claimed_at FROM users WHERE id = $1", [payload.userId]
        );
        const lastClaim = new Date(cur[0].bonus_claimed_at).getTime();
        const nextClaim = new Date(lastClaim + BONUS_COOLDOWN_MS);
        return reply.code(429).send({
          error:       "Cooldown active",
          nextClaimAt: nextClaim.toISOString(),
          cooldownMs:  nextClaim.getTime() - Date.now(),
        });
      }

      const amount    = BigInt(config.BONUS_AMOUNT_PCASH);
      const timestamp = Math.floor(Date.now() / 1000);
      const sig       = await signBonusClaim(wallet_address, amount, timestamp);

      return {
        signature:  sig,
        amount:     amount.toString(),
        timestamp,
        contractAddress: config.PETS_CASH_ADDRESS,
        message: "Submit this signature to PetsCash.claimBonus() on-chain",
      };
    }
  );

  // GET /bonus/status — check if user can claim
  fastify.get(
    "/status",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { rows } = await db.query(
        "SELECT bonus_claimed_at FROM users WHERE id = $1",
        [payload.userId]
      );
      const claimedAt = rows[0]?.bonus_claimed_at;
      if (!claimedAt) {
        return { canClaim: true, nextClaimAt: null };
      }

      const nextClaim = new Date(new Date(claimedAt).getTime() + BONUS_COOLDOWN_MS);
      const canClaim  = Date.now() >= nextClaim.getTime();
      return {
        canClaim,
        lastClaimedAt: claimedAt,
        nextClaimAt:   canClaim ? null : nextClaim.toISOString(),
        bonusAmount:   config.BONUS_AMOUNT_PCASH,
      };
    }
  );
};

export default bonusRoutes;
