import "dotenv/config";
import { db } from "./client";

async function run() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS push_tokens (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token      TEXT        NOT NULL,
      platform   TEXT        NOT NULL DEFAULT 'ios',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, token)
    );

    CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);

    CREATE TABLE IF NOT EXISTS swipe_passes (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, target_id)
    );

    CREATE INDEX IF NOT EXISTS idx_swipe_passes_user ON swipe_passes(user_id);
  `);

  console.log("✅  push_tokens + swipe_passes tables created");
  await db.end?.();
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
