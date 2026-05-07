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
      const pageNum  = Math.max(1, parseInt(page));
      const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
      const offset   = (pageNum - 1) * limitNum;

      const { rows: userRows } = await db.query(
        "SELECT wallet_address FROM users WHERE id = $1",
        [payload.userId]
      );
      if (!userRows[0]?.wallet_address) {
        return reply.code(404).send({ error: "No wallet linked to this account" });
      }

      const address = userRows[0].wallet_address.toLowerCase();

      const { rows, rowCount } = await db.query(
        `SELECT pt.id, pt.token_id, pt.tx_hash, pt.tx_type,
                pt.from_address, pt.to_address, pt.price_wei, pt.created_at,
                u.username AS token_username, u.display_name AS token_display_name
         FROM pet_transactions pt
         LEFT JOIN users u ON LOWER(u.wallet_address) = pt.from_address
                           OR LOWER(u.wallet_address) = pt.to_address
         WHERE LOWER(pt.from_address) = $1 OR LOWER(pt.to_address) = $1
         ORDER BY pt.created_at DESC
         LIMIT $2 OFFSET $3`,
        [address, limitNum, offset]
      );

      return {
        transactions: rows,
        pagination: { page: pageNum, limit: limitNum, total: rowCount ?? 0 },
      };
    }
  );
};

export default walletRoutes;
