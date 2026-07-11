import "dotenv/config";
import { db } from "./client";

async function run() {
  await db.query(`
    -- User reports: a reporter flags a reported user with a reason.
    -- Blocking is handled separately (blocked_users); a report also blocks,
    -- but this table is the moderation queue admins review.
    CREATE TABLE IF NOT EXISTS reports (
      id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      reporter_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reported_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason       VARCHAR(50) NOT NULL,  -- 'spam'|'harassment'|'fake'|'inappropriate'|'other'
      details      TEXT,
      status       VARCHAR(20) NOT NULL DEFAULT 'open',  -- 'open'|'reviewed'|'actioned'|'dismissed'
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at  TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports (reported_id);
    CREATE INDEX IF NOT EXISTS idx_reports_status   ON reports (status);
  `);

  console.log("✅  reports table created");
  await db.end?.();
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
