/**
 * Patch migration — adds 'cdp' and 'external' values to wallet_type_t enum.
 * Safe to run multiple times (idempotent via pg_enum check).
 *
 * Run: pnpm --filter=api migrate:patch
 */
import { Pool } from "pg";
import "dotenv/config";

async function patch() {
  const dbUrl   = process.env.DATABASE_URL ?? "";
  const needSsl = dbUrl.includes("sslmode=require");
  const pool    = new Pool({
    connectionString: dbUrl,
    ssl: needSsl ? { rejectUnauthorized: false } : false,
  });

  console.log("[migrate:patch] Patching wallet_type_t enum...");

  try {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'wallet_type_t')
            AND enumlabel = 'cdp'
        ) THEN
          ALTER TYPE wallet_type_t ADD VALUE 'cdp';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'wallet_type_t')
            AND enumlabel = 'external'
        ) THEN
          ALTER TYPE wallet_type_t ADD VALUE 'external';
        END IF;
      END $$;
    `);
    console.log("[migrate:patch] ✅ wallet_type_t updated: 'cdp' + 'external' added");
  } catch (err) {
    console.error("[migrate:patch] ❌ Failed:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

patch();
