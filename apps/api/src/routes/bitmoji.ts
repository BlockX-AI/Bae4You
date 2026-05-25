/**
 * Bitmoji API Routes
 * 
 * Endpoints for generating Bitmoji avatars and sticker packs.
 * 
 * @module routes/bitmoji
 */

import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { generateBitmojiFromPhoto, generateCoupleBitmoji, validateBitmojiOptions } from "../services/bitmoji-service";
import { uploadToIPFS, ipfsGatewayUrl } from "../services/ipfs";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const bitmojiSchema = z.object({
  style: z.enum(["avataaars", "lorelei", "notionists", "big-smile"]).optional(),
  gender: z.enum(["male", "female"]).optional(),  // override auto-detection
  generateStickers: z.coerce.boolean().optional(),
  stickerSize: z.coerce.number().min(64).max(2048).optional(),
  avatarSize: z.coerce.number().min(64).max(2048).optional(),
  debug: z.coerce.boolean().optional(),
});

const coupleBitmojiSchema = bitmojiSchema.extend({
  bonded: z.coerce.boolean().optional(),
});

const bitmojiRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /users/me/bitmoji
  fastify.post(
    "/me/bitmoji",
    {
      preHandler: fastify.authenticate,
    },
    async (req, reply) => {
      try {
        // Parse multipart form data
        const parts = req.parts();
        let photoBuffer: Buffer | null = null;
        const options: any = {};

        for await (const part of parts) {
          if (part.type === "file") {
            if (!ALLOWED_MIME.has(part.mimetype)) {
              return reply.code(400).send({ 
                error: "Invalid file type. Allowed: JPEG, PNG, WebP" 
              });
            }
            photoBuffer = await part.toBuffer();
          } else if (part.type === "field") {
            options[part.fieldname] = part.value;
          }
        }

        if (!photoBuffer) {
          return reply.code(400).send({ error: "Photo is required" });
        }

        // Parse and validate options
        const parsedOptions = bitmojiSchema.parse(options);

        if (!validateBitmojiOptions(parsedOptions)) {
          return reply.code(400).send({ error: "Invalid options" });
        }

        // Generate bitmoji
        const result = await generateBitmojiFromPhoto(
          photoBuffer,
          parsedOptions
        );

        // Upload to IPFS
        const avatarIpfs = await uploadToIPFS(
          result.avatar.buffer,
          `avatar-${Date.now()}.png`,
          "image/png"
        );
        const stickerIpfs = await Promise.all(
          result.stickers.map((s, i) => 
            uploadToIPFS(
              s.buffer,
              `sticker-${result.stickers[i].type}-${Date.now()}.png`,
              "image/png"
            )
          )
        );

        // Return response
        return reply.send({
          success: true,
          data: {
            avatar: {
              url: ipfsGatewayUrl(avatarIpfs),
              ipfsHash: avatarIpfs,
              size: result.avatar.size,
              format: result.avatar.format,
              features: result.features,
            },
            stickers: stickerIpfs.map((ipfs, index) => ({
              url: ipfsGatewayUrl(ipfs),
              ipfsHash: ipfs,
              type: result.stickers[index].type,
              size: result.stickers[index].size,
              format: result.stickers[index].format,
            })),
            metadata: {
              style: result.style,
              timestamp: result.timestamp,
              stickerCount: result.stickers.length,
            },
          },
        });
      } catch (error) {
        console.error("[BitmojiRoute] Error:", error);
        
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ 
            error: "Validation error", 
            details: error.errors 
          });
        }

        const message = error instanceof Error ? error.message : "Unknown error";
        return reply.code(500).send({ 
          error: "Failed to generate bitmoji",
          message,
        });
      }
    }
  );

  // POST /users/me/bitmoji/couple
  fastify.post(
    "/me/bitmoji/couple",
    {
      preHandler: fastify.authenticate,
    },
    async (req, reply) => {
      try {
        // Parse multipart form data with multiple files
        const parts = req.parts();
        let photo1Buffer: Buffer | null = null;
        let photo2Buffer: Buffer | null = null;
        const options: any = {};

        for await (const part of parts) {
          if (part.type === "file") {
            if (!ALLOWED_MIME.has(part.mimetype)) {
              return reply.code(400).send({ 
                error: "Invalid file type. Allowed: JPEG, PNG, WebP" 
              });
            }
            if (part.fieldname === "photo1") {
              photo1Buffer = await part.toBuffer();
            } else if (part.fieldname === "photo2") {
              photo2Buffer = await part.toBuffer();
            }
          } else if (part.type === "field") {
            options[part.fieldname] = part.value;
          }
        }

        if (!photo1Buffer || !photo2Buffer) {
          return reply.code(400).send({ 
            error: "Both photo1 and photo2 are required" 
          });
        }

        // Parse and validate options
        const parsedOptions = coupleBitmojiSchema.parse(options);

        if (!validateBitmojiOptions(parsedOptions)) {
          return reply.code(400).send({ error: "Invalid options" });
        }

        // Generate couple bitmoji
        const result = await generateCoupleBitmoji(
          photo1Buffer,
          photo2Buffer,
          { ...parsedOptions, photo2: photo2Buffer }
        );

        // Upload to IPFS
        const avatar1Ipfs = await uploadToIPFS(
          result.avatar1.avatar.buffer,
          `avatar1-${Date.now()}.png`,
          "image/png"
        );
        const avatar2Ipfs = await uploadToIPFS(
          result.avatar2.avatar.buffer,
          `avatar2-${Date.now()}.png`,
          "image/png"
        );
        const sticker1Ipfs = await Promise.all(
          result.avatar1.stickers.map((s, i) => 
            uploadToIPFS(
              s.buffer,
              `sticker1-${result.avatar1.stickers[i].type}-${Date.now()}.png`,
              "image/png"
            )
          )
        );
        const sticker2Ipfs = await Promise.all(
          result.avatar2.stickers.map((s, i) => 
            uploadToIPFS(
              s.buffer,
              `sticker2-${result.avatar2.stickers[i].type}-${Date.now()}.png`,
              "image/png"
            )
          )
        );
        const coupleStickerIpfs = await Promise.all(
          result.coupleStickers.map((s, i) => 
            uploadToIPFS(
              s.buffer,
              `couple-${result.coupleStickers[i].type}-${Date.now()}.png`,
              "image/png"
            )
          )
        );

        // Return response
        return reply.send({
          success: true,
          data: {
            avatar1: {
              url: ipfsGatewayUrl(avatar1Ipfs),
              ipfsHash: avatar1Ipfs,
              size: result.avatar1.avatar.size,
              format: result.avatar1.avatar.format,
              features: result.avatar1.features,
            },
            avatar2: {
              url: ipfsGatewayUrl(avatar2Ipfs),
              ipfsHash: avatar2Ipfs,
              size: result.avatar2.avatar.size,
              format: result.avatar2.avatar.format,
              features: result.avatar2.features,
            },
            stickers: {
              avatar1: sticker1Ipfs.map((ipfs, index) => ({
                url: ipfsGatewayUrl(ipfs),
                ipfsHash: ipfs,
                type: result.avatar1.stickers[index].type,
              })),
              avatar2: sticker2Ipfs.map((ipfs, index) => ({
                url: ipfsGatewayUrl(ipfs),
                ipfsHash: ipfs,
                type: result.avatar2.stickers[index].type,
              })),
              couple: coupleStickerIpfs.map((ipfs, index) => ({
                url: ipfsGatewayUrl(ipfs),
                ipfsHash: ipfs,
                type: result.coupleStickers[index].type,
              })),
            },
            metadata: {
              bonded: result.bonded,
              timestamp: result.timestamp,
            },
          },
        });
      } catch (error) {
        console.error("[BitmojiRoute] Couple error:", error);
        
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ 
            error: "Validation error", 
            details: error.errors 
          });
        }

        const message = error instanceof Error ? error.message : "Unknown error";
        return reply.code(500).send({ 
          error: "Failed to generate couple bitmoji",
          message,
        });
      }
    }
  );

  // GET /users/me/bitmoji/styles
  fastify.get(
    "/me/bitmoji/styles",
    {
      preHandler: fastify.authenticate,
    },
    async (req, reply) => {
      return reply.send({
        success: true,
        data: {
          styles: [
            {
              id: "avataaars",
              name: "Avataaars",
              description: "Classic Bitmoji-style cartoon avatar",
            },
            {
              id: "lorelei",
              name: "Lorelei",
              description: "Elegant feminine avatar with soft features",
            },
            {
              id: "notionists",
              name: "Notionists",
              description: "Professional minimal avatar",
            },
            {
              id: "big-smile",
              name: "Big Smile",
              description: "Expressive friendly avatar with big smile",
            },
          ],
        },
      });
    }
  );
};

export default bitmojiRoutes;
