import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";
import "dotenv/config";

// One-off, non-destructive migration:
//   1. Re-applies the corrected buy_pet() (transfers pets_state.owner_address).
//   2. Backfills owner_address for pets already bought before the fix, using the
//      current active ownership row (pets_ownership.released_at IS NULL).
// Idempotent: safe to run more than once.
async function run() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!dbUrl) throw new Error("DATABASE_URL not set");
  const needSsl = dbUrl.includes("sslmode=require");
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: needSsl ? { rejectUnauthorized: false } : false,
  });

  // Extract just the buy_pet function block from schema.sql so we don't re-run
  // the whole schema (which aborts on pre-existing objects).
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  const start = schema.indexOf("CREATE OR REPLACE FUNCTION buy_pet");
  const end = schema.indexOf("$$ LANGUAGE plpgsql;", start);
  if (start === -1 || end === -1) throw new Error("buy_pet function not found in schema.sql");
  const buyPetFn = schema.slice(start, end + "$$ LANGUAGE plpgsql;".length);

  try {
    console.log("[migrate] Applying corrected buy_pet() ...");
    await pool.query(buyPetFn);
    console.log("[migrate] ✅ buy_pet() replaced");

    console.log("[migrate] Backfilling owner_address from active ownership rows ...");
    const res = await pool.query(`
      UPDATE pets_state ps
      SET owner_address = LOWER(u.wallet_address)
      FROM pets_ownership po
      JOIN users u ON u.id = po.owner_id
      WHERE po.pet_id = ps.token_id
        AND po.released_at IS NULL
        AND ps.owner_address IS DISTINCT FROM LOWER(u.wallet_address)
    `);
    console.log(`[migrate] ✅ Backfilled ${res.rowCount} pet(s)`);
  } catch (err) {
    console.error("[migrate] ❌ error:", err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
