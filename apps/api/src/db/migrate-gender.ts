import "dotenv/config";
import { db } from "./client";

async function run() {
  await db.query(`
    -- Dating orientation fields.
    --   gender:        how the user identifies
    --   interested_in: who they want to see in discovery
    -- Both nullable: existing rows stay discoverable (treated as 'everyone').
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS gender        VARCHAR(20),
      ADD COLUMN IF NOT EXISTS interested_in VARCHAR(20);
  `);

  console.log("✅  users.gender + users.interested_in columns added");
  await db.end?.();
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
