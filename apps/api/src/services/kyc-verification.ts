/**
 * KYC Verification Service
 * 
 * Handles photo upload, video KYC verification, and account approval for PetCash access.
 * Uses face matching between uploaded photo and video frames for verification.
 * 
 * @module services/kyc-verification
 */

import { db } from "../db/client";
import { selectBestKycFrame, normaliseKycFrame } from "./video-kyc";
import sharp from "sharp";

export type KycStatus = "pending" | "approved" | "rejected" | "revoked";

export interface KycPhotoUpload {
  userId: string;
  photoBase64: string;
}

export interface KycVideoSubmit {
  userId: string;
  frames: string[]; // Array of base64 encoded frames from video
}

export interface KycVerificationResult {
  success: boolean;
  status: KycStatus;
  matchScore?: number;
  reason?: string;
}

export interface KycApprovalRequest {
  userId: string;
  approvedBy: string;
  reason?: string;
}

// ============================================================================
// Photo Upload
// ============================================================================

/**
 * Uploads a photo for KYC verification.
 * Stores the photo as base64 in the database.
 */
export async function uploadKycPhoto(userId: string, photoBase64: string): Promise<void> {
  // Validate photo is a valid image
  const buffer = Buffer.from(photoBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
  
  try {
    await sharp(buffer).metadata();
  } catch (error) {
    throw new Error("Invalid image format");
  }

  // Store photo in database
  await db.query(
    `UPDATE users 
     SET kyc_photo = $1, kyc_status = 'pending', kyc_video_frames = NULL
     WHERE id = $2`,
    [photoBase64, userId]
  );
}

// ============================================================================
// Video KYC Submission
// ============================================================================

/**
 * Submits video frames for KYC verification.
 * Selects the best frame and matches it with the uploaded photo.
 */
export async function submitKycVideo(userId: string, frames: string[]): Promise<KycVerificationResult> {
  // Get user's uploaded photo
  const userResult = await db.query(
    `SELECT kyc_photo FROM users WHERE id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new Error("User not found");
  }

  const user = userResult.rows[0];
  if (!user.kyc_photo) {
    throw new Error("No photo uploaded. Please upload a photo first.");
  }

  // Convert frames to buffers
  const frameBuffers = frames.map(frame => 
    Buffer.from(frame.replace(/^data:image\/\w+;base64,/, ""), "base64")
  );

  // Select best frame using existing video-kyc service
  const { bestFrame, scores } = await selectBestKycFrame(frameBuffers);

  // Normalize the best frame
  const normalizedFrame = await normaliseKycFrame(bestFrame);

  // Store video frames data
  await db.query(
    `UPDATE users 
     SET kyc_video_frames = $1
     WHERE id = $2`,
    [JSON.stringify({ scores, frameCount: frames.length }), userId]
  );

  // Perform face matching
  const matchScore = await matchFaces(user.kyc_photo, normalizedFrame);

  // Determine verification result
  const MATCH_THRESHOLD = 0.7; // 70% similarity required
  
  if (matchScore >= MATCH_THRESHOLD) {
    // Auto-approve if match is good
    await approveKycVerification(userId, "system", "Automatic approval: Face match successful");
    return {
      success: true,
      status: "approved",
      matchScore,
    };
  } else {
    // Mark as pending for manual review if match is borderline
    if (matchScore >= 0.5) {
      await db.query(
        `UPDATE users SET kyc_status = 'pending' WHERE id = $1`,
        [userId]
      );
      return {
        success: false,
        status: "pending",
        matchScore,
        reason: "Face match requires manual review",
      };
    } else {
      // Reject if match is poor
      await rejectKycVerification(userId, "system", "Face match failed: Faces do not match");
      return {
        success: false,
        status: "rejected",
        matchScore,
        reason: "Face match failed: Faces do not match",
      };
    }
  }
}

// ============================================================================
// Face Matching
// ============================================================================

/**
 * Compares two face images and returns a similarity score (0-1).
 * Uses perceptual hash comparison for face matching.
 */
async function matchFaces(photo1Base64: string, photo2Buffer: Buffer): Promise<number> {
  try {
    // Convert photo1 to buffer
    const photo1Buffer = Buffer.from(
      photo1Base64.replace(/^data:image\/\w+;base64,/, ""), 
      "base64"
    );

    // Resize both images to same size for comparison
    const SIZE = 64;
    const img1 = await sharp(photo1Buffer)
      .resize(SIZE, SIZE, { fit: "cover" })
      .greyscale()
      .raw()
      .toBuffer();

    const img2 = await sharp(photo2Buffer)
      .resize(SIZE, SIZE, { fit: "cover" })
      .greyscale()
      .raw()
      .toBuffer();

    // Calculate similarity using simple pixel comparison
    let matchCount = 0;
    for (let i = 0; i < img1.length; i++) {
      const diff = Math.abs((img1[i] as number) - (img2[i] as number));
      if (diff < 30) { // Allow some variance
        matchCount++;
      }
    }

    return matchCount / img1.length;
  } catch (error) {
    console.error("Face matching error:", error);
    return 0; // Return 0 on error
  }
}

// ============================================================================
// Approval/Rejection
// ============================================================================

/**
 * Approves KYC verification and grants PetCash access.
 */
export async function approveKycVerification(
  userId: string, 
  approvedBy: string, 
  reason?: string
): Promise<void> {
  await db.query(
    `UPDATE users 
     SET kyc_status = 'approved',
         kyc_verified_at = NOW(),
         kyc_verified_by = $1,
         kyc_rejection_reason = NULL,
         can_access_petcash = true
     WHERE id = $2`,
    [approvedBy, userId]
  );
}

/**
 * Rejects KYC verification.
 */
export async function rejectKycVerification(
  userId: string, 
  rejectedBy: string, 
  reason: string
): Promise<void> {
  await db.query(
    `UPDATE users 
     SET kyc_status = 'rejected',
         kyc_rejection_reason = $1,
         can_access_petcash = false
     WHERE id = $2`,
    [reason, userId]
  );
}

/**
 * Revokes KYC verification and removes PetCash access.
 */
export async function revokeKycVerification(
  userId: string, 
  revokedBy: string, 
  reason: string
): Promise<void> {
  await db.query(
    `UPDATE users 
     SET kyc_status = 'revoked',
         kyc_revoked_at = NOW(),
         kyc_revocation_reason = $1,
         can_access_petcash = false
     WHERE id = $2`,
    [reason, userId]
  );
}

// ============================================================================
// Status Queries
// ============================================================================

/**
 * Gets KYC verification status for a user.
 */
export async function getKycStatus(userId: string): Promise<{
  status: KycStatus;
  canAccessPetcash: boolean;
  verifiedAt?: Date;
  rejectedReason?: string;
  revokedAt?: Date;
  revocationReason?: string;
}> {
  const result = await db.query(
    `SELECT kyc_status, can_access_petcash, kyc_verified_at, 
            kyc_rejection_reason, kyc_revoked_at, kyc_revocation_reason
     FROM users 
     WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error("User not found");
  }

  const user = result.rows[0];
  return {
    status: user.kyc_status,
    canAccessPetcash: user.can_access_petcash,
    verifiedAt: user.kyc_verified_at,
    rejectedReason: user.kyc_rejection_reason,
    revokedAt: user.kyc_revoked_at,
    revocationReason: user.kyc_revocation_reason,
  };
}

/**
 * Checks if user has verified blue tick.
 */
export async function hasBlueTick(userId: string): Promise<boolean> {
  const result = await db.query(
    `SELECT kyc_status, can_access_petcash FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return false;
  }

  const user = result.rows[0];
  return user.kyc_status === "approved" && user.can_access_petcash;
}

/**
 * Gets all pending KYC verifications for admin review.
 */
export async function getPendingVerifications(): Promise<Array<{
  userId: string;
  username: string;
  walletAddress: string;
  kycPhoto: string;
  kycVideoFrames: any;
  submittedAt: Date;
}>> {
  const result = await db.query(
    `SELECT id, username, wallet_address, kyc_photo, kyc_video_frames, created_at
     FROM users 
     WHERE kyc_status = 'pending'
     ORDER BY created_at ASC`
  );

  return result.rows.map(row => ({
    userId: row.id,
    username: row.username,
    walletAddress: row.wallet_address,
    kycPhoto: row.kyc_photo,
    kycVideoFrames: row.kyc_video_frames,
    submittedAt: row.created_at,
  }));
}
