import fp from "fastify-plugin";
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { config } from "../config";

export interface JwtPayload {
  userId: string;
  wallet: string;
  role: string;
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: "1h" },
  });

  // Decorate with helper to extract and verify JWT
  fastify.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: "Unauthorized" });
    }
  });

  fastify.decorate("requireAdmin", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
      const payload = req.user as JwtPayload;
      if (payload.role !== "admin") {
        return reply.code(403).send({ error: "Forbidden" });
      }
    } catch {
      reply.code(401).send({ error: "Unauthorized" });
    }
  });
};

export default fp(authPlugin, { name: "auth" });

declare module "fastify" {
  interface FastifyInstance {
    authenticate:  (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin:  (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload;
    user:    JwtPayload;
  }
}
