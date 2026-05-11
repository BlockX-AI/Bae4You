import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ImageComposer } from "../services/image-composer";
import fastifyStatic from "@fastify/static";
import path from "path";

export default async function imagesRoutes(fastify: FastifyInstance) {
  // Serve static images
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, "../../public"),
    prefix: "/images/",
  });

  // Generate profile image - /images/profile/:tokenId.png
  fastify.get<{ Params: { tokenId: string } }>(
    "/images/profile/:tokenId.png",
    async (request: FastifyRequest<{ Params: { tokenId: string } }>, reply: FastifyReply) => {
      const { tokenId } = request.params;
      
      try {
        // TODO: Fetch user photo URL from database based on tokenId
        // For now, use a placeholder
        const userPhotoUrl = undefined; // Will use default avatar
        
        const imageBuffer = await ImageComposer.getProfilePhoto(userPhotoUrl);
        
        reply.header("Content-Type", "image/png");
        reply.header("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
        return reply.send(imageBuffer);
      } catch (error) {
        reply.code(500).send({ error: "Failed to generate profile image" });
      }
    }
  );

  // Generate hero card image - /images/cards/:rarity/:tokenId.png
  fastify.get<{ Params: { rarity: string; tokenId: string } }>(
    "/images/cards/:rarity/:tokenId.png",
    async (request: FastifyRequest<{ Params: { rarity: string; tokenId: string } }>, reply: FastifyReply) => {
      const { rarity, tokenId } = request.params;
      
      try {
        // Validate rarity
        const validRarities = ["common", "rare", "epic", "legend"];
        if (!validRarities.includes(rarity.toLowerCase())) {
          return reply.code(400).send({ error: "Invalid rarity" });
        }

        // TODO: Fetch hero photo URL from database based on tokenId
        // For now, use a placeholder
        const userPhotoUrl = "https://via.placeholder.com/400"; // Placeholder
        
        const framePath = ImageComposer.getFramePath(rarity);
        const imageBuffer = await ImageComposer.composeCard({
          userPhotoUrl,
          framePath,
        });
        
        reply.header("Content-Type", "image/png");
        reply.header("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
        return reply.send(imageBuffer);
      } catch (error) {
        reply.code(500).send({ error: "Failed to generate card image" });
      }
    }
  );

  // Generate couple card image - /images/couples/:tokenId.png
  fastify.get<{ Params: { tokenId: string } }>(
    "/images/couples/:tokenId.png",
    async (request: FastifyRequest<{ Params: { tokenId: string } }>, reply: FastifyReply) => {
      const { tokenId } = request.params;
      
      try {
        // TODO: Fetch couple photo URLs from database based on tokenId
        // For now, use placeholders
        const user1PhotoUrl = "https://via.placeholder.com/200";
        const user2PhotoUrl = "https://via.placeholder.com/200";
        
        const framePath = ImageComposer.getCoupleFramePath();
        const imageBuffer = await ImageComposer.composeCoupleCard({
          user1PhotoUrl,
          user2PhotoUrl,
          framePath,
        });
        
        reply.header("Content-Type", "image/png");
        reply.header("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
        return reply.send(imageBuffer);
      } catch (error) {
        reply.code(500).send({ error: "Failed to generate couple card image" });
      }
    }
  );
}
