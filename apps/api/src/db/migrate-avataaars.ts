import { db } from "./client";

async function main() {
  console.log("[migrate-avataaars] Adding avataaars_config column to users table...");

  await db.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS avataaars_config JSONB,
      ADD COLUMN IF NOT EXISTS avataaars_traits JSONB
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_users_avataaars_config
      ON users ((avataaars_config IS NOT NULL))
  `);

  console.log("✅  avataaars_config + avataaars_traits columns added to users table");
  await db.end();
}

main().catch((err) => {
  console.error("[migrate-avataaars] Error:", err);
  process.exit(1);
});
