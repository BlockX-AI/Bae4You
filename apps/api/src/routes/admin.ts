import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/client";

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // All admin routes require admin role
  fastify.addHook("preHandler", fastify.requireAdmin);

  // GET /admin/users — list users with filters
  fastify.get(
    "/users",
    async (req, reply) => {
      const { status, page = "1", limit = "50", search } = req.query as Record<string, string>;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const params: unknown[] = [];
      let query = `
        SELECT id, wallet_address, token_id, username, display_name, email,
               country_code, is_verified, is_creator, role, status, last_login_at, created_at
        FROM users WHERE 1=1
      `;
      let i = 1;

      if (status) {
        query += ` AND status = $${i++}`;
        params.push(status);
      }
      if (search) {
        query += ` AND (username ILIKE $${i} OR display_name ILIKE $${i} OR wallet_address ILIKE $${i})`;
        params.push(`%${search}%`);
        i++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`;
      params.push(parseInt(limit), offset);

      const { rows } = await db.query(query, params);
      const { rows: countRows } = await db.query("SELECT COUNT(*) FROM users");
      return { users: rows, total: parseInt(countRows[0].count), page: parseInt(page) };
    }
  );

  // PUT /admin/users/:id/suspend
  fastify.put<{ Params: { id: string } }>(
    "/users/:id/suspend",
    async (req, reply) => {
      const { reason } = req.body as { reason?: string };
      await db.query(
        "UPDATE users SET status = 'suspended' WHERE id = $1",
        [req.params.id]
      );
      return { success: true, reason };
    }
  );

  // PUT /admin/users/:id/activate
  fastify.put<{ Params: { id: string } }>(
    "/users/:id/activate",
    async (req, reply) => {
      await db.query("UPDATE users SET status = 'active' WHERE id = $1", [req.params.id]);
      return { success: true };
    }
  );

  // PUT /admin/users/:id/verify
  fastify.put<{ Params: { id: string } }>(
    "/users/:id/verify",
    async (req, reply) => {
      await db.query("UPDATE users SET is_verified = true WHERE id = $1", [req.params.id]);
      return { success: true };
    }
  );

  // PUT /admin/creator/:id/approve
  fastify.put<{ Params: { id: string } }>(
    "/creator/:id/approve",
    async (req, reply) => {
      await db.query(
        "UPDATE users SET is_creator = true WHERE id = $1",
        [req.params.id]
      );
      return { success: true };
    }
  );

  // GET /admin/fiat — fiat transaction monitoring
  fastify.get(
    "/fiat",
    async (req, reply) => {
      const { status, page = "1" } = req.query as Record<string, string>;
      const offset = (parseInt(page) - 1) * 50;

      const params: unknown[] = [];
      let query = `
        SELECT ft.*, u.username, u.wallet_address
        FROM fiat_transactions ft
        JOIN users u ON u.id = ft.user_id
        WHERE 1=1
      `;
      let i = 1;

      if (status) {
        query += ` AND ft.status = $${i++}`;
        params.push(status);
      }

      query += ` ORDER BY ft.created_at DESC LIMIT 50 OFFSET $${i++}`;
      params.push(offset);

      const { rows } = await db.query(query, params);
      return { transactions: rows };
    }
  );

  // GET /admin/stats — platform stats overview
  fastify.get(
    "/stats",
    async (req, reply) => {
      const [usersRes, petsRes, txRes, fiatRes] = await Promise.all([
        db.query("SELECT COUNT(*) AS total, COUNT(CASE WHEN status='active' THEN 1 END) AS active FROM users"),
        db.query("SELECT COUNT(*) AS total, SUM(total_purchases) AS total_purchases FROM pets_state"),
        db.query("SELECT COUNT(*) AS total, SUM(sale_price_wei::numeric) AS volume FROM pet_transactions"),
        db.query("SELECT COUNT(*) AS total, SUM(fiat_amount) AS volume FROM fiat_transactions WHERE status='completed'"),
      ]);

      return {
        users:        usersRes.rows[0],
        pets:         petsRes.rows[0],
        petTrades:    txRes.rows[0],
        fiatVolume:   fiatRes.rows[0],
        generatedAt:  new Date().toISOString(),
      };
    }
  );
};

export default adminRoutes;
