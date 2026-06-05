/**
 * KYC Verification API Routes
 * 
 * Endpoints for KYC verification process:
 * - Upload photo for verification
 * - Submit video frames for liveness verification
 * - Get KYC status
 * - Admin approval/rejection
 * - Revoke verification
 * 
 * @module routes/kyc
 */

import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  uploadKycPhoto,
  submitKycVideo,
  approveKycVerification,
  rejectKycVerification,
  revokeKycVerification,
  getKycStatus,
  hasBlueTick,
  getPendingVerifications,
} from "../services/kyc-verification";

const kycRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /kyc/photo - Upload photo for KYC verification
  fastify.post("/kyc/photo", async (req, reply) => {
    try {
      const body = z.object({
        userId: z.string().uuid(),
        photoBase64: z.string(),
      }).parse(req.body);

      await uploadKycPhoto(body.userId, body.photoBase64);

      return reply.send({
        success: true,
        message: "Photo uploaded successfully",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: "Validation error",
          details: error.errors,
        });
      }
      console.error("[KYC] Error uploading photo:", error);
      return reply.code(500).send({
        success: false,
        error: "Failed to upload photo",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // POST /kyc/video - Submit video frames for KYC verification
  fastify.post("/kyc/video", async (req, reply) => {
    try {
      const body = z.object({
        userId: z.string().uuid(),
        frames: z.array(z.string()).min(3).max(10),
      }).parse(req.body);

      const result = await submitKycVideo(body.userId, body.frames);

      return reply.send({
        success: result.success,
        status: result.status,
        matchScore: result.matchScore,
        reason: result.reason,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: "Validation error",
          details: error.errors,
        });
      }
      console.error("[KYC] Error submitting video:", error);
      return reply.code(500).send({
        success: false,
        error: "Failed to submit video",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // GET /kyc/status/:userId - Get KYC verification status
  fastify.get("/kyc/status/:userId", async (req, reply) => {
    try {
      const { userId } = req.params as { userId: string };

      const status = await getKycStatus(userId);

      return reply.send({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error("[KYC] Error getting status:", error);
      return reply.code(500).send({
        success: false,
        error: "Failed to get KYC status",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // GET /kyc/bluetick/:userId - Check if user has blue tick
  fastify.get("/kyc/bluetick/:userId", async (req, reply) => {
    try {
      const { userId } = req.params as { userId: string };

      const hasTick = await hasBlueTick(userId);

      return reply.send({
        success: true,
        data: {
          hasBlueTick: hasTick,
        },
      });
    } catch (error) {
      console.error("[KYC] Error checking blue tick:", error);
      return reply.code(500).send({
        success: false,
        error: "Failed to check blue tick status",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // POST /kyc/approve - Admin: Approve KYC verification (admin only)
  fastify.post("/kyc/approve", async (req, reply) => {
    try {
      const body = z.object({
        userId: z.string().uuid(),
        approvedBy: z.string().uuid(),
        reason: z.string().optional(),
      }).parse(req.body);

      await approveKycVerification(body.userId, body.approvedBy, body.reason);

      return reply.send({
        success: true,
        message: "KYC verification approved",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: "Validation error",
          details: error.errors,
        });
      }
      console.error("[KYC] Error approving verification:", error);
      return reply.code(500).send({
        success: false,
        error: "Failed to approve verification",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // POST /kyc/reject - Admin: Reject KYC verification (admin only)
  fastify.post("/kyc/reject", async (req, reply) => {
    try {
      const body = z.object({
        userId: z.string().uuid(),
        rejectedBy: z.string().uuid(),
        reason: z.string().min(10),
      }).parse(req.body);

      await rejectKycVerification(body.userId, body.rejectedBy, body.reason);

      return reply.send({
        success: true,
        message: "KYC verification rejected",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: "Validation error",
          details: error.errors,
        });
      }
      console.error("[KYC] Error rejecting verification:", error);
      return reply.code(500).send({
        success: false,
        error: "Failed to reject verification",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // POST /kyc/revoke - Admin: Revoke KYC verification (admin only)
  fastify.post("/kyc/revoke", async (req, reply) => {
    try {
      const body = z.object({
        userId: z.string().uuid(),
        revokedBy: z.string().uuid(),
        reason: z.string().min(10),
      }).parse(req.body);

      await revokeKycVerification(body.userId, body.revokedBy, body.reason);

      return reply.send({
        success: true,
        message: "KYC verification revoked",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: "Validation error",
          details: error.errors,
        });
      }
      console.error("[KYC] Error revoking verification:", error);
      return reply.code(500).send({
        success: false,
        error: "Failed to revoke verification",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // GET /kyc/pending - Admin: Get all pending verifications (admin only)
  fastify.get("/kyc/pending", async (req, reply) => {
    try {
      const pending = await getPendingVerifications();

      return reply.send({
        success: true,
        data: pending,
      });
    } catch (error) {
      console.error("[KYC] Error getting pending verifications:", error);
      return reply.code(500).send({
        success: false,
        error: "Failed to get pending verifications",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
};

export default kycRoutes;
