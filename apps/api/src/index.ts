import "./config"; // must be first — validates env vars before anything boots
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import dbPlugin    from "./plugins/db";
import redisPlugin from "./plugins/redis";
import authPlugin  from "./plugins/auth";
import socketPlugin from "./plugins/socket";
import { rateLimiterWithAdminBypass } from "./middleware/rateLimiter";

import authRoutes     from "./routes/auth";
import usersRoutes    from "./routes/users";
import petsRoutes     from "./routes/pets";
import bonusRoutes    from "./routes/bonus";
import matchesRoutes  from "./routes/matches";
import messagesRoutes from "./routes/messages";
import rankingsRoutes from "./routes/rankings";
import fiatRoutes     from "./routes/fiat";
import adminRoutes    from "./routes/admin";
import actionsRoutes     from "./routes/actions";
import walletRoutes      from "./routes/wallet";
import heroesRoutes      from "./routes/heroes";
import cardsRoutes       from "./routes/cards";
import tournamentsRoutes from "./routes/tournaments";
import couplesRoutes     from "./routes/couples";

import { config } from "./config";

// TLS certificate fingerprints for the Railway deployment.
// React Native uses these for certificate pinning (react-native-ssl-pinning).
// The app checks X-Cert-Sha256 on every response as an additional guard.
const TLS_PINS = {
  sha1:   "4B:F2:19:FF:0B:96:E8:84:4A:D5:EB:D7:CE:12:8C:52:A1:44:CC:2A",
  sha256: "74:AA:FB:21:C3:8E:29:E5:79:C9:78:5C:32:F0:88:42:C5:39:69:F8:74:94:57:4F:45:BA:56:55:9F:FE:0C:FA",
};

const app = Fastify({
  logger: {
    level: config.NODE_ENV === "production" ? "info" : "debug",
    transport: config.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  },
});

async function bootstrap() {
  // OpenAPI spec — available at GET /docs/json
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Bae4U API",
        description: "SocialFi dating app — blockchain as backend. Custodial wallets, ERC-4337 gas sponsorship, EIP-712 signatures. All blockchain complexity is invisible to the user.",
        version: "2.0.0",
        contact: { name: "Bae4U Team", url: "https://bae4u.com" },
      },
      servers: [
        { url: "https://baebackend-production.up.railway.app", description: "Railway (current)" },
        { url: "https://api.bae4u.com",  description: "Production" },
        { url: "http://localhost:3000",    description: "Local dev" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
      security: [{ bearerAuth: [] }],
      tags: [
        { name: "auth",     description: "Sign-up, login, SIWE, JWT refresh" },
        { name: "users",    description: "User profiles and settings" },
        { name: "pets",     description: "Pet SFT market feed and detail" },
        { name: "actions",  description: "Invisible UX — buy / lock / gift relay" },
        { name: "bonus",    description: "Daily PCASH bonus claim (EIP-712)" },
        { name: "matches",  description: "Swipe queue and match management" },
        { name: "messages", description: "In-match messaging" },
        { name: "rankings", description: "Leaderboard and badge proofs" },
        { name: "wallet",     description: "Wallet balance and transaction history" },
        { name: "fiat",        description: "Transak / MoonPay on-ramp hooks" },
        { name: "admin",       description: "Internal admin endpoints" },
        { name: "heroes",      description: "Fantasy Bae — hero score oracle & leaderboard" },
        { name: "cards",       description: "Fantasy Bae — Bae Card NFT market" },
        { name: "tournaments", description: "Fantasy Bae — weekly tournament engine" },
        { name: "couples",     description: "Fantasy Bae — Couple Card co-minting" },
      ],
    },
  });

  // Swagger UI — interactive docs at GET /docs
  await app.register(swaggerUI, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: true },
    staticCSP: true,
  });

  // Multipart — used for avatar uploads (5 MB limit)
  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  });

  // Security middleware
  await app.register(cors, {
    origin: config.NODE_ENV === "production"
      ? [
          "https://app.bae4u.com",
          "https://admin.bae4u.com",
          "https://baebackend-production.up.railway.app",
          /\.expo\.dev$/,
          /localhost/,
        ]
      : true,
    credentials: true,
  });
  await app.register(helmet, { contentSecurityPolicy: false });

  // Core plugins
  await app.register(dbPlugin);
  await app.register(redisPlugin);
  await app.register(authPlugin);
  await app.register(socketPlugin);

  // Attach TLS pin header to every response — lets the React Native app
  // verify it is talking to the genuine Railway backend before reading any data.
  app.addHook("onSend", async (_req, reply) => {
    reply.header("X-Cert-Sha256", TLS_PINS.sha256);
  });

  // Rate limiting hook (applies to all routes except health)
  app.addHook("preHandler", async (req, reply) => {
    // Skip rate limiting for health check
    if (req.routeOptions.url === "/health") return;
    // Apply rate limiting
    return rateLimiterWithAdminBypass(req, reply);
  });

  // Health check (no auth required)
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "2.0.0",
    tlsPins: TLS_PINS,
  }));

  // Routes
  await app.register(authRoutes,     { prefix: "/auth"     });
  await app.register(usersRoutes,    { prefix: "/users"    });
  await app.register(petsRoutes,     { prefix: "/pets"     });
  await app.register(bonusRoutes,    { prefix: "/bonus"    });
  await app.register(matchesRoutes,  { prefix: "/matches"  });
  await app.register(messagesRoutes, { prefix: "/messages" });
  await app.register(rankingsRoutes, { prefix: "/rankings" });
  await app.register(fiatRoutes,     { prefix: "/fiat"     });
  await app.register(adminRoutes,    { prefix: "/admin"    });
  await app.register(walletRoutes,      { prefix: "/wallet"      });
  await app.register(actionsRoutes,     { prefix: "/actions"     });
  await app.register(heroesRoutes,      { prefix: "/heroes"      });
  await app.register(cardsRoutes,       { prefix: "/cards"       });
  await app.register(tournamentsRoutes, { prefix: "/tournaments" });
  await app.register(couplesRoutes,     { prefix: "/couples"     });

  // Global error handler
  app.setErrorHandler((error, req, reply) => {
    app.log.error({ err: error, url: req.url }, "Unhandled error");
    reply.code(error.statusCode ?? 500).send({
      error: config.NODE_ENV === "production" ? "Internal Server Error" : error.message,
    });
  });

  const port = parseInt(config.PORT);
  await app.listen({ port, host: "0.0.0.0" });
  app.log.info(`🚀 Bae4U API running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
