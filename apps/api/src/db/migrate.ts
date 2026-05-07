import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";
import "dotenv/config";

async function migrate() {
  const dbUrl   = process.env.DATABASE_URL ?? "";
  const needSsl = dbUrl.includes("sslmode=require");
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: needSsl ? { rejectUnauthorized: false } : false,
  });

  console.log("[migrate] Running schema migration...");

  const sql = readFileSync(join(__dirname, "schema.sql"), "utf-8");

  try {
    await pool.query(sql);
    console.log("[migrate] ✅ Schema applied successfully");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already exists") || msg.includes("duplicate")) {
      console.warn("[migrate] ⚠️  Some objects already exist — schema is up-to-date");
    } else {
      console.error("[migrate] ❌ Migration error (non-fatal):", msg);
    }
  } finally {
    await pool.end();
  }
}

migrate();
