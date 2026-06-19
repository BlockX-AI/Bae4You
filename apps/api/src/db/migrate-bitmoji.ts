import { db } from "./client";

async function main() {
  console.log("[migrate-bitmoji] Adding bitmoji_config column to users table...");

  await db.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS bitmoji_config JSONB,
      ADD COLUMN IF NOT EXISTS bitmoji_traits JSONB
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_users_bitmoji_config
      ON users ((bitmoji_config IS NOT NULL))
  `);

  console.log("✅  bitmoji_config + bitmoji_traits columns added to users table");
  await db.end();
}

main().catch((err) => {
  console.error("[migrate-bitmoji] Error:", err);
  process.exit(1);
});
