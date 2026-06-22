/**
 * PCASH economy migration — makes the off-chain "Pets" trading game work.
 *
 * Off-chain PCASH (integer ledger in users.pcash_balance) is the authoritative
 * currency for the game; on-chain relay is optional/later.
 *
 * This migration is idempotent and safe to run multiple times. It:
 *   1. Adds trading + auth + profile columns (pcash/gold/current_value,
 *      password_hash, interests, avatar_url) and the non-negative PCASH check.
 *   2. Creates the off-chain token_id allocator sequence.
 *   3. Normalizes oversized pets_state.current_price_wei values (1e21-style wei
 *      seeds) down into the INTEGER range buy_pet() can read.
 *   4. Re-creates buy_pet() with BOTH bug fixes:
 *        - v_pet_locked is now declared (was used but never declared -> every buy 500'd)
 *        - the "bought user" is resolved from pets_state.user_address (a wallet
 *          string) to a UUID before crediting users.id (was selecting a wallet
 *          string straight into a UUID variable).
 *   5. Initializes current_value for existing users from their pet's price.
 *
 * Run: pnpm --filter=api migrate:pcash-economy
 */
import { Pool } from "pg";
import "dotenv/config";

const STARTING_PRICE_OFFCHAIN = Number(
  process.env.STARTING_PRICE_PCASH_OFFCHAIN ?? "1000"
);

const BUY_PET_FN = `
CREATE OR REPLACE FUNCTION buy_pet(p_pet_id BIGINT, p_buyer_id UUID)
RETURNS JSONB AS $FN$
DECLARE
  v_current_price INTEGER;
  v_new_price INTEGER;
  v_delta INTEGER;
  v_prev_owner_id UUID;
  v_bought_user_address VARCHAR(42);
  v_bought_user_id UUID;
  v_buyer_pcash INTEGER;
  v_buyer_count INTEGER;
  v_pet_locked BOOLEAN;
  v_pet_locked_until TIMESTAMPTZ;
  v_transaction_id UUID;
  v_result JSONB;
BEGIN
  -- Lock pet row first (prevent concurrent buys)
  SELECT current_price_wei, user_address, is_locked, lock_expiry
  INTO v_current_price, v_bought_user_address, v_pet_locked, v_pet_locked_until
  FROM pets_state
  WHERE token_id = p_pet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Pet not found', 'code', 'ERR_NOT_FOUND');
  END IF;

  -- Resolve the "bought user" (the person represented by this pet) to a UUID.
  -- pets_state.user_address is a wallet string; the credit goes to that user's row.
  SELECT id INTO v_bought_user_id
  FROM users WHERE wallet_address = v_bought_user_address;

  -- Check if pet is locked
  IF v_pet_locked AND v_pet_locked_until > NOW() THEN
    RETURN jsonb_build_object('error', 'Pet is locked', 'code', 'ERR_PET_LOCKED');
  END IF;

  -- Check if buyer already owns this pet
  SELECT id INTO v_prev_owner_id
  FROM pets_ownership
  WHERE pet_id = p_pet_id AND owner_id = p_buyer_id AND released_at IS NULL;

  IF FOUND THEN
    RETURN jsonb_build_object('error', 'Already own this pet', 'code', 'ERR_ALREADY_OWNED');
  END IF;

  -- Get buyer's PCASH and ownership count
  SELECT pcash_balance, (
    SELECT COUNT(*) FROM pets_ownership
    WHERE owner_id = p_buyer_id AND released_at IS NULL
  ) INTO v_buyer_pcash, v_buyer_count
  FROM users WHERE id = p_buyer_id;

  -- Check ownership limit (400 max)
  IF v_buyer_count >= 400 THEN
    RETURN jsonb_build_object('error', 'Ownership limit reached', 'code', 'ERR_OWNERSHIP_LIMIT');
  END IF;

  -- Calculate new price (110% of current)
  v_new_price := (v_current_price * 110) / 100;
  v_delta := v_new_price - v_current_price;

  -- Check sufficient funds
  IF v_buyer_pcash < v_new_price THEN
    RETURN jsonb_build_object('error', 'Insufficient funds', 'code', 'ERR_INSUFFICIENT_FUNDS');
  END IF;

  -- Get previous owner (if any)
  SELECT owner_id INTO v_prev_owner_id
  FROM pets_ownership
  WHERE pet_id = p_pet_id AND released_at IS NULL
  FOR UPDATE;

  -- Debit buyer
  UPDATE users SET pcash_balance = pcash_balance - v_new_price WHERE id = p_buyer_id;

  -- Credit previous owner or bought user
  IF v_prev_owner_id IS NOT NULL THEN
    -- Credit previous owner: current_price + floor(delta/2)
    UPDATE users
    SET pcash_balance = pcash_balance + v_current_price + (v_delta / 2)
    WHERE id = v_prev_owner_id;

    -- Credit bought user: ceil(delta/2)
    UPDATE users
    SET pcash_balance = pcash_balance + ((v_delta + 1) / 2)
    WHERE id = v_bought_user_id;

    -- Release previous ownership
    UPDATE pets_ownership
    SET released_at = NOW()
    WHERE pet_id = p_pet_id AND released_at IS NULL;
  ELSE
    -- First time buy: bought user gets full new_price
    UPDATE users
    SET pcash_balance = pcash_balance + v_new_price
    WHERE id = v_bought_user_id;
  END IF;

  -- Create new ownership
  INSERT INTO pets_ownership (owner_id, pet_id, purchase_price, purchased_at)
  VALUES (p_buyer_id, p_pet_id, v_new_price, NOW());

  -- Update pet price
  UPDATE pets_state
  SET current_price_wei = v_new_price, total_purchases = total_purchases + 1
  WHERE token_id = p_pet_id;

  -- Record transaction
  INSERT INTO transactions (type, buyer_id, pet_id, prev_owner_id, amount, value_after)
  VALUES ('buy', p_buyer_id, p_pet_id, v_prev_owner_id, v_new_price,
          (SELECT pcash_balance FROM users WHERE id = p_buyer_id))
  RETURNING id INTO v_transaction_id;

  -- Record value history for buyer
  INSERT INTO value_history (user_id, old_value, new_value, reason)
  VALUES (p_buyer_id, v_buyer_pcash, v_buyer_pcash - v_new_price, 'buy_pet');

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'new_value', v_new_price,
    'prev_owner_value', CASE WHEN v_prev_owner_id IS NULL THEN NULL
                             ELSE v_current_price + (v_delta / 2) END,
    'bought_user_value', CASE WHEN v_prev_owner_id IS NULL THEN v_new_price
                              ELSE ((v_delta + 1) / 2) END
  );

  RETURN v_result;
END;
$FN$ LANGUAGE plpgsql;
`;

async function migrate() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  const needSsl = dbUrl.includes("sslmode=require");
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: needSsl ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log("[migrate:pcash-economy] Adding trading + auth + profile columns...");
    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS pcash_balance INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS gold_balance  INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS current_value INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS password_hash TEXT,
        ADD COLUMN IF NOT EXISTS interests     JSONB,
        ADD COLUMN IF NOT EXISTS avatar_url    TEXT;
    `);

    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE users ADD CONSTRAINT chk_pcash_nonnegative CHECK (pcash_balance >= 0);
        EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log("[migrate:pcash-economy] Creating off-chain token_id sequence...");
    await pool.query(
      "CREATE SEQUENCE IF NOT EXISTS offchain_token_id_seq START 1000000;"
    );

    // Normalize oversized prices: anything above INTEGER max (~2.1e9) is a
    // legacy wei seed; reset to the off-chain starting price so buy_pet() works.
    console.log("[migrate:pcash-economy] Normalizing oversized pet prices...");
    const { rowCount: fixedPrices } = await pool.query(
      `UPDATE pets_state
       SET current_price_wei = $1
       WHERE current_price_wei > 2147483647 OR current_price_wei <= 0`,
      [STARTING_PRICE_OFFCHAIN]
    );
    console.log(`[migrate:pcash-economy]   normalized ${fixedPrices ?? 0} pet price(s)`);

    console.log("[migrate:pcash-economy] Re-creating buy_pet() with bug fixes...");
    await pool.query(BUY_PET_FN);

    // Initialize current_value for users who have a pet but no value yet.
    console.log("[migrate:pcash-economy] Initializing current_value...");
    const { rowCount: valued } = await pool.query(
      `UPDATE users u
       SET current_value = ps.current_price_wei
       FROM pets_state ps
       WHERE ps.user_address = u.wallet_address
         AND u.current_value = 0
         AND ps.current_price_wei BETWEEN 1 AND 2147483647`
    );
    console.log(`[migrate:pcash-economy]   set current_value for ${valued ?? 0} user(s)`);

    console.log("[migrate:pcash-economy] ✅ Done");
  } catch (err) {
    console.error("[migrate:pcash-economy] ❌ Failed:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
