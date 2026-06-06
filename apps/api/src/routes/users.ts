import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/client";
import type { JwtPayload } from "../plugins/auth";
import { uploadToIPFS, ipfsGatewayUrl } from "../services/ipfs";
import { registerPushToken, removePushToken } from "../services/push";
import { upsertPersonality } from "../services/pinecone-match";
import { selectBestKycFrame, normaliseKycFrame } from "../services/video-kyc";
import { generateHeroCard, tierFromVibe, type CardTier } from "../services/hero-card.service";
import { config } from "../config";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const pushTokenSchema = z.object({
  token:    z.string().min(1),
  platform: z.enum(["ios", "android", "web"]),
});

const updateSchema = z.object({
  username:    z.string().min(3).max(50).optional(),
  displayName: z.string().min(1).max(100).optional(),
  bio:         z.string().max(500).optional(),
  birthDate:   z.string().optional(),
  locationCity: z.string().max(100).optional(),
  countryCode: z.string().length(2).optional(),
  personalityVector: z.record(z.unknown()).optional(),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================================
// Cloudflare AI Avatar Generation Helpers
// ============================================================================

const STYLE_PROMPTS: Record<string, { positive: string; negative: string }> = {
  "gen-z-creator": {
    positive: "ultra stylish Gen-Z digital creator avatar, confident young influencer, sharp jawline, expressive eyes with subtle catchlights, trendy streetwear, luxury casual aesthetic, clean skin texture, modern social media profile picture, vibrant neon gradient background, cinematic rim lighting, soft glow effects, highly detailed face, symmetrical composition, centered portrait, face occupying 75% of frame, Instagram influencer aesthetic, TikTok creator vibe, modern digital art, premium branding, trending internet personality, vibrant colors, ultra sharp focus, masterpiece quality, highly detailed, social media avatar, professional creator identity, clean background, eye contact with viewer",
    negative: "blurry, low quality, extra fingers, extra eyes, watermark, logo, text, ugly face, deformed anatomy, old fashioned clothing, dark shadows, low contrast, grainy, horror, creepy, dull colors, photobomb, multiple people"
  },
  "notion-style": {
    positive: "professional minimalist avatar, clean geometric design, soft pastel color palette, elegant simplicity, modern corporate aesthetic, friendly but professional expression, crisp lines, flat design style, subtle gradients, centered composition, high contrast, clean background, minimalist portrait, business professional, tech startup founder vibe, modern flat illustration, vector art style, sophisticated color scheme, soft shadows, balanced composition, eye contact, approachable yet professional, clean lines, geometric shapes, premium minimalist design, Notion app aesthetic, productivity tool inspired",
    negative: "realistic photo, photorealistic, messy, cluttered, dark colors, aggressive, angry expression, complex patterns, noise, grain, low resolution, cartoonish, childish, neon colors, chaotic, asymmetrical, distorted, 3D render"
  },
  "bitmoji-style": {
    positive: "expressive cartoon avatar, bitmoji style, friendly smile, vibrant colors, clean vector illustration, rounded features, expressive eyes, cartoon aesthetic, playful design, modern cartoon style, bold outlines, flat colors, cheerful expression, stylized portrait, cartoon character design, friendly approachable look, bright color palette, clean lines, animated style, social media cartoon avatar, fun personality, expressive facial features, cartoon illustration, vector art, bold colors, clean design, Snapchat bitmoji inspired, emoji style avatar",
    negative: "realistic, photorealistic, 3D render, dark, gloomy, scary, creepy, distorted proportions, messy lines, low quality, blurry, watercolor, oil painting, realistic photo, hyperrealistic, uncanny valley, anime style"
  },
  "lorelei-style": {
    positive: "elegant feminine avatar, soft delicate features, graceful expression, flowing hair, sophisticated style, pastel color palette, soft lighting, romantic aesthetic, feminine beauty, gentle smile, elegant portrait, refined design, soft gradients, delicate lines, graceful composition, modern feminine illustration, elegant fashion sense, soft focus, dreamy atmosphere, sophisticated color scheme, feminine charm, gentle curves, soft shadows, premium elegant design, refined beauty, graceful pose, romantic illustration style",
    negative: "masculine features, harsh lines, dark colors, aggressive expression, cartoonish, childish, low quality, blurry, distorted, masculine, rough, gritty, dark shadows, harsh lighting, unrefined, realistic photo"
  },
  "big-smile": {
    positive: "warm friendly avatar, big genuine smile, approachable personality, bright cheerful expression, warm color palette, happy vibes, friendly face, welcoming presence, warm lighting, joyful expression, approachable design, cheerful portrait, friendly character, warm colors, soft lighting, inviting atmosphere, big smile, happy mood, warm welcome, friendly illustration, cheerful design, approachable aesthetic, warm welcome, happy vibes, friendly personality, contagious happiness, optimistic expression",
    negative: "angry, sad, serious, stoic, cold, distant, unfriendly, dark colors, harsh expression, cold vibes, unapproachable, gloomy, serious, stern, cold colors, distant, unwelcoming, frowning, melancholic"
  },
  "cyberpunk": {
    positive: "futuristic cyberpunk avatar, neon colors, tech aesthetic, digital art style, glowing elements, cybernetic features, futuristic fashion, neon lighting, tech-savvy vibe, digital portrait, cyberpunk aesthetic, vibrant neon colors, glowing effects, futuristic design, tech-inspired, cybernetic enhancements, neon glow, digital art, cyberpunk style, futuristic technology, neon accents, tech fashion, cyber design, glowing features, futuristic portrait, sci-fi aesthetic, cybernetic implants, holographic effects",
    negative: "vintage, retro, old-fashioned, natural, organic, muted colors, traditional, rustic, natural lighting, earth tones, non-tech, traditional style, old world, classical, natural aesthetic, steampunk, dieselpunk"
  },
  "luxury-fashion": {
    positive: "luxury fashion avatar, high-end style, sophisticated elegance, premium aesthetic, designer fashion, refined taste, luxury brand vibe, elegant clothing, sophisticated expression, premium design, high-fashion aesthetic, luxury portrait, refined style, elegant fashion, premium quality, sophisticated color palette, luxury design, high-end fashion, elegant pose, refined aesthetic, premium luxury, sophisticated beauty, fashion-forward, luxury brand aesthetic, Vogue magazine style, runway model inspired, haute couture",
    negative: "casual, streetwear, cheap, low quality, basic, simple, budget, mass market, ordinary, plain, unsophisticated, basic design, low-end, cheap materials, fast fashion, athletic wear, sloppy"
  },
  "anime-style": {
    positive: "anime style avatar, manga aesthetic, vibrant colors, expressive anime eyes, anime character design, Japanese animation style, vibrant hair, anime portrait, manga illustration, anime art style, expressive features, vibrant color palette, anime character, manga style, Japanese anime aesthetic, anime illustration, vibrant anime design, expressive anime face, anime character portrait, manga art, anime style illustration, vibrant anime colors, shonen anime style, kawaii aesthetic, anime protagonist vibe",
    negative: "realistic, photorealistic, western cartoon, 3D render, realistic photo, western style, non-anime, realistic art, photorealistic, western animation, disney style, pixar style, chibi style"
  },
  "3d-cartoon": {
    positive: "3D cartoon avatar, Pixar style animation character, cute rounded features, expressive big eyes, friendly smile, vibrant saturated colors, soft lighting, smooth shading, stylized 3D render, playful personality, approachable design, modern CGI animation style, clean 3D modeling, cartoon proportions, cheerful expression, Disney Pixar inspired, animated movie character, friendly cartoon 3D, premium 3D render quality, smooth textures, subsurface scattering, warm color palette",
    negative: "realistic photo, photorealistic, 2D flat, dark, gloomy, scary, creepy, distorted, low poly, wireframe, sketchy, unfinished, grainy, horror, uncanny valley, adult content"
  },
  "professional-headshot": {
    positive: "professional headshot avatar, LinkedIn profile style, clean business portrait, confident expression, professional lighting, studio photography aesthetic, sharp focus, neutral background, corporate professional, trustworthy appearance, modern business portrait, high quality photography, executive portrait, professional demeanor, clean skin, well-groomed appearance, corporate headshot, business professional, modern professional photography, premium portrait quality",
    negative: "cartoon, illustration, anime, 3D render, casual, messy, dark, poor lighting, blurry, low quality, unprofessional, party photo, vacation photo, candid, informal, sloppy"
  },
  "retro-90s": {
    positive: "retro 90s aesthetic avatar, vintage 90s style, nostalgic vibe, VHS aesthetic, grainy texture, vibrant 90s colors, retro fashion, 90s pop culture inspired, nostalgic portrait, vintage cartoon style, 90s sitcom vibe, retro digital art, nostalgic color palette, throwback aesthetic, 90s cool kid vibe, retro gaming inspired, vintage cool, 90s nostalgia, Saved by the Bell style, Fresh Prince aesthetic",
    negative: "modern, futuristic, cyberpunk, clean, minimalist, realistic photo, photorealistic, high definition, sharp, digital, contemporary, sleek"
  }
};

function getPromptForStyle(style: string): string {
  return STYLE_PROMPTS[style]?.positive || STYLE_PROMPTS["gen-z-creator"].positive;
}

function getNegativePromptForStyle(style: string): string {
  return STYLE_PROMPTS[style]?.negative || STYLE_PROMPTS["gen-z-creator"].negative;
}

async function generateAvatarWithCloudflare(
  imageBuffer: Buffer,
  prompt: string,
  negativePrompt: string,
  accountId: string,
  apiToken: string
): Promise<Buffer> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: Array.from(imageBuffer),
        prompt,
        negative_prompt: negativePrompt,
        num_steps: 30,
        strength: 0.7,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cloudflare AI failed: ${error}`);
  }

  const result = await response.json() as { result: { image: number[] } };
  const imageBytes = new Uint8Array(result.result.image);
  return Buffer.from(imageBytes);
}

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /users/me
  fastify.get(
    "/me",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { rows } = await db.query(
        `SELECT id, wallet_address, token_id, username, display_name, bio,
                avatar_ipfs_hash, birth_date, location_city, country_code,
                is_verified, is_creator, status, last_login_at, bonus_claimed_at,
                personality_vector, created_at
         FROM users WHERE id = $1`,
        [payload.userId]
      );
      if (!rows[0]) return reply.code(404).send({ error: "User not found" });
      return rows[0];
    }
  );

  // GET /users/:id
  fastify.get<{ Params: { id: string } }>(
    "/:id",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const { id } = req.params;
      if (!UUID_RE.test(id)) return reply.code(400).send({ error: "Invalid user id" });
      const { rows } = await db.query(
        `SELECT id, wallet_address, token_id, username, display_name, bio,
                avatar_ipfs_hash, birth_date, location_city, country_code,
                is_verified, is_creator, status, created_at
         FROM users WHERE id = $1 AND status != 'suspended'`,
        [id]
      );
      if (!rows[0]) return reply.code(404).send({ error: "User not found" });
      return rows[0];
    }
  );

  // PUT /users/me — update own profile
  fastify.put(
    "/me",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const parsed  = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }

      const data = parsed.data;
      const updates: string[] = [];
      const values: unknown[] = [];
      let i = 1;

      if (data.username !== undefined)         { updates.push(`username = $${i++}`);           values.push(data.username); }
      if (data.displayName !== undefined)       { updates.push(`display_name = $${i++}`);       values.push(data.displayName); }
      if (data.bio !== undefined)               { updates.push(`bio = $${i++}`);                values.push(data.bio); }
      if (data.birthDate !== undefined)         { updates.push(`birth_date = $${i++}`);         values.push(data.birthDate); }
      if (data.locationCity !== undefined)      { updates.push(`location_city = $${i++}`);      values.push(data.locationCity); }
      if (data.countryCode !== undefined)       { updates.push(`country_code = $${i++}`);       values.push(data.countryCode); }
      if (data.personalityVector !== undefined) { updates.push(`personality_vector = $${i++}`); values.push(JSON.stringify(data.personalityVector)); }

      if (updates.length === 0) {
        return reply.code(400).send({ error: "Nothing to update" });
      }

      values.push(payload.userId);
      let rows: Record<string, unknown>[];
      try {
        const result = await db.query(
          `UPDATE users SET ${updates.join(", ")} WHERE id = $${i} RETURNING id, username, display_name, bio`,
          values
        );
        rows = result.rows;
      } catch (err: unknown) {
        const pgErr = err as { code?: string; constraint?: string };
        if (pgErr.code === "23505") {
          if (pgErr.constraint?.includes("username")) {
            return reply.code(409).send({ error: "Username already taken" });
          }
          return reply.code(409).send({ error: "Conflict: duplicate value" });
        }
        throw err;
      }

      if (data.personalityVector) {
        upsertPersonality(payload.userId, data.personalityVector as Record<string, number>).catch((err) => {
          req.log.warn({ err }, "Failed to upsert personality vector");
        });
      }

      return rows[0];
    }
  );

  // POST /users/me/avatar — multipart image upload → Pinata IPFS
  fastify.post(
    "/me/avatar",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;

      const file = await req.file();
      if (!file) return reply.code(400).send({ error: "No file provided" });

      const mime = file.mimetype;
      if (!ALLOWED_MIME.has(mime)) {
        return reply.code(415).send({ error: "Only JPEG, PNG, and WebP images are accepted" });
      }

      const chunks: Buffer[] = [];
      for await (const chunk of file.file) {
        chunks.push(chunk as Buffer);
      }
      const buffer = Buffer.concat(chunks);

      if (buffer.length > 5 * 1024 * 1024) {
        return reply.code(413).send({ error: "File exceeds 5 MB limit" });
      }

      const ext  = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      const name = `avatar-${payload.userId}-${Date.now()}.${ext}`;

      let cid: string;
      try {
        cid = await uploadToIPFS(buffer, name, mime);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        return reply.code(502).send({ error: msg });
      }

      await db.query(
        "UPDATE users SET avatar_ipfs_hash = $1 WHERE id = $2",
        [cid, payload.userId]
      );

      return { cid, url: ipfsGatewayUrl(cid) };
    }
  );

  // POST /users/me/avatar/kyc-frames
  // ─────────────────────────────────────────────────────────────────────────
  // Video KYC avatar generation using Cloudflare AI.
  // The mobile app sends 1-5 photo frames captured during the KYC countdown.
  // The server picks the sharpest, most face-visible frame, then generates a
  // high-quality avatar using Cloudflare Workers AI (Stable Diffusion XL).
  //
  // Multipart fields:
  //   frame0…frame4  image/jpeg or image/png   (at least one required)
  //   style          "gen-z-creator" | "notion-style" | "bitmoji-style" | "lorelei-style" | "big-smile" | "cyberpunk" | "luxury-fashion" | "anime-style" (optional, default: gen-z-creator)
  //   customPrompt   string (optional - overrides style prompt)
  //   negativePrompt string (optional - overrides default negative prompt)
  fastify.post(
    "/me/avatar/kyc-frames",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;

      const parts = req.parts();
      const frames: Buffer[] = [];
      let style: string = "gen-z-creator";
      let customPrompt: string | undefined;
      let negativePrompt: string | undefined;

      const VALID_STYLES = ["gen-z-creator", "notion-style", "bitmoji-style", "lorelei-style", "big-smile", "cyberpunk", "luxury-fashion", "anime-style", "3d-cartoon", "professional-headshot", "retro-90s"];

      for await (const part of parts) {
        if (part.type === "file" && part.fieldname.startsWith("frame")) {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) chunks.push(chunk as Buffer);
          frames.push(Buffer.concat(chunks));
        } else if (part.type === "field" && part.fieldname === "style") {
          const val = (part as { value: string }).value;
          if (VALID_STYLES.includes(val)) style = val;
        } else if (part.type === "field" && part.fieldname === "customPrompt") {
          customPrompt = (part as { value: string }).value;
        } else if (part.type === "field" && part.fieldname === "negativePrompt") {
          negativePrompt = (part as { value: string }).value;
        }
      }

      if (frames.length === 0) {
        return reply.code(400).send({ error: "Send at least one frame field (frame0…frame4)" });
      }

      // ── Rate limit: 50 avatar generations per user per day ─
      const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
      const rateKey = `avatar_rate:${payload.userId}:${today}`;
      const DAILY_LIMIT = 50;
      const currentCount = await fastify.redis.incr(rateKey);
      if (currentCount === 1) await fastify.redis.expire(rateKey, 86400); // expires in 24h
      if (currentCount > DAILY_LIMIT) {
        return reply.code(429).send({
          error: `Daily avatar limit reached (${DAILY_LIMIT}/day). Try again tomorrow.`,
          retryAfter: "24h",
        });
      }

      // Select best frame
      const { bestFrame, scores } = await selectBestKycFrame(frames);
      const normalisedFrame = await normaliseKycFrame(bestFrame);

      // Cloudflare AI generation
      try {
        const cfAccountId = config.CLOUDFLARE_ACCOUNT_ID;
        const cfApiToken = config.CLOUDFLARE_API_TOKEN;

        if (!cfAccountId || !cfApiToken) {
          return reply.code(500).send({ error: "Cloudflare AI credentials not configured" });
        }

        // Get prompt for selected style
        const prompt = customPrompt || getPromptForStyle(style);
        const negPrompt = negativePrompt || getNegativePromptForStyle(style);

        // Generate avatar using Cloudflare AI
        const aiBuffer = await generateAvatarWithCloudflare(normalisedFrame, prompt, negPrompt, cfAccountId, cfApiToken);

        // Upload to IPFS
        const cid = await uploadToIPFS(aiBuffer, `kyc-avatar-${payload.userId}-${Date.now()}.png`, "image/png");
        const url = ipfsGatewayUrl(cid);

        // Update user avatar
        await db.query(
          `UPDATE users SET avatar_ipfs_hash = $1 WHERE id = $2`,
          [cid, payload.userId]
        );

        return reply.send({
          success: true,
          data: {
            url,
            ipfsHash: cid,
            style,
            prompt,
            bestFrameIndex: scores[0].index,
            frameScores: scores,
            timestamp: Date.now(),
          },
        });
      } catch (err: unknown) {
        req.log.error({ err }, "Cloudflare AI avatar generation failed");
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        return reply.code(500).send({
          error: "Avatar generation failed",
          message: errorMsg,
        });
      }
    }
  );

  // POST /users/me/avatar/edit — regenerate avatar with new style or custom prompt
  // ─────────────────────────────────────────────────────────────────────────
  // Edit existing avatar by regenerating with different style or custom prompt
  //
  // Request body:
  //   style          string (optional) - new style to apply
  //   customPrompt   string (optional) - custom prompt override
  //   negativePrompt string (optional) - custom negative prompt override
  fastify.post(
    "/me/avatar/edit",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const body = req.body as {
        style?: string;
        customPrompt?: string;
        negativePrompt?: string;
      };

      // Fetch current avatar from database
      const { rows } = await db.query(
        `SELECT avatar_ipfs_hash FROM users WHERE id = $1`,
        [payload.userId]
      );

      if (!rows[0] || !rows[0].avatar_ipfs_hash) {
        return reply.code(400).send({ error: "No existing avatar found. Generate one first." });
      }

      const currentAvatarHash = rows[0].avatar_ipfs_hash;

      // Fetch current avatar image from IPFS
      const avatarUrl = `https://gateway.pinata.cloud/ipfs/${currentAvatarHash}`;
      const avatarRes = await fetch(avatarUrl);
      if (!avatarRes.ok) {
        return reply.code(502).send({ error: "Failed to fetch current avatar from IPFS" });
      }
      const avatarBuffer = Buffer.from(await avatarRes.arrayBuffer());

      // Rate limit: 50 edits per day
      const today = new Date().toISOString().slice(0, 10);
      const rateKey = `avatar_edit_rate:${payload.userId}:${today}`;
      const DAILY_LIMIT = 50;
      const currentCount = await fastify.redis.incr(rateKey);
      if (currentCount === 1) await fastify.redis.expire(rateKey, 86400);
      if (currentCount > DAILY_LIMIT) {
        return reply.code(429).send({
          error: `Daily edit limit reached (${DAILY_LIMIT}/day). Try again tomorrow.`,
          retryAfter: "24h",
        });
      }

      // Get style or use custom prompt
      const style = body.style || "gen-z-creator";
      const VALID_STYLES = ["gen-z-creator", "notion-style", "bitmoji-style", "lorelei-style", "big-smile", "cyberpunk", "luxury-fashion", "anime-style", "3d-cartoon", "professional-headshot", "retro-90s"];
      
      if (!VALID_STYLES.includes(style) && !body.customPrompt) {
        return reply.code(400).send({ error: "Invalid style" });
      }

      const prompt = body.customPrompt || getPromptForStyle(style);
      const negPrompt = body.negativePrompt || getNegativePromptForStyle(style);

      // Generate new avatar using Cloudflare AI
      try {
        const cfAccountId = config.CLOUDFLARE_ACCOUNT_ID;
        const cfApiToken = config.CLOUDFLARE_API_TOKEN;

        if (!cfAccountId || !cfApiToken) {
          return reply.code(500).send({ error: "Cloudflare AI credentials not configured" });
        }

        const aiBuffer = await generateAvatarWithCloudflare(avatarBuffer, prompt, negPrompt, cfAccountId, cfApiToken);

        // Upload to IPFS
        const cid = await uploadToIPFS(aiBuffer, `edited-avatar-${payload.userId}-${Date.now()}.png`, "image/png");
        const url = ipfsGatewayUrl(cid);

        // Update user avatar
        await db.query(
          `UPDATE users SET avatar_ipfs_hash = $1 WHERE id = $2`,
          [cid, payload.userId]
        );

        return reply.send({
          success: true,
          data: {
            url,
            ipfsHash: cid,
            style,
            prompt,
            timestamp: Date.now(),
            previousAvatar: currentAvatarHash,
            dailyQuota: { used: currentCount, limit: DAILY_LIMIT, remaining: DAILY_LIMIT - currentCount },
          },
        });
      } catch (err: unknown) {
        req.log.error({ err }, "Cloudflare AI avatar edit failed");
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        return reply.code(500).send({
          error: "Avatar edit failed",
          message: errorMsg,
        });
      }
    }
  );

  // POST /users/me/push-token — register Expo push token
  fastify.post(
    "/me/push-token",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const parsed  = pushTokenSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
      await registerPushToken(payload.userId, parsed.data.token, parsed.data.platform);
      return reply.code(204).send();
    }
  );

  // DELETE /users/me/push-token — deregister on logout
  fastify.delete(
    "/me/push-token",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { token } = req.body as { token?: string };
      if (!token) return reply.code(400).send({ error: "token required" });
      await removePushToken(payload.userId, token);
      return reply.code(204).send();
    }
  );

  // POST /users/me/hero-card — generate personalized hero card from stored KYC avatar
  fastify.post(
    "/me/hero-card",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const body = req.body as {
        tier?: CardTier;
        name?: string;
        city?: string;
        age?: number;
        vibe?: number;
        rizz?: number;
        drip?: number;
        aura?: number;
        badges?: string[];
      };

      // Fetch user profile + stored avatar from DB
      const { rows } = await db.query(
        `SELECT display_name, location_city, birth_date, avatar_ipfs_hash FROM users WHERE id = $1`,
        [payload.userId]
      );
      if (!rows[0]) return reply.code(404).send({ error: "User not found" });

      const user = rows[0];
      const vibeScore = body.vibe ?? 72;
      const tier      = body.tier ?? tierFromVibe(vibeScore);

      // Calculate age from birth_date
      const age = body.age ?? (user.birth_date 
        ? Math.floor((Date.now() - new Date(user.birth_date).getTime()) / 31557600000)
        : 21);

      // Fetch avatar image (from IPFS or direct URL)
      if (!user.avatar_ipfs_hash) {
        return reply.code(400).send({ error: "No KYC avatar found. Complete Video KYC first." });
      }

      const avatarUrl = `https://gateway.pinata.cloud/ipfs/${user.avatar_ipfs_hash}`;
      const avatarRes = await fetch(avatarUrl);
      if (!avatarRes.ok) return reply.code(502).send({ error: "Failed to fetch avatar from IPFS" });
      const avatarBuffer = Buffer.from(await avatarRes.arrayBuffer());

      // Get next card number from sequence
      const { rows: seqRows } = await db.query(`SELECT nextval('hero_card_number_seq') AS next_num`);
      const cardNumber = Number(seqRows[0]?.next_num ?? 1);

      // Generate the card
      const cardBuffer = await generateHeroCard({
        avatarBuffer,
        name:       body.name ?? user.display_name ?? "USER",
        city:       body.city ?? user.location_city ?? "INDIA",
        age,
        cardNumber,
        tier,
        vibe:       vibeScore,
        rizz:       body.rizz ?? Math.round(vibeScore * 0.97),
        drip:       body.drip ?? Math.round(vibeScore * 0.95),
        aura:       body.aura ?? Math.round(vibeScore * 0.92),
        badges:     body.badges ?? (vibeScore >= 95 ? ["OG MEMBER", "TOP 1%"] : []),
      });

      // Upload card to IPFS (uploadToIPFS returns the CID string directly)
      const ipfsHash = await uploadToIPFS(
        cardBuffer, `hero-card-${payload.userId}-${Date.now()}.png`, "image/png"
      );

      // Store in DB
      await db.query(
        `INSERT INTO hero_cards (user_id, card_number, tier, card_ipfs_hash, vibe_score, rizz_score, drip_score, aura_score, badges)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [payload.userId, cardNumber, tier, ipfsHash, vibeScore, 
         body.rizz ?? Math.round(vibeScore * 0.97),
         body.drip ?? Math.round(vibeScore * 0.95),
         body.aura ?? Math.round(vibeScore * 0.92),
         JSON.stringify(body.badges ?? (vibeScore >= 95 ? ["OG MEMBER", "TOP 1%"] : []))]
      ).catch((e) => {
        req.log.error({ err: e }, "Failed to store hero card");
      });

      return {
        cardUrl:    `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        ipfsHash,
        tier,
        cardNumber: String(cardNumber).padStart(4, "0"),
        vibe:       vibeScore,
      };
    }
  );

  // POST /users/avatar/prompt-lab — Gen-Z prompt playground
  // Accepts: { prompt, negativePrompt, model, style, steps, guidance }
  // Returns: { imageBase64, provider, prompt }
  fastify.post(
    "/avatar/prompt-lab",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const body = req.body as {
        prompt?:         string;
        negativePrompt?: string;
        model?:          "cloudflare" | "huggingface";
        style?:          string;
        gender?:         string;
        skinTone?:       string;
        hairColor?:      string;
        steps?:          number;
        guidance?:       number;
      };

      const prompt         = body.prompt?.trim() || "pop art comic book portrait, bold black ink outlines, halftone dot shading, bright golden yellow starburst rays, hot pink background, Roy Lichtenstein inspired, NFT avatar art, ultra high resolution, vibrant saturated colors";
      const negativePrompt = body.negativePrompt?.trim() || "photorealistic, photograph, blurry, watermark, ugly, bad anatomy, low quality, dark gloomy";
      const model          = body.model ?? "cloudflare";
      // Cloudflare SDXL-Lightning max steps = 20, HuggingFace FLUX can go higher
      const maxSteps       = model === "cloudflare" ? 20 : 50;
      const steps          = Math.min(Math.max(body.steps ?? 25, 1), maxSteps);
      const guidance       = Math.min(Math.max(body.guidance ?? 7.5, 1), 20);
      const width          = 1024;
      const height         = 1024;

      let imageBuffer: Buffer;
      let provider:    string;

      if (model === "cloudflare" && config.CLOUDFLARE_ACCOUNT_ID && config.CLOUDFLARE_API_TOKEN) {
        const cfModel = "@cf/bytedance/stable-diffusion-xl-lightning";
        const url = `https://api.cloudflare.com/client/v4/accounts/${config.CLOUDFLARE_ACCOUNT_ID}/ai/run/${cfModel}`;
        const resp = await fetch(url, {
          method:  "POST",
          headers: { "Authorization": `Bearer ${config.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, negative_prompt: negativePrompt, num_steps: steps, guidance, width, height }),
        });
        if (!resp.ok) {
          const err = await resp.text();
          return reply.code(502).send({ error: `Cloudflare AI error: ${err.slice(0, 200)}` });
        }
        imageBuffer = Buffer.from(await resp.arrayBuffer());
        provider = "cloudflare/sdxl-lightning";
      } else if (config.HUGGINGFACE_TOKEN) {
        const { HfInference } = await import("@huggingface/inference");
        const hf = new HfInference(config.HUGGINGFACE_TOKEN);
        const result = await hf.textToImage({
          model: "black-forest-labs/FLUX.1-schnell",
          inputs: prompt,
          parameters: { negative_prompt: negativePrompt, num_inference_steps: steps, guidance_scale: guidance, width, height },
        });
        imageBuffer = Buffer.from(await (result as unknown as Blob).arrayBuffer());
        provider = "huggingface/flux-schnell";
      } else {
        return reply.code(400).send({ error: "No AI provider configured. Set CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN or HUGGINGFACE_TOKEN." });
      }

      return {
        imageBase64: imageBuffer.toString("base64"),
        mimeType:    "image/png",
        provider,
        prompt,
        negativePrompt,
        model,
        steps,
        guidance,
      };
    }
  );

  // GET /users/by-wallet/:address
  fastify.get<{ Params: { address: string } }>(
    "/by-wallet/:address",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const { rows } = await db.query(
        `SELECT id, wallet_address, token_id, username, display_name, bio,
                avatar_ipfs_hash, is_verified, is_creator, created_at
         FROM users WHERE wallet_address = $1 AND status = 'active'`,
        [req.params.address.toLowerCase()]
      );
      if (!rows[0]) return reply.code(404).send({ error: "User not found" });
      return rows[0];
    }
  );
};

export default usersRoutes;
