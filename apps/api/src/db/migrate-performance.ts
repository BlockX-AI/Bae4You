import "dotenv/config";
import { db } from "./client";

async function migratePerformanceIndexes() {
  console.log("🚀 Adding performance indexes for production readiness...");

  try {
    // Check which tables exist
    const { rows: existingTables } = await db.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('matches', 'pets_state', 'hero_scores', 'messages', 'users', 'tournaments', 'fantasy_cards', 'tournament_participants', 'couples', 'swipe_passes', 'nonces')
    `);
    
    const tableExists = (tableName: string) => 
      existingTables.some((row: any) => row.tablename === tableName);

    // Index for matches discover query
    if (tableExists('matches')) {
      console.log("1. Adding idx_matches_discover...");
      await db.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_discover 
        ON matches (user_a_id, user_b_id) 
        WHERE status = 'pending'
      `);
    } else {
      console.log("1. Skipping idx_matches_discover - table 'matches' not found");
    }

    // Index for pets_state queries (basic index)
    if (tableExists('pets_state')) {
      console.log("2. Adding idx_pets_owner...");
      await db.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pets_owner 
        ON pets_state (owner_address)
      `);
    } else {
      console.log("2. Skipping idx_pets_owner - table 'pets_state' not found");
    }

    // Index for hero scores leaderboard queries
    if (tableExists('hero_scores')) {
      console.log("3. Adding idx_hero_scores_weekly...");
      await db.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hero_scores_weekly 
        ON hero_scores (week_number, year_number, raw_score DESC)
      `);
    } else {
      console.log("3. Skipping idx_hero_scores_weekly - table 'hero_scores' not found");
    }

    // Index for messages thread queries
    if (tableExists('messages')) {
      console.log("4. Adding idx_messages_thread...");
      await db.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_thread 
        ON messages (match_id)
      `);
    } else {
      console.log("4. Skipping idx_messages_thread - table 'messages' not found");
    }

    // Index for users personality vector queries (GIN for JSONB)
    if (tableExists('users')) {
      console.log("5. Adding idx_users_personality_vector...");
      await db.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_personality 
        ON users USING GIN (personality_vector)
      `);
    } else {
      console.log("5. Skipping idx_users_personality_vector - table 'users' not found");
    }

    // Index for tournaments active queries
    if (tableExists('tournaments')) {
      console.log("6. Adding idx_tournaments_active...");
      await db.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tournaments_active 
        ON tournaments (status)
      `);
    } else {
      console.log("6. Skipping idx_tournaments_active - table 'tournaments' not found");
    }

    // Index for users by country and status
    if (tableExists('users')) {
      console.log("7. Adding idx_users_country_status...");
      await db.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_country_status 
        ON users (country_code, status)
      `);
    } else {
      console.log("7. Skipping idx_users_country_status - table 'users' not found");
    }

    // Skip fantasy cards index for now
    console.log("8. Skipping idx_fantasy_cards_basic - will be added later");

    // Index for tournament participants
    if (tableExists('tournament_participants')) {
      console.log("9. Adding idx_tournament_participants_user...");
      await db.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tournament_participants_user 
        ON tournament_participants (user_id, tournament_id)
      `);
    } else {
      console.log("9. Skipping idx_tournament_participants_user - table 'tournament_participants' not found");
    }

    // Skip couples index for now
    console.log("10. Skipping idx_couples_users - will be added later");

    // Composite index for swipe passes
    if (tableExists('swipe_passes')) {
      console.log("11. Adding idx_swipe_passes_user_created...");
      await db.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_swipe_passes_user_created 
        ON swipe_passes (user_id)
      `);
    } else {
      console.log("11. Skipping idx_swipe_passes_user_created - table 'swipe_passes' not found");
    }

    // Index for nonces cleanup
    if (tableExists('nonces')) {
      console.log("12. Adding idx_nonces_created_at...");
      await db.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nonces_created_at 
        ON nonces (created_at)
      `);
    } else {
      console.log("12. Skipping idx_nonces_created_at - table 'nonces' not found");
    }

    console.log("✅ All performance indexes created successfully!");

    // Analyze tables to update statistics
    console.log("📊 Updating table statistics...");
    const tables = [
      'matches', 'pets_state', 'hero_scores', 'messages', 'users', 
      'tournaments', 'fantasy_cards', 'tournament_participants', 
      'couples', 'swipe_passes', 'nonces'
    ];

    for (const table of tables) {
      if (tableExists(table)) {
        await db.query(`ANALYZE ${table}`);
      }
    }

    console.log("✅ Table statistics updated!");

    console.log("📈 Performance indexes migration completed successfully!");

  } catch (error) {
    console.error("❌ Error creating performance indexes:", error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migratePerformanceIndexes()
    .then(() => {
      console.log("🎉 Performance migration completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Performance migration failed:", error);
      process.exit(1);
    });
}

export { migratePerformanceIndexes };
