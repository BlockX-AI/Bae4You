import "dotenv/config";
import { Pool } from "pg";

async function run() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  const needSsl = dbUrl.includes("sslmode=require");
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: needSsl ? { rejectUnauthorized: false } : false,
  });

  console.log("[migrate-fantasy] Running Fantasy Bae migration...");
  await pool.query(`
    -- ──────────────────────────────────────────────────────────────
    -- Fantasy Bae DB migration
    -- New tables: hero_scores, bae_cards, card_states,
    --             tournaments, tournament_decks, couple_cards
    -- ──────────────────────────────────────────────────────────────

    DO $$ BEGIN
      CREATE TYPE card_rarity_t AS ENUM ('common', 'rare', 'epic', 'legend');
      EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE tournament_status_t AS ENUM ('active', 'scoring', 'closed');
      EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    -- Weekly hero scores computed by the oracle cron job
    CREATE TABLE IF NOT EXISTS hero_scores (
      id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week_number     INTEGER       NOT NULL,
      year_number     INTEGER       NOT NULL,
      matches_count   INTEGER       NOT NULL DEFAULT 0,
      messages_count  INTEGER       NOT NULL DEFAULT 0,
      likes_count     INTEGER       NOT NULL DEFAULT 0,
      pcash_earned    NUMERIC(78,0) NOT NULL DEFAULT 0,
      pets_traded     INTEGER       NOT NULL DEFAULT 0,
      raw_score       NUMERIC(20,4) NOT NULL DEFAULT 0,
      computed_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, week_number, year_number)
    );

    CREATE INDEX IF NOT EXISTS idx_hero_scores_week  ON hero_scores (week_number, year_number, raw_score DESC);
    CREATE INDEX IF NOT EXISTS idx_hero_scores_user  ON hero_scores (user_id);

    -- On-chain Bae Card mirror (one row per minted BaeCard NFT)
    CREATE TABLE IF NOT EXISTS bae_cards (
      token_id        BIGINT        PRIMARY KEY,
      subject_address VARCHAR(42)   NOT NULL,
      subject_user_id UUID          REFERENCES users(id),
      rarity          card_rarity_t NOT NULL DEFAULT 'common',
      tx_hash         VARCHAR(66),
      minted_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_bae_cards_subject ON bae_cards (subject_address);
    CREATE INDEX IF NOT EXISTS idx_bae_cards_rarity  ON bae_cards (rarity);

    -- Off-chain mirror of card market states (owner, price)
    CREATE TABLE IF NOT EXISTS card_states (
      token_id        BIGINT        PRIMARY KEY REFERENCES bae_cards(token_id),
      owner_address   VARCHAR(42)   NOT NULL,
      current_price_wei NUMERIC(78,0) NOT NULL DEFAULT 0,
      total_trades    INTEGER       NOT NULL DEFAULT 0,
      last_synced_block BIGINT      NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_card_states_owner ON card_states (owner_address);

    -- Tournament records
    CREATE TABLE IF NOT EXISTS tournaments (
      id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      chain_id        BIGINT        NOT NULL,
      start_time      TIMESTAMPTZ   NOT NULL,
      end_time        TIMESTAMPTZ   NOT NULL,
      prize_pool_wei  NUMERIC(78,0) NOT NULL DEFAULT 0,
      merkle_root     VARCHAR(66),
      status          tournament_status_t NOT NULL DEFAULT 'active',
      created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments (status, end_time DESC);

    -- Per-player locked decks for each tournament
    CREATE TABLE IF NOT EXISTS tournament_decks (
      id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      tournament_id   UUID          NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      player_address  VARCHAR(42)   NOT NULL,
      player_user_id  UUID          REFERENCES users(id),
      card_ids        BIGINT[]      NOT NULL,
      total_score     NUMERIC(20,4) NOT NULL DEFAULT 0,
      rank            INTEGER,
      prize_claimed   BOOLEAN       NOT NULL DEFAULT false,
      created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      UNIQUE (tournament_id, player_address)
    );

    CREATE INDEX IF NOT EXISTS idx_decks_tournament ON tournament_decks (tournament_id, total_score DESC);
    CREATE INDEX IF NOT EXISTS idx_decks_player     ON tournament_decks (player_address);

    -- On-chain couple card mirror
    CREATE TABLE IF NOT EXISTS couple_cards (
      id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      match_id        UUID          NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      token_id_a      BIGINT        NOT NULL,
      token_id_b      BIGINT        NOT NULL,
      user_a_id       UUID          NOT NULL REFERENCES users(id),
      user_b_id       UUID          NOT NULL REFERENCES users(id),
      is_active       BOOLEAN       NOT NULL DEFAULT true,
      tx_hash         VARCHAR(66),
      minted_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      burned_at       TIMESTAMPTZ,
      UNIQUE (match_id)
    );

    CREATE INDEX IF NOT EXISTS idx_couple_cards_match  ON couple_cards (match_id);
    CREATE INDEX IF NOT EXISTS idx_couple_cards_user_a ON couple_cards (user_a_id);
    CREATE INDEX IF NOT EXISTS idx_couple_cards_user_b ON couple_cards (user_b_id);
  `);

  console.log("✅  Fantasy Bae tables created:");
  console.log("    hero_scores, bae_cards, card_states,");
  console.log("    tournaments, tournament_decks, couple_cards");
  await pool.end();
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
