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

-- SIWE nonces (one per wallet, short-lived)
CREATE TABLE IF NOT EXISTS nonces (
  wallet_address VARCHAR(42)  PRIMARY KEY,
  nonce          VARCHAR(64)  NOT NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
