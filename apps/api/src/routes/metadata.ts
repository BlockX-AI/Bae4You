import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ImageComposer } from "../services/image-composer";
import { db } from "../db/client";
import { ipfsGatewayUrl } from "../services/ipfs";

export default async function metadataRoutes(fastify: FastifyInstance) {
  // Profile NFT metadata - /metadata/:tokenId.json
  fastify.get<{ Params: { tokenId: string } }>(
    "/metadata/:tokenId.json",
    async (request: FastifyRequest<{ Params: { tokenId: string } }>, reply: FastifyReply) => {
      const { tokenId } = request.params;
      const tid = parseInt(tokenId);
      if (isNaN(tid)) return reply.code(400).send({ error: "Invalid tokenId" });

      try {
        const { rows } = await db.query(
          `SELECT username, display_name, bio, ai_art_ipfs_hash, avatar_ipfs_hash,
                  is_verified, is_creator, location_city, country_code, created_at
           FROM users WHERE token_id = $1`,
          [tid]
        );

        const user = rows[0];

        // Prefer AI-generated Spider-Verse art → fallback to regular avatar → fallback to generated image
        let imageUrl: string;
        if (user?.ai_art_ipfs_hash) {
          imageUrl = ipfsGatewayUrl(user.ai_art_ipfs_hash);
        } else if (user?.avatar_ipfs_hash) {
          imageUrl = ipfsGatewayUrl(user.avatar_ipfs_hash);
        } else {
          imageUrl = `https://api.bae4u.com/images/profile/${tokenId}.png`;
        }

        const attributes: Array<{ trait_type: string; value: string | boolean | number }> = [
          { trait_type: "Type",       value: "Bae Profile" },
          { trait_type: "Token ID",   value: tid },
          { trait_type: "Art Style",  value: user?.ai_art_ipfs_hash ? "Spider-Verse AI Art" : "Photo" },
        ];

        if (user?.is_verified)  attributes.push({ trait_type: "Verified",  value: true });
        if (user?.is_creator)   attributes.push({ trait_type: "Creator",   value: true });
        if (user?.location_city) attributes.push({ trait_type: "City",     value: user.location_city });
        if (user?.country_code)  attributes.push({ trait_type: "Country",  value: user.country_code });

        const metadata = {
          name:        user?.display_name ? `${user.display_name} #${tokenId}` : `Bae Profile #${tokenId}`,
          description: user?.bio ?? "A Bae4U profile NFT — tradeable social identity on Base.",
          image:       imageUrl,
          external_url: `https://bae4u.com/profile/${tokenId}`,
          attributes,
        };

        reply.header("Content-Type", "application/json");
        reply.header("Cache-Control", user?.ai_art_ipfs_hash ? "public, max-age=86400" : "public, max-age=300");
        return metadata;
      } catch (error) {
        reply.code(500).send({ error: "Failed to generate metadata" });
      }
    }
  );

  // Hero Card metadata - /cards/:rarity/:tokenId.json
  fastify.get<{ Params: { rarity: string; tokenId: string } }>(
    "/cards/:rarity/:tokenId.json",
    async (request: FastifyRequest<{ Params: { rarity: string; tokenId: string } }>, reply: FastifyReply) => {
      const { rarity, tokenId } = request.params;
      
      try {
        // Validate rarity
        const validRarities = ["common", "rare", "epic", "legend"];
        if (!validRarities.includes(rarity.toLowerCase())) {
          return reply.code(400).send({ error: "Invalid rarity. Must be: common, rare, epic, or legend" });
        }

        // TODO: Fetch hero data from database based on tokenId
        // For now, return a placeholder
        const imageUrl = `https://api.bae4u.com/images/cards/${rarity}/${tokenId}.png`;
        
        const metadata = {
          name: `Bae Card #${tokenId}`,
          description: `A ${rarity} Bae Card featuring a top user`,
          image: imageUrl,
          attributes: [
            { trait_type: "Type", value: "Hero Card" },
            { trait_type: "Rarity", value: rarity },
            { trait_type: "Token ID", value: tokenId },
          ],
        };

        reply.header("Content-Type", "application/json");
        return metadata;
      } catch (error) {
        reply.code(500).send({ error: "Failed to generate metadata" });
      }
    }
  );

  // Badge metadata - /badges/:id
  fastify.get<{ Params: { id: string } }>(
    "/badges/:id",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const badgeId = parseInt(id);
      
      try {
        // Validate badge ID (1-5)
        if (isNaN(badgeId) || badgeId < 1 || badgeId > 5) {
          return reply.code(400).send({ error: "Invalid badge ID. Must be between 1 and 5" });
        }

        const badgeNames = ["Bronze", "Silver", "Gold", "Diamond", "Master"];
        const badgeName = badgeNames[badgeId - 1];
        const imageUrl = `https://api.bae4u.com/images/badges/badge-${badgeId}.png`;
        
        const metadata = {
          name: `${badgeName} Badge`,
          description: `Achievement badge for ${badgeName} tier ranking`,
          image: imageUrl,
          attributes: [
            { trait_type: "Type", value: "Badge" },
            { trait_type: "Tier", value: badgeName },
            { trait_type: "Level", value: badgeId },
          ],
        };

        reply.header("Content-Type", "application/json");
        return metadata;
      } catch (error) {
        reply.code(500).send({ error: "Failed to generate metadata" });
      }
    }
  );

  // Couple Card metadata - /couples/:tokenId.json
  fastify.get<{ Params: { tokenId: string } }>(
    "/couples/:tokenId.json",
    async (request: FastifyRequest<{ Params: { tokenId: string } }>, reply: FastifyReply) => {
      const { tokenId } = request.params;
      
      try {
        // TODO: Fetch couple data from database based on tokenId
        // For now, return a placeholder
        const imageUrl = `https://api.bae4u.com/images/couples/${tokenId}.png`;
        
        const metadata = {
          name: `Couple Card #${tokenId}`,
          description: "A romantic card featuring two partners",
          image: imageUrl,
          attributes: [
            { trait_type: "Type", value: "Couple Card" },
            { trait_type: "Token ID", value: tokenId },
          ],
        };

        reply.header("Content-Type", "application/json");
        return metadata;
      } catch (error) {
        reply.code(500).send({ error: "Failed to generate metadata" });
      }
    }
  );
}
