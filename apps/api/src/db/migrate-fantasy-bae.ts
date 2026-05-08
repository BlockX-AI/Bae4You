#!/usr/bin/env tsx

/**
 * Fantasy Bae Database Migration
 * Creates missing tables for Fantasy Bae features
 */

import { db } from "../db/client";

async function migrate() {
  console.log("Creating Fantasy Bae tables...");

  try {
    // Create fantasy_cards table
    await db.query(`
      CREATE TABLE IF NOT EXISTS fantasy_cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token_id BIGINT UNIQUE NOT NULL,
        subject_address VARCHAR(42) NOT NULL,
        rarity INTEGER NOT NULL CHECK (rarity >= 0 AND rarity <= 3),
        multiplier INTEGER NOT NULL,
        owner_address VARCHAR(42) NOT NULL,
        price_wei VARCHAR(30) DEFAULT '0',
        listed BOOLEAN DEFAULT false,
        total_trades INTEGER DEFAULT 0,
        minted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log("✅ Created fantasy_cards table");

    // Create tournaments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        status VARCHAR(20) DEFAULT 'upcoming',
        start_time TIMESTAMP WITH TIME ZONE,
        end_time TIMESTAMP WITH TIME ZONE,
        entry_fee VARCHAR(30) DEFAULT '0',
        prize_pool VARCHAR(30) DEFAULT '0',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log("✅ Created tournaments table");

    // Create tournament_participants table
    await db.query(`
      CREATE TABLE IF NOT EXISTS tournament_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        card_ids BIGINT[] NOT NULL CHECK (array_length(card_ids, 1) = 5),
        locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        score INTEGER DEFAULT 0,
        rank INTEGER,
        prize_wei VARCHAR(30) DEFAULT '0',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(tournament_id, user_id)
      )
    `);
    console.log("✅ Created tournament_participants table");

    // Create couples table
    await db.query(`
      CREATE TABLE IF NOT EXISTS couples (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_a_id UUID REFERENCES users(id) ON DELETE CASCADE,
        user_b_id UUID REFERENCES users(id) ON DELETE CASCADE,
        match_id VARCHAR(66) UNIQUE NOT NULL,
        token_a_id BIGINT,
        token_b_id BIGINT,
        active BOOLEAN DEFAULT true,
        message_count INTEGER DEFAULT 0,
        minted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CHECK(user_a_id < user_b_id)
      )
    `);
    console.log("✅ Created couples table");

    // Add missing columns to existing tables
    try {
      await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_private_key TEXT`);
      console.log("✅ Added encrypted_private_key to users table");
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.query(`ALTER TABLE nonces ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE`);
      console.log("✅ Added expires_at to nonces table");
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.query(`ALTER TABLE hero_scores ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0`);
      console.log("✅ Added score column to hero_scores table");
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS entry_fee VARCHAR(30) DEFAULT '0'`);
      console.log("✅ Added entry_fee column to tournaments table");
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS prize_pool VARCHAR(30) DEFAULT '0'`);
      console.log("✅ Added prize_pool column to tournaments table");
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.query(`ALTER TABLE hero_scores ADD COLUMN IF NOT EXISTS week INTEGER`);
      console.log("✅ Added week column to hero_scores table");
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.query(`ALTER TABLE hero_scores ADD COLUMN IF NOT EXISTS year INTEGER`);
      console.log("✅ Added year column to hero_scores table");
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.query(`ALTER TABLE hero_scores ADD COLUMN IF NOT EXISTS week_number INTEGER`);
      console.log("✅ Added week_number column to hero_scores table");
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.query(`ALTER TABLE hero_scores ADD COLUMN IF NOT EXISTS year_number INTEGER`);
      console.log("✅ Added year_number column to hero_scores table");
    } catch (e) {
      // Column might already exist
    }

    try {
      await db.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 84532`);
      console.log("✅ Added chain_id column to tournaments table");
    } catch (e) {
      // Column might already exist
    }

    // Create unique constraint for hero_scores ON CONFLICT
    try {
      await db.query(`ALTER TABLE hero_scores ADD CONSTRAINT hero_scores_user_week_year_unique UNIQUE (user_id, week, year)`);
      console.log("✅ Added unique constraint to hero_scores table");
    } catch (e) {
      // Constraint might already exist
    }

    // Create indexes for performance
    await db.query(`CREATE INDEX IF NOT EXISTS idx_fantasy_cards_token_id ON fantasy_cards(token_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_fantasy_cards_subject ON fantasy_cards(subject_address)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_fantasy_cards_owner ON fantasy_cards(owner_address)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_couples_match_id ON couples(match_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_couples_users ON couples(user_a_id, user_b_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament ON tournament_participants(tournament_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_tournament_participants_user ON tournament_participants(user_id)`);

    console.log("✅ Created indexes");
    console.log("\n🎉 Fantasy Bae migration completed successfully!");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrate().catch(console.error);
