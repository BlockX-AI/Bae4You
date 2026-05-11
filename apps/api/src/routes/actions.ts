/**
 * /actions routes — the "Invisible UX" layer.
 *
 * All on-chain mutations go through these endpoints.
 * A non-crypto user pressing "Buy Pet" hits POST /actions/buy/:tokenId —
 * they never see a wallet popup, gas estimate, or transaction hash.
 * The backend executes the transaction, waits for confirmation, and returns
 * a clean result the frontend can render like any REST response.
 */

import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/client";
import {
  relayBuyPet, relayLockPet, relayGiftCash, formatPetPrice,
  ExternalWalletError, buildBuyTxData, buildLockTxData, buildGiftTxData,
  broadcastSignedTx,
} from "../services/tx-relay";
import { createCustodialWallet } from "../services/custodial-wallet";
import type { JwtPayload } from "../plugins/auth";
import { sendPushToUser } from "../services/push";

const giftSchema = z.object({
  targetTokenId: z.number().int().positive(),
  amountPcash:   z.string().regex(/^\d+$/).default("100000000000000000000"),
});

const lockSchema = z.object({
  durationHours: z.number().int().min(1).max(168),
});

const setupWalletSchema = z.object({
  walletType: z.enum(["custodial", "cdp"]).default("custodial"),
});

const broadcastSchema = z.object({
  signedTx: z.string().regex(/^0x[0-9a-fA-F]+$/, "Must be a 0x-prefixed hex string"),
});

const actionsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /actions/buy/:tokenId
   *
   * User presses "Buy Pet" in the app.
   * Backend: resolves custodial wallet → checks gas → submits tx → waits → returns result.
   * Frontend sees: { success: true, newOwner: "...", newPrice: "2.5 CASH", txHash: "..." }
   * User sees:     "You now own @username!" — no blockchain visible.
   */
  fastify.post<{ Params: { tokenId: string } }>(
    "/buy/:tokenId",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const tokenId = parseInt(req.params.tokenId);

      if (isNaN(tokenId)) return reply.code(400).send({ error: "Invalid token ID" });

      // Check target pet exists and isn't locked
      const { rows: petRows } = await db.query(
        "SELECT is_locked, owner_address, current_price_wei FROM pets_state WHERE token_id = $1",
        [tokenId]
      );
      if (!petRows[0]) return reply.code(404).send({ error: "Pet not found" });
      if (petRows[0].is_locked) return reply.code(409).send({ error: "Pet is locked" });

      // Can't buy your own profile SFT
      const { rows: userRows } = await db.query(
        "SELECT wallet_address, token_id FROM users WHERE id = $1",
        [payload.userId]
      );
      if (userRows[0]?.token_id === tokenId) {
        return reply.code(400).send({ error: "Cannot buy your own pet" });
      }

      try {
        const result = await relayBuyPet(payload.userId, tokenId);
        const priceWei = BigInt(petRows[0].current_price_wei);
        const newPrice = (priceWei * 110n) / 100n;

        // Notify the pet's subject user (fire-and-forget)
        const { rows: petOwnerRows } = await db.query(
          `SELECT u.id, COALESCE(u.display_name, u.username, u.wallet_address) AS name
           FROM pets_state p JOIN users u ON u.wallet_address = p.user_address
           WHERE p.token_id = $1`,
          [tokenId]
        );
        const { rows: buyerRows } = await db.query(
          "SELECT COALESCE(display_name, username, wallet_address) AS name FROM users WHERE id = $1",
          [payload.userId]
        );
        if (petOwnerRows[0]) {
          sendPushToUser(petOwnerRows[0].id, {
            title: "Someone bought you! 🐾",
            body:  `${buyerRows[0]?.name ?? "Someone"} just bought your pet for ${formatPetPrice(priceWei)}`,
            data:  { type: "pet_bought", tokenId },
          }).catch(() => {});
        }

        return {
          success:     true,
          message:     "Purchase successful",
          txHash:      result.txHash,
          newPrice:    formatPetPrice(newPrice),
          blockNumber: result.blockNumber,
        };
      } catch (err: unknown) {
        // External wallet: return unsigned tx steps instead of relaying
        if (err instanceof ExternalWalletError) {
          try {
            return reply.send(await buildBuyTxData(payload.userId, tokenId));
          } catch (e) {
            return reply.code(502).send({ error: e instanceof Error ? e.message : "Failed to build tx data" });
          }
        }
        const msg = err instanceof Error ? err.message : "Transaction failed";
        fastify.log.error({ err, tokenId }, "[relay] buy failed");
        return reply.code(502).send({ error: msg });
      }
    }
  );

  /**
   * POST /actions/lock/:tokenId
   *
   * User presses "Lock Pet" — prevents others from buying for N hours.
   * Appears in UI as a toggle with a countdown timer. No gas visible.
   */
  fastify.post<{ Params: { tokenId: string } }>(
    "/lock/:tokenId",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const tokenId = parseInt(req.params.tokenId);
      if (isNaN(tokenId) || tokenId <= 0) return reply.code(400).send({ error: "Invalid token ID" });

      const parsed = lockSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

      const { durationHours } = parsed.data;

      const { rows: userRows } = await db.query(
        "SELECT wallet_address FROM users WHERE id = $1",
        [payload.userId]
      );
      const { rows: petRows } = await db.query(
        "SELECT owner_address FROM pets_state WHERE token_id = $1",
        [tokenId]
      );

      if (petRows[0]?.owner_address !== userRows[0]?.wallet_address?.toLowerCase()) {
        return reply.code(403).send({ error: "You don't own this pet" });
      }

      try {
        const result = await relayLockPet(payload.userId, tokenId, durationHours * 3600);
        const unlocksAt = new Date(Date.now() + durationHours * 3600 * 1000);
        return {
          success:   true,
          message:   `Pet locked for ${durationHours} hours`,
          unlocksAt: unlocksAt.toISOString(),
          txHash:    result.txHash,
        };
      } catch (err: unknown) {
        if (err instanceof ExternalWalletError) {
          return reply.send(await buildLockTxData(tokenId, durationHours * 3600));
        }
        const msg = err instanceof Error ? err.message : "Transaction failed";
        return reply.code(502).send({ error: msg });
      }
    }
  );

  /**
   * POST /actions/gift/:tokenId
   *
   * Send a pet as a gift to another user. Zero-fee action from the user's perspective.
   * UI: "Gift @username" button with a hearts animation. No gas confirmation.
   */
  fastify.post(
    "/gift",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;

      const parsed = giftSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

      const { targetTokenId, amountPcash } = parsed.data;

      const { rows: petRows } = await db.query(
        "SELECT owner_address FROM pets_state WHERE token_id = $1",
        [targetTokenId]
      );
      if (!petRows[0]) return reply.code(404).send({ error: "Pet not found" });

      const { rows: userRows } = await db.query(
        "SELECT wallet_address FROM users WHERE id = $1",
        [payload.userId]
      );
      if (petRows[0].owner_address !== userRows[0]?.wallet_address?.toLowerCase()) {
        return reply.code(403).send({ error: "You can only gift from your own pet" });
      }

      try {
        const result = await relayGiftCash(payload.userId, targetTokenId, BigInt(amountPcash));
        return {
          success: true,
          message: `Gifted ${amountPcash} PCASH wei to pet #${targetTokenId}`,
          txHash:  result.txHash,
        };
      } catch (err: unknown) {
        if (err instanceof ExternalWalletError) {
          return reply.send(await buildGiftTxData(payload.userId, targetTokenId, BigInt(amountPcash)));
        }
        const msg = err instanceof Error ? err.message : "Transaction failed";
        return reply.code(502).send({ error: msg });
      }
    }
  );

  /**
   * POST /actions/setup-wallet
   *
   * Creates and returns a managed wallet for the user.
   * Body: { walletType: "custodial" | "cdp" }  (default: custodial)
   * External-wallet users already have a wallet from SIWE and don't need this.
   */
  fastify.post(
    "/setup-wallet",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const parsed  = setupWalletSchema.safeParse(req.body ?? {});
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

      const { walletType } = parsed.data;

      const { rows } = await db.query(
        "SELECT wallet_address, wallet_type FROM users WHERE id = $1",
        [payload.userId]
      );

      // Already has a wallet of the requested type — return it
      if (rows[0]?.wallet_address && rows[0]?.wallet_type === walletType) {
        return { walletAddress: rows[0].wallet_address, type: rows[0].wallet_type, created: false };
      }

      // External-wallet users manage their own keys
      if (rows[0]?.wallet_type === "external") {
        return {
          walletAddress: rows[0].wallet_address,
          type: "external",
          created: false,
          message: "External wallet already linked via SIWE.",
        };
      }

      if (walletType === "cdp") {
        const { isCdpEnabled, provisionCdpWallet } = await import("../services/cdp-wallet");
        if (!isCdpEnabled()) {
          return reply.code(503).send({ error: "CDP wallet service not configured" });
        }
        const { address } = await provisionCdpWallet(payload.userId);
        return { walletAddress: address, type: "cdp", created: true };
      }

      const { address } = await createCustodialWallet(payload.userId);
      return {
        walletAddress: address,
        type: "custodial",
        created: true,
        message: "Wallet created automatically. You never need to manage keys.",
      };
    }
  );

  /**
   * GET /actions/tx-data/buy/:tokenId
   *
   * For external wallet users (WalletConnect / MetaMask).
   * Returns unsigned transaction steps the client must sign and broadcast.
   * Automatically includes PCASH approval step if allowance is insufficient.
   */
  fastify.get<{ Params: { tokenId: string } }>(
    "/tx-data/buy/:tokenId",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const tokenId = parseInt(req.params.tokenId);
      if (isNaN(tokenId)) return reply.code(400).send({ error: "Invalid token ID" });

      const { rows: petRows } = await db.query(
        "SELECT is_locked, current_price_wei FROM pets_state WHERE token_id = $1",
        [tokenId]
      );
      if (!petRows[0])          return reply.code(404).send({ error: "Pet not found" });
      if (petRows[0].is_locked) return reply.code(409).send({ error: "Pet is locked" });

      try {
        return reply.send(await buildBuyTxData(payload.userId, tokenId));
      } catch (e) {
        return reply.code(502).send({ error: e instanceof Error ? e.message : "Failed" });
      }
    }
  );

  /**
   * GET /actions/tx-data/lock/:tokenId?durationHours=N
   *
   * Returns unsigned lockPet transaction for external wallets.
   */
  fastify.get<{ Params: { tokenId: string } }>(
    "/tx-data/lock/:tokenId",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const tokenId      = parseInt(req.params.tokenId);
      const durationHours = parseInt((req.query as Record<string, string>).durationHours ?? "24");

      if (isNaN(tokenId) || durationHours < 1 || durationHours > 168) {
        return reply.code(400).send({ error: "Invalid tokenId or durationHours (1-168)" });
      }
      return reply.send(await buildLockTxData(tokenId, durationHours * 3600));
    }
  );

  /**
   * POST /actions/tx-data/gift
   *
   * Returns unsigned giftCash transaction steps for external wallets.
   * Body: { targetTokenId, amountPcash }
   */
  fastify.post(
    "/tx-data/gift",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const parsed  = giftSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

      const { targetTokenId, amountPcash } = parsed.data;

      const { rows } = await db.query(
        "SELECT token_id FROM pets_state WHERE token_id = $1",
        [targetTokenId]
      );
      if (!rows[0]) return reply.code(404).send({ error: "Pet not found" });

      try {
        return reply.send(await buildGiftTxData(payload.userId, targetTokenId, BigInt(amountPcash)));
      } catch (e) {
        return reply.code(502).send({ error: e instanceof Error ? e.message : "Failed" });
      }
    }
  );

  /**
   * POST /actions/broadcast
   *
   * External wallets sign transactions client-side (WalletConnect / MetaMask) and
   * POST the signed hex here. The backend broadcasts to Base Sepolia, waits for
   * confirmation, and returns the receipt. The pets-sync worker picks up emitted
   * events for DB state updates.
   *
   * Body: { signedTx: "0x..." }
   */
  fastify.post(
    "/broadcast",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const parsed = broadcastSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

      try {
        const receipt = await broadcastSignedTx(parsed.data.signedTx);
        return {
          success:     true,
          txHash:      receipt.txHash,
          blockNumber: receipt.blockNumber,
          gasUsed:     receipt.gasUsed,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Broadcast failed";
        fastify.log.error({ err }, "[broadcast] failed");
        return reply.code(502).send({ error: msg });
      }
    }
  );
};

export default actionsRoutes;
