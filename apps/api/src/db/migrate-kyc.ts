/**
 * KYC Verification Database Migration
 * 
 * Adds fields for KYC verification system:
 * - kyc_photo: Stores the uploaded photo for verification
 * - kyc_video_frames: Stores frames from video KYC
 * - kyc_status: Verification status (pending, approved, rejected, revoked)
 * - kyc_verified_at: Timestamp when verification was approved
 * - kyc_verified_by: Admin who approved the verification
 * - kyc_rejection_reason: Reason for rejection
 * - kyc_revoked_at: Timestamp when verification was revoked
 * - kyc_revocation_reason: Reason for revocation
 * - can_access_petcash: Boolean flag for PetCash access
 */

import { db } from "../db/client";

export async function migrateKyc() {
  console.log("Running KYC verification migration...");

  try {
    // Add KYC status enum
    await db.query(`
      DO $$ BEGIN
        CREATE TYPE kyc_status AS ENUM ('pending', 'approved', 'rejected', 'revoked');
        EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add KYC fields to users table
    await db.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS kyc_photo TEXT,
      ADD COLUMN IF NOT EXISTS kyc_video_frames JSONB,
      ADD COLUMN IF NOT EXISTS kyc_status kyc_status DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS kyc_verified_by UUID,
      ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT,
      ADD COLUMN IF NOT EXISTS kyc_revoked_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS kyc_revocation_reason TEXT,
      ADD COLUMN IF NOT EXISTS can_access_petcash BOOLEAN DEFAULT false;
    `);

    // Add index for KYC status
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users (kyc_status);
    `);

    // Add index for PetCash access
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_users_petcash_access ON users (can_access_petcash);
    `);

    console.log("✅ KYC verification migration completed successfully");
  } catch (error) {
    console.error("❌ KYC verification migration failed:", error);
    throw error;
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrateKyc()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
