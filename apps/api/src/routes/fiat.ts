import { FastifyPluginAsync } from "fastify";
import crypto from "crypto";
import axios from "axios";
import { db } from "../db/client";
import { config } from "../config";
import type { JwtPayload } from "../plugins/auth";

const fiatRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /fiat/onramp-init — returns Transak widget session for the frontend
  fastify.post(
    "/onramp-init",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;

      const { rows } = await db.query(
        "SELECT wallet_address FROM users WHERE id = $1",
        [payload.userId]
      );
      if (!rows[0]?.wallet_address) {
        return reply.code(400).send({ error: "No wallet address on account" });
      }

      const wallet = rows[0].wallet_address;

      // Select provider — Transak primary, MoonPay fallback
      const provider = config.TRANSAK_API_KEY ? "transak" : "moonpay";

      let widgetUrl: string;
      if (provider === "transak") {
        const params = new URLSearchParams({
          apiKey:             config.TRANSAK_API_KEY!,
          walletAddress:      wallet,
          cryptoCurrencyCode: "ETH",
          network:            "base",
          redirectURL:        "https://app.bae4u.com/fiat/success",
          disableWalletAddressForm: "true",
        });
        widgetUrl = `https://global.transak.com/?${params.toString()}`;
      } else {
        const params = new URLSearchParams({
          apiKey:      config.MOONPAY_API_KEY!,
          walletAddress: wallet,
          currencyCode: "eth",
          baseCurrencyCode: "usd",
        });
        widgetUrl = `https://buy.moonpay.com?${params.toString()}`;
      }

      // Record the pending transaction
      const { rows: txRows } = await db.query(
        `INSERT INTO fiat_transactions (user_id, provider, type, fiat_amount, fiat_currency, status)
         VALUES ($1, $2, 'onramp', 0, 'USD', 'pending')
         RETURNING id`,
        [payload.userId, provider]
      );

      return {
        widgetUrl,
        provider,
        transactionId: txRows[0].id,
      };
    }
  );

  // POST /fiat/webhooks/transak — Transak calls this when payment status changes
  fastify.post(
    "/webhooks/transak",
    async (req, reply) => {
      // Verify Transak HMAC signature
      const rawBody = JSON.stringify(req.body);
      const secret  = config.TRANSAK_SECRET ?? "";
      const expectedSig = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
      const receivedSig = (req.headers["x-transak-hmac-sha512"] as string) ?? "";

      if (secret && receivedSig !== expectedSig) {
        return reply.code(401).send({ error: "Invalid signature" });
      }

      const event = req.body as Record<string, unknown>;
      const data  = (event.data ?? event) as Record<string, unknown>;

      const {
        id: providerRef,
        status,
        fiatAmount,
        fiatCurrency,
        cryptoAmount,
        walletAddress,
      } = data as Record<string, string | number>;

      // Map Transak status to our enum
      const statusMap: Record<string, string> = {
        COMPLETED:  "completed",
        FAILED:     "failed",
        PROCESSING: "processing",
        PENDING:    "pending",
      };
      const ourStatus = statusMap[String(status)] ?? "pending";

      const { rows: userRows } = await db.query(
        "SELECT id FROM users WHERE wallet_address = $1",
        [String(walletAddress).toLowerCase()]
      );

      if (userRows[0]) {
        await db.query(
          `INSERT INTO fiat_transactions (user_id, provider, type, fiat_amount, fiat_currency, crypto_amount_wei, status, provider_ref)
           VALUES ($1, 'transak', 'onramp', $2, $3, $4, $5, $6)
           ON CONFLICT (provider_ref) DO UPDATE SET status = $5
           WHERE fiat_transactions.provider_ref = $6`,
          [
            userRows[0].id,
            fiatAmount,
            fiatCurrency,
            cryptoAmount ? Math.floor(Number(cryptoAmount) * 1e18).toString() : null,
            ourStatus,
            String(providerRef),
          ]
        ).catch(() => {
          // ON CONFLICT requires unique index — just upsert instead
          db.query(
            `UPDATE fiat_transactions SET status = $1 WHERE provider_ref = $2`,
            [ourStatus, String(providerRef)]
          );
        });
      }

      return { received: true };
    }
  );

  // GET /fiat/history — user's fiat transaction history
  fastify.get(
    "/history",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { rows } = await db.query(
        `SELECT id, provider, type, fiat_amount, fiat_currency, status, provider_ref, created_at
         FROM fiat_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [payload.userId]
      );
      return { transactions: rows };
    }
  );
};

export default fiatRoutes;
