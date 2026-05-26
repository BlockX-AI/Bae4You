import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/client";
import type { JwtPayload } from "../plugins/auth";
import { uploadToIPFS, ipfsGatewayUrl } from "../services/ipfs";
import { registerPushToken, removePushToken } from "../services/push";
import { upsertPersonality } from "../services/pinecone-match";
import { generateAiAvatar, generateAvatarInStyle, type AiAvatarResult, type FaceToManyStyle, type Gender } from "../services/ai-avatar";
import { selectBestKycFrame, normaliseKycFrame } from "../services/video-kyc";
import { generateBitmojiFromPhoto } from "../services/bitmoji-service";
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
        upsertPersonality(payload.userId, data.personalityVector as Record<string, number>).catch(() => {});
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

  // POST /users/me/avatar/ai-art — generate Spider-Verse style NFT portrait
  // Multipart: field "photo" (image file) + field "gender" (male|female|other)
  fastify.post(
    "/me/avatar/ai-art",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;

      if (!config.FAL_KEY && !config.HUGGINGFACE_TOKEN) {
        return reply.code(503).send({ error: "AI art generation not configured — set FAL_KEY or HUGGINGFACE_TOKEN" });
      }

      const parts = req.parts();
      let photoBuffer: Buffer | null = null;
      let photoMime   = "image/jpeg";
      let gender: Gender | undefined;

      for await (const part of parts) {
        if (part.type === "file" && part.fieldname === "photo") {
          if (!ALLOWED_MIME.has(part.mimetype)) {
            return reply.code(415).send({ error: "Only JPEG, PNG, and WebP images are accepted" });
          }
          photoMime = part.mimetype;
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) chunks.push(chunk as Buffer);
          photoBuffer = Buffer.concat(chunks);
          if (photoBuffer.length > 10 * 1024 * 1024) {
            return reply.code(413).send({ error: "File exceeds 10 MB limit" });
          }
        } else if (part.type === "field" && part.fieldname === "gender") {
          const val = (part.value as string).toLowerCase();
          if (val === "male" || val === "female" || val === "other") {
            gender = val as Gender;
          }
        }
      }

      if (!photoBuffer) {
        return reply.code(400).send({ error: "No photo provided — send multipart field 'photo'" });
      }

      let aiResult: Awaited<ReturnType<typeof generateAiAvatar>>;
      try {
        aiResult = await generateAiAvatar(photoBuffer, photoMime, gender, config.FAL_KEY, config.HUGGINGFACE_TOKEN, config.REPLICATE_TOKEN);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "AI generation failed";
        return reply.code(502).send({ error: msg });
      }

      const name = `ai-avatar-${payload.userId}-${Date.now()}.png`;
      let cid: string;
      try {
        cid = await uploadToIPFS(aiResult.buffer, name, "image/png");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "IPFS upload failed";
        return reply.code(502).send({ error: msg });
      }

      await db.query(
        "UPDATE users SET ai_art_ipfs_hash = $1 WHERE id = $2",
        [cid, payload.userId]
      );

      return {
        cid,
        url:      ipfsGatewayUrl(cid),
        gender:   aiResult.gender,
        traits:   aiResult.traits,
        seed:     aiResult.seed,
        prompt:   aiResult.prompt,
        provider: aiResult.provider,
      };
    }
  );

  // POST /users/me/avatar/kyc-frames
  // ─────────────────────────────────────────────────────────────────────────
  // Video KYC avatar generation.
  // The mobile app sends 1-5 photo frames captured during the KYC countdown.
  // The server picks the sharpest, most face-visible frame, then generates a
  // face-preserving NFT avatar via fofr/face-to-many (InstantID).
  //
  // Multipart fields:
  //   frame0…frame4  image/jpeg or image/png   (at least one required)
  //   gender         "male" | "female" | "other"  (optional hint)
  fastify.post(
    "/me/avatar/kyc-frames",
    { preHandler: fastify.authenticate },
    async (req, reply) => {
      const payload = req.user as JwtPayload;

      const parts = req.parts();
      const frames: Buffer[] = [];
      let gender: Gender | undefined;

      const VALID_STYLES: (FaceToManyStyle | "Bitmoji-Flat")[] = ["3D","Emoji","Video game","Pixels","Clay","Toy","LEGO","Anime","Claymation","Comic","Bitmoji-Flat"];
      let avatarStyle: FaceToManyStyle | "Bitmoji-Flat" | undefined;

      for await (const part of parts) {
        if (part.type === "file" && part.fieldname.startsWith("frame")) {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) chunks.push(chunk as Buffer);
          frames.push(Buffer.concat(chunks));
        } else if (part.type === "field" && part.fieldname === "gender") {
          const val = (part as { value: string }).value;
          if (val === "male" || val === "female" || val === "other") gender = val;
        } else if (part.type === "field" && part.fieldname === "style") {
          const val = (part as { value: string }).value as FaceToManyStyle | "Bitmoji-Flat";
          if (VALID_STYLES.includes(val)) avatarStyle = val;
        }
      }

      if (frames.length === 0) {
        return reply.code(400).send({ error: "Send at least one frame field (frame0…frame4)" });
      }

      // ── Rate limit: 50 avatar generations per user per day (internal testing) ─
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

      const { bestFrame, scores } = await selectBestKycFrame(frames);
      const normalisedFrame = await normaliseKycFrame(bestFrame);

      let aiBuffer:   Buffer;
      let aiProvider: string;
      let aiResult:   AiAvatarResult | null = null;
      try {
        if (avatarStyle === "Bitmoji-Flat") {
          // DiceBear flat-cartoon pipeline — no Replicate needed
          const bmGender = (gender === "male" || gender === "female") ? gender : undefined;
          const bm = await generateBitmojiFromPhoto(normalisedFrame, { style: "avataaars", gender: bmGender, generateStickers: false, avatarSize: 512 });
          aiBuffer   = bm.avatar.buffer;
          aiProvider = "dicebear/avataaars (bitmoji-flat)";
        } else if (avatarStyle) {
          const r = await generateAvatarInStyle(normalisedFrame, "image/jpeg", avatarStyle, config.REPLICATE_API_TOKEN, config.FAL_KEY, config.HUGGINGFACE_TOKEN, gender, config.CLOUDFLARE_ACCOUNT_ID, config.CLOUDFLARE_API_TOKEN);
          aiBuffer   = r.buffer;
          aiProvider = r.provider;
        } else {
          aiResult   = await generateAiAvatar(
            normalisedFrame, "image/jpeg", gender,
            config.FAL_KEY, config.HUGGINGFACE_TOKEN, config.REPLICATE_API_TOKEN,
          );
          aiBuffer   = aiResult.buffer;
          aiProvider = aiResult.provider;
        }
      } catch (err: unknown) {
        // All AI providers failed - return error message explaining payment/balance issues
        const errorMsg = err instanceof Error ? err.message : "AI generation failed";
        console.error("[avatar] AI generation failed:", errorMsg);
        return reply.code(502).send({
          error: `Avatar generation failed: ${errorMsg}. ` +
                 "Check that HUGGINGFACE_TOKEN is set in Railway environment variables.",
        });
      }

      const name = `kyc-avatar-${payload.userId}-${Date.now()}.png`;

      let cid: string | null = null;
      let avatarUrl: string;

      try {
        cid = await uploadToIPFS(aiBuffer, name, "image/png");
        avatarUrl = ipfsGatewayUrl(cid);
        await db.query(
          "UPDATE users SET ai_art_ipfs_hash = $1 WHERE id = $2",
          [cid, payload.userId]
        );
      } catch {
        // IPFS not configured or failed — return avatar as inline data URL so the
        // test page can still display it without PINATA set up
        avatarUrl = `data:image/png;base64,${aiBuffer.toString("base64")}`;
      }

      return {
        cid,
        url:          avatarUrl,
        framesReceived: frames.length,
        bestFrameIndex: scores[0].index,
        frameScores:  scores,
        style:        avatarStyle ?? null,
        gender:       aiResult?.gender,
        traits:       aiResult?.traits,
        provider:     aiProvider,
        prompt:       aiResult?.prompt,
        dailyQuota:   { used: currentCount, limit: DAILY_LIMIT, remaining: DAILY_LIMIT - currentCount },
      };
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
        console.error("Failed to store hero card:", e);
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
