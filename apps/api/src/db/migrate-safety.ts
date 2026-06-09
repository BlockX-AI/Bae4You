import "dotenv/config";
import { db } from "./client";

async function run() {
  await db.query(`
    -- Block/Report table: tracks who blocked/reported whom
    CREATE TABLE IF NOT EXISTS blocked_users (
      id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      blocker_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason       TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (blocker_id, blocked_id)
    );

    CREATE INDEX IF NOT EXISTS idx_blocked_blocker ON blocked_users (blocker_id);
    CREATE INDEX IF NOT EXISTS idx_blocked_blocked ON blocked_users (blocked_id);
  `);

  console.log("✅  blocked_users table created");
  await db.end?.();
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
