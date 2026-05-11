import { FastifyPluginAsync } from "fastify";
import { ethers } from "ethers";
import { db } from "../db/client";
import type { JwtPayload } from "../plugins/auth";
import { config } from "../config";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

const walletRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /wallet/balance
  fastify.get(
    "/balance",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;

      const { rows } = await db.query(
        "SELECT wallet_address FROM users WHERE id = $1",
        [payload.userId]
      );
      if (!rows[0]?.wallet_address) {
        return reply.code(404).send({ error: "No wallet linked to this account" });
      }

      const address = rows[0].wallet_address;

      try {
        const provider = new ethers.JsonRpcProvider(config.BASE_SEPOLIA_RPC_URL);
        const [ethBalWei, pcashRaw] = await Promise.all([
          provider.getBalance(address),
          (async () => {
            if (!config.PETS_CASH_ADDRESS) return "0";
            const contract = new ethers.Contract(config.PETS_CASH_ADDRESS, ERC20_ABI, provider);
            return (await contract.balanceOf(address)).toString();
          })(),
        ]);

        return {
          address,
          eth: {
            wei:       ethBalWei.toString(),
            formatted: ethers.formatEther(ethBalWei),
          },
          pcash: {
            wei:       pcashRaw,
            formatted: ethers.formatEther(pcashRaw),
          },
          chainId: parseInt(config.CHAIN_ID),
          network: "base-sepolia",
        };
      } catch (err) {
        fastify.log.error({ err }, "wallet balance fetch failed");
        return reply.code(502).send({ error: "Could not fetch balance from RPC" });
      }
    }
  );

  // GET /wallet/transactions?page=1&limit=20
  fastify.get(
    "/transactions",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { page = "1", limit = "20" } = req.query as Record<string, string>;
      const pageNum  = Math.max(1, parseInt(page)  || 1);
      const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
      const offset   = (pageNum - 1) * limitNum;

      const { rows: userRows } = await db.query(
        "SELECT wallet_address FROM users WHERE id = $1",
        [payload.userId]
      );
      if (!userRows[0]?.wallet_address) {
        return reply.code(404).send({ error: "No wallet linked to this account" });
      }

      const address = userRows[0].wallet_address.toLowerCase();

      const { rows } = await db.query(
        `SELECT pt.id, pt.token_id, pt.tx_hash,
                CASE WHEN LOWER(pt.to_address) = $1 THEN 'buy' ELSE 'sell' END AS tx_type,
                pt.from_address, pt.to_address, pt.sale_price_wei AS price_wei, pt.created_at,
                (SELECT username    FROM users WHERE LOWER(wallet_address) =
                   CASE WHEN LOWER(pt.to_address) = $1 THEN pt.from_address ELSE pt.to_address END
                 LIMIT 1) AS counterparty_username,
                (SELECT display_name FROM users WHERE LOWER(wallet_address) =
                   CASE WHEN LOWER(pt.to_address) = $1 THEN pt.from_address ELSE pt.to_address END
                 LIMIT 1) AS counterparty_display_name,
                COUNT(*) OVER() AS total_count
         FROM pet_transactions pt
         WHERE LOWER(pt.from_address) = $1 OR LOWER(pt.to_address) = $1
         ORDER BY pt.created_at DESC
         LIMIT $2 OFFSET $3`,
        [address, limitNum, offset]
      );

      const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
      const txns  = rows.map(({ total_count: _tc, ...r }) => r);

      return {
        transactions: txns,
        pagination: { page: pageNum, limit: limitNum, total },
      };
    }
  );
};

export default walletRoutes;
