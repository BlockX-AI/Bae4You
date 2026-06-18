-- Bae4U database schema
-- Run once on a fresh PostgreSQL instance via: pnpm migrate

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
DO $$ BEGIN
  CREATE TYPE user_status   AS ENUM ('active', 'suspended', 'deactivated', 'ghost');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE pet_status_t  AS ENUM ('active', 'ghost', 'burned');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE match_status  AS ENUM ('pending', 'matched', 'unmatched');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE msg_type      AS ENUM ('text', 'image', 'gif', 'audio');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE period_t      AS ENUM ('daily', 'weekly', 'monthly');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE badge_tier_t  AS ENUM ('bronze', 'silver', 'gold', 'diamond', 'master');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE fiat_provider AS ENUM ('transak', 'moonpay', 'ramp');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE fiat_type     AS ENUM ('onramp', 'offramp');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE fiat_status   AS ENUM ('pending', 'processing', 'completed', 'failed');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE wallet_type_t AS ENUM ('custodial', 'self_custody');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Users (off-chain profile data)
CREATE TABLE IF NOT EXISTS users (
  id                  UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address      VARCHAR(42)    UNIQUE,
  token_id            BIGINT         UNIQUE,
  email               VARCHAR(255),
  username            VARCHAR(50)    UNIQUE,
  display_name        VARCHAR(100),
  bio                 TEXT,
  avatar_ipfs_hash    VARCHAR(100),
  birth_date          DATE,
  location_city       VARCHAR(100),
  country_code        CHAR(2),
  is_verified         BOOLEAN        NOT NULL DEFAULT false,
  is_creator          BOOLEAN        NOT NULL DEFAULT false,
  role                VARCHAR(20)    NOT NULL DEFAULT 'user',
  status              user_status    NOT NULL DEFAULT 'active',
  last_login_at       TIMESTAMPTZ,
  bonus_claimed_at    TIMESTAMPTZ,
  personality_vector  JSONB,
  pinecone_id         VARCHAR(100),
  wallet_type         wallet_type_t  NOT NULL DEFAULT 'self_custody',
  custodial_key_enc   TEXT,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_wallet  ON users (wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_token   ON users (token_id);
CREATE INDEX IF NOT EXISTS idx_users_country ON users (country_code);
CREATE INDEX IF NOT EXISTS idx_users_status  ON users (status);

-- Pets state (hybrid mirror of on-chain data)
CREATE TABLE IF NOT EXISTS pets_state (
  token_id           BIGINT        PRIMARY KEY,
  owner_address      VARCHAR(42)   NOT NULL,
  user_address       VARCHAR(42)   NOT NULL,
  current_price_wei  NUMERIC(78,0) NOT NULL DEFAULT 0,
  total_purchases    INTEGER       NOT NULL DEFAULT 0,
  is_locked          BOOLEAN       NOT NULL DEFAULT false,
  lock_expiry        TIMESTAMPTZ,
  pet_status         pet_status_t  NOT NULL DEFAULT 'active',
  last_synced_block  BIGINT        NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pets_owner   ON pets_state (owner_address);
CREATE INDEX IF NOT EXISTS idx_pets_status  ON pets_state (pet_status);

-- Pet transactions (indexed from PetPurchased events)
CREATE TABLE IF NOT EXISTS pet_transactions (
  id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  tx_hash              VARCHAR(66)   NOT NULL,
  token_id             BIGINT        NOT NULL REFERENCES pets_state(token_id),
  from_address         VARCHAR(42),
  to_address           VARCHAR(42)   NOT NULL,
  sale_price_wei       NUMERIC(78,0) NOT NULL,
  new_price_wei        NUMERIC(78,0) NOT NULL,
  profit_to_pet_wei    NUMERIC(78,0) NOT NULL DEFAULT 0,
  profit_to_seller_wei NUMERIC(78,0) NOT NULL DEFAULT 0,
  block_number         BIGINT        NOT NULL,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ptx_token   ON pet_transactions (token_id);
CREATE INDEX IF NOT EXISTS idx_ptx_hash    ON pet_transactions (tx_hash);
CREATE INDEX IF NOT EXISTS idx_ptx_to      ON pet_transactions (to_address);

-- Matches (off-chain dating layer)
CREATE TABLE IF NOT EXISTS matches (
  id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a_id           UUID         NOT NULL REFERENCES users(id),
  user_b_id           UUID         NOT NULL REFERENCES users(id),
  compatibility_score FLOAT,
  status              match_status NOT NULL DEFAULT 'pending',
  matched_at          TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_match_pair ON matches (
  LEAST(user_a_id::text, user_b_id::text),
  GREATEST(user_a_id::text, user_b_id::text)
);

-- Messages (off-chain, encrypted at rest)
CREATE TABLE IF NOT EXISTS messages (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id   UUID        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id  UUID        NOT NULL REFERENCES users(id),
  content    TEXT        NOT NULL,
  msg_type   msg_type    NOT NULL DEFAULT 'text',
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_match_time ON messages (match_id, sent_at DESC);

-- Wish list
CREATE TABLE IF NOT EXISTS wish_list (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  wisher_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_token_id  BIGINT      NOT NULL,
  note             TEXT,
  added_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (wisher_id, target_token_id)
);

-- Fiat transactions
CREATE TABLE IF NOT EXISTS fiat_transactions (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID          NOT NULL REFERENCES users(id),
  provider          fiat_provider NOT NULL,
  type              fiat_type     NOT NULL,
  fiat_amount       DECIMAL(18,2) NOT NULL,
  fiat_currency     CHAR(3)       NOT NULL DEFAULT 'USD',
  crypto_amount_wei NUMERIC(78,0),
  status            fiat_status   NOT NULL DEFAULT 'pending',
  provider_ref      VARCHAR(200),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fiat_user    ON fiat_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_fiat_ref     ON fiat_transactions (provider_ref);

-- Creator passes (on-chain SFT pass metadata)
CREATE TABLE IF NOT EXISTS creator_passes (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id       UUID        NOT NULL REFERENCES users(id),
  token_id         BIGINT,
  contract_address VARCHAR(42),
  price_wei        NUMERIC(78,0) NOT NULL,
  max_supply       INTEGER,
  current_supply   INTEGER     NOT NULL DEFAULT 0,
  royalty_bps      SMALLINT    NOT NULL DEFAULT 500,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rankings snapshot
CREATE TABLE IF NOT EXISTS rankings_snapshot (
  id           UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID           NOT NULL REFERENCES users(id),
  period_type  period_t       NOT NULL,
  assets_rank  INTEGER,
  value_rank   INTEGER,
  country_rank INTEGER,
  badge_tier   badge_tier_t,
  badge_proof  TEXT,
  snapshot_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rank_period ON rankings_snapshot (period_type, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_rank_user   ON rankings_snapshot (user_id);

-- Push notification tokens (Expo)
CREATE TABLE IF NOT EXISTS push_tokens (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT        NOT NULL,
  platform   TEXT        NOT NULL DEFAULT 'ios',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens (user_id);

-- Swipe passes / skips (dating discovery)
CREATE TABLE IF NOT EXISTS swipe_passes (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_swipe_passes_user ON swipe_passes (user_id);

-- Block/Report table
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

-- SIWE nonces (one per wallet, short-lived)
CREATE TABLE IF NOT EXISTS nonces (
  wallet_address VARCHAR(42)  PRIMARY KEY,
  nonce          VARCHAR(64)  NOT NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Hero cards (profile cards for users)
CREATE SEQUENCE IF NOT EXISTS hero_card_number_seq START 1;

CREATE TABLE IF NOT EXISTS hero_cards (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_number     INTEGER      NOT NULL DEFAULT nextval('hero_card_number_seq'),
  tier            VARCHAR(20)  NOT NULL CHECK (tier IN ('Common', 'Rare', 'Epic', 'Legendary')),
  card_ipfs_hash  VARCHAR(100),
  vibe_score      INTEGER      NOT NULL DEFAULT 0,
  rizz_score      INTEGER      NOT NULL DEFAULT 0,
  drip_score      INTEGER      NOT NULL DEFAULT 0,
  aura_score      INTEGER      NOT NULL DEFAULT 0,
  badges          JSONB,
  generated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, card_number)
);

CREATE INDEX IF NOT EXISTS idx_hero_cards_user ON hero_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_hero_cards_number ON hero_cards(card_number);
CREATE INDEX IF NOT EXISTS idx_hero_cards_tier ON hero_cards(tier);

-- ============================================
-- TRADING CORE - Added for pet marketplace
-- ============================================

-- Enums for trading
DO $$ BEGIN
  CREATE TYPE bid_status_t AS ENUM ('active', 'expired', 'accepted', 'withdrawn');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE tx_type_t AS ENUM ('buy', 'bid_place', 'list_for_sale', 'bid_accepted');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Extend users table with trading fields
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pcash_balance INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gold_balance INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_value INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT chk_pcash_nonnegative CHECK (pcash_balance >= 0);

-- Pets ownership (tracks who owns which pet)
CREATE TABLE IF NOT EXISTS pets_ownership (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id          BIGINT      NOT NULL REFERENCES pets_state(token_id) ON DELETE CASCADE,
  purchase_price  INTEGER     NOT NULL,
  purchased_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at     TIMESTAMPTZ,
  locked_until    TIMESTAMPTZ
);

-- Partial unique index: one active ownership per pet
CREATE UNIQUE INDEX IF NOT EXISTS idx_pets_ownership_active
  ON pets_ownership (pet_id)
  WHERE released_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pets_ownership_owner ON pets_ownership (owner_id);
CREATE INDEX IF NOT EXISTS idx_pets_ownership_pet ON pets_ownership (pet_id);

-- Value history (tracks value changes over time)
CREATE TABLE IF NOT EXISTS value_history (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_value  INTEGER     NOT NULL,
  new_value  INTEGER     NOT NULL,
  reason     TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_value_history_user ON value_history (user_id);
CREATE INDEX IF NOT EXISTS idx_value_history_created ON value_history (created_at DESC);

-- Transactions (buy/sell/bid audit log)
CREATE TABLE IF NOT EXISTS transactions (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  type          tx_type_t   NOT NULL,
  buyer_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id        BIGINT      NOT NULL REFERENCES pets_state(token_id) ON DELETE CASCADE,
  prev_owner_id UUID        REFERENCES users(id) ON DELETE SET NULL,
  amount        INTEGER     NOT NULL,
  value_after   INTEGER     NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions (buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_pet ON transactions (pet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);

-- Bids (active and historical)
CREATE TABLE IF NOT EXISTS bids (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  bidder_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id     BIGINT      NOT NULL REFERENCES pets_state(token_id) ON DELETE CASCADE,
  amount     INTEGER     NOT NULL,
  status     bid_status_t NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_bids_bidder ON bids (bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_pet ON bids (pet_id);
CREATE INDEX IF NOT EXISTS idx_bids_active ON bids (pet_id, amount DESC) WHERE status = 'active';

-- ============================================
-- BUY PET STORED FUNCTION (atomic transaction)
-- ============================================

CREATE OR REPLACE FUNCTION buy_pet(p_pet_id BIGINT, p_buyer_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_current_price INTEGER;
  v_new_price INTEGER;
  v_delta INTEGER;
  v_prev_owner_id UUID;
  v_bought_user_id UUID;
  v_buyer_pcash INTEGER;
  v_buyer_count INTEGER;
  v_pet_locked_until TIMESTAMPTZ;
  v_transaction_id UUID;
  v_result JSONB;
BEGIN
  -- Lock pet row first (prevent concurrent buys)
  SELECT current_price_wei, user_address, is_locked, lock_expiry
  INTO v_current_price, v_bought_user_id, v_pet_locked, v_pet_locked_until
  FROM pets_state
  WHERE token_id = p_pet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Pet not found', 'code', 'ERR_NOT_FOUND');
  END IF;

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
$$ LANGUAGE plpgsql;
