/**
 * Gen-Z Avatar API Routes - Simple Avatar Generation
 * 
 * Simple endpoint for generating Gen-Z Creator avatars with basic features.
 * 
 * @module routes/genz-avatar
 */

import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { generateAvatar, AvatarConfig } from "../services/avatar-generator";

const genzAvatarRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /genz-avatar/generate
  fastify.post("/genz-avatar/generate", async (req, reply) => {
    try {
      const body = z.object({
        gender: z.enum(["male", "female"]).default("male"),
        hair: z.enum(["short-neat", "messy-textured", "swept-back", "long-flowing"]).default("short-neat"),
        shirt: z.enum(["casual-t-shirt", "graphic-tee", "hoodie", "button-down-shirt"]).default("casual-t-shirt"),
        clothing: z.enum(["streetwear", "business-casual", "athletic-wear", "luxury-fashion"]).default("streetwear"),
        expression: z.enum(["friendly-smile", "confident-smirk", "serious-focused", "mysterious-cool"]).default("friendly-smile"),
        background: z.enum(["gradient-neon", "gradient-pastel", "solid-color", "abstract-art"]).default("gradient-neon"),
        lenses: z.enum(["none", "trendy-round-sunglasses", "aviator-sunglasses", "oversized-sunglasses"]).default("none"),
      }).parse(req.body);

      // Map to DiceBear colors
      const hairColorMap: Record<string, string> = {
        "short-neat": "0C0C0C",
        "messy-textured": "4A3728",
        "swept-back": "A52A2A",
        "long-flowing": "4A3728",
      };

      const skinColorMap: Record<string, string> = {
        "male": "E0AC69",
        "female": "F8D9CE",
      };

      const clothingMap: Record<string, string> = {
        "casual-t-shirt": "shirtCrewNeck",
        "graphic-tee": "graphicShirt",
        "hoodie": "hoodie",
        "button-down-shirt": "blazerAndShirt",
      };

      const mouthMap: Record<string, string> = {
        "friendly-smile": "smile",
        "confident-smirk": "smile",
        "serious-focused": "serious",
        "mysterious-cool": "default",
      };

      const topMap: Record<string, string> = {
        "short-neat": "shortWaved",
        "messy-textured": "shortWaved",
        "swept-back": "shortWaved",
        "long-flowing": "longButNotTooLong",
      };

      const glassesMap: Record<string, string> = {
        "trendy-round-sunglasses": "round",
        "aviator-sunglasses": "wayfarers",
        "oversized-sunglasses": "sunglasses",
      };

      const config: AvatarConfig = {
        style: "avataaars",
        gender: body.gender,
        hairColor: hairColorMap[body.hair],
        skinColor: skinColorMap[body.gender],
        eyeColor: "5C3317",
        clothing: clothingMap[body.shirt],
        mouth: mouthMap[body.expression],
        top: topMap[body.hair],
      };

      // Add glasses if specified
      if (body.lenses !== "none") {
        config.accessories = [glassesMap[body.lenses]];
      }

      // Generate avatar
      const result = await generateAvatar(config, { size: 512 });

      // Return as base64 data URL
      const base64 = `data:image/png;base64,${result.buffer.toString('base64')}`;

      return reply.send({
        success: true,
        data: {
          url: base64,
          config: body,
          prompt: `Gen-Z Creator avatar: ${body.gender}, ${body.hair} hair, ${body.shirt}, ${body.clothing}, ${body.expression}, ${body.background} background, ${body.lenses}`,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: "Validation error",
          details: error.errors,
        });
      }
      console.error("[GenZAvatar] Error:", error);
      return reply.code(500).send({
        success: false,
        error: "Failed to generate avatar",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // GET /genz-avatar/options
  fastify.get("/genz-avatar/options", async (req, reply) => {
    return reply.send({
      success: true,
      data: {
        gender: ["male", "female"],
        hair: [
          { value: "short-neat", label: "Short neat hair" },
          { value: "messy-textured", label: "Messy textured hair" },
          { value: "swept-back", label: "Swept back style" },
          { value: "long-flowing", label: "Long flowing hair" },
        ],
        shirt: [
          { value: "casual-t-shirt", label: "Casual t-shirt" },
          { value: "graphic-tee", label: "Graphic print t-shirt" },
          { value: "hoodie", label: "Comfortable hoodie" },
          { value: "button-down-shirt", label: "Button-down shirt" },
        ],
        clothing: [
          { value: "streetwear", label: "Trendy streetwear" },
          { value: "business-casual", label: "Business casual attire" },
          { value: "athletic-wear", label: "Athletic sportswear" },
          { value: "luxury-fashion", label: "High-end luxury fashion" },
        ],
        expression: [
          { value: "friendly-smile", label: "Friendly smile" },
          { value: "confident-smirk", label: "Confident smirk" },
          { value: "serious-focused", label: "Serious focused" },
          { value: "mysterious-cool", label: "Mysterious cool" },
        ],
        background: [
          { value: "gradient-neon", label: "Neon gradient background" },
          { value: "gradient-pastel", label: "Pastel gradient background" },
          { value: "solid-color", label: "Solid color background" },
          { value: "abstract-art", label: "Abstract art background" },
        ],
        lenses: [
          { value: "none", label: "No lenses" },
          { value: "trendy-round-sunglasses", label: "Trendy round sunglasses" },
          { value: "aviator-sunglasses", label: "Classic aviator sunglasses" },
          { value: "oversized-sunglasses", label: "Oversized modern sunglasses" },
        ],
      },
    });
  });
};

export default genzAvatarRoutes;
