import { db } from "./client";

async function main() {
  console.log("[migrate-photos] Adding photos column to users table...");

  await db.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb
  `);

  console.log("✅  photos column added to users table");
  await db.end();
}

main().catch((err) => {
  console.error("[migrate-photos] Error:", err);
  process.exit(1);
});
