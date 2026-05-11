import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/client";
import type { JwtPayload } from "../plugins/auth";
import { uploadToIPFS, ipfsGatewayUrl } from "../services/ipfs";
import { registerPushToken, removePushToken } from "../services/push";
import { upsertPersonality } from "../services/pinecone-match";

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
