/**
 * Cartoon avatar migration — adds a JSONB column holding the client-side
 * CartoonAvatar config (10 small int fields) so a user's built avatar persists
 * server-side and renders for other users on discover / matches / profile.
 *
 * Idempotent (ADD COLUMN IF NOT EXISTS). Safe to run multiple times.
 *
 * Run: pnpm --filter=api migrate:cartoon-avatar
 */
import { Pool } from "pg";
import "dotenv/config";

async function migrate() {
  const dbUrl   = process.env.DATABASE_URL ?? "";
  const needSsl = dbUrl.includes("sslmode=require");
  const pool    = new Pool({
    connectionString: dbUrl,
    ssl: needSsl ? { rejectUnauthorized: false } : false,
  });

  console.log("[migrate:cartoon-avatar] Adding users.cartoon_avatar JSONB...");

  try {
    await pool.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS cartoon_avatar JSONB;`
    );
    console.log("[migrate:cartoon-avatar] ✅ users.cartoon_avatar ready");
  } catch (err) {
    console.error("[migrate:cartoon-avatar] ❌ Failed:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
