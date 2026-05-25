/**
 * Migration: add ai_art_ipfs_hash column to users table
 *
 * Stores the IPFS CID of the AI-generated Spider-Verse style portrait.
 * When present, this is used as the NFT image in /metadata/:tokenId.json.
 *
 * Run: pnpm --filter=api tsx src/db/migrate-ai-art.ts
 */

import "dotenv/config";
import { Pool } from "pg";
import { config } from "../config";

async function migrate() {
  const pool = new Pool({
    connectionString: config.DATABASE_URL,
    ssl: config.DATABASE_URL.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : false,
  });

  try {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS ai_art_ipfs_hash TEXT DEFAULT NULL;
    `);
    console.log("✅  ai_art_ipfs_hash column added to users table");

    await pool.query(`
      CREATE INDEX IF NOT EXISTS users_ai_art_idx
      ON users (ai_art_ipfs_hash)
      WHERE ai_art_ipfs_hash IS NOT NULL;
    `);
    console.log("✅  Index created on ai_art_ipfs_hash");
  } finally {
    await pool.end();
  }
}

migrate().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
