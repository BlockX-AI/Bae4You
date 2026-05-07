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
  } catch (err) {
    console.error("[migrate] ❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
