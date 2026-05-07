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

      const { rows } = await db.query(
        "SELECT wallet_address, bonus_claimed_at FROM users WHERE id = $1",
        [payload.userId]
      );
      if (!rows[0]) return reply.code(404).send({ error: "User not found" });

      const { wallet_address, bonus_claimed_at } = rows[0];

      if (bonus_claimed_at) {
        const lastClaim = new Date(bonus_claimed_at).getTime();
        const now       = Date.now();
        if (now - lastClaim < BONUS_COOLDOWN_MS) {
          const nextClaim = new Date(lastClaim + BONUS_COOLDOWN_MS);
          return reply.code(429).send({
            error:     "Cooldown active",
            nextClaimAt: nextClaim.toISOString(),
            cooldownMs:  BONUS_COOLDOWN_MS - (now - lastClaim),
          });
        }
      }

      const amount    = BigInt(config.BONUS_AMOUNT_PCASH);
      const timestamp = Math.floor(Date.now() / 1000);
      const sig       = await signBonusClaim(wallet_address, amount, timestamp);

      // Record in DB immediately — if user doesn't submit on-chain, they lose the sig
      await db.query(
        "UPDATE users SET bonus_claimed_at = NOW() WHERE id = $1",
        [payload.userId]
      );

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
