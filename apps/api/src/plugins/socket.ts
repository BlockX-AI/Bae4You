import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import { Server, Socket } from "socket.io";
import { config } from "../config";
import { db } from "../db/client";
import { sendPushToUser } from "../services/push";

interface AuthSocket extends Socket {
  userId?: string;
  walletAddress?: string;
}

const socketPlugin: FastifyPluginAsync = async (fastify) => {
  const allowedOrigins = [
    "https://app.bae4u.com",
    "https://baebackend-production.up.railway.app",
    /\.expo\.dev$/,
    /localhost/,
  ];

  const io = new Server(fastify.server, {
    cors: {
      origin: config.NODE_ENV === "production" ? allowedOrigins : "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Auth middleware — verify JWT on socket connection
  io.use(async (socket: AuthSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("No auth token"));

    try {
      const decoded = fastify.jwt.verify<{ userId: string; wallet: string }>(token);
      socket.userId = decoded.userId;
      socket.walletAddress = decoded.wallet;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: AuthSocket) => {
    fastify.log.info({ userId: socket.userId }, "[socket] client connected");

    socket.on("join:match", async (matchId: string) => {
      const { rows } = await db.query(
        "SELECT id FROM matches WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2) AND status = 'matched'",
        [matchId, socket.userId]
      );
      if (rows.length === 0) {
        socket.emit("error", { message: "Not part of this match" });
        return;
      }
      socket.join(`match:${matchId}`);
      socket.emit("joined:match", { matchId });
    });

    const VALID_MSG_TYPES = new Set(["text", "image", "gif", "audio"]);

    socket.on("send:message", async (data: { matchId: string; content: string; type?: string }) => {
      const { matchId, content } = data;
      const type = VALID_MSG_TYPES.has(data.type ?? "") ? data.type! : "text";

      if (!content?.trim()) return;

      try {
        const { rows: authRows } = await db.query(
          "SELECT id FROM matches WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2) AND status = 'matched'",
          [matchId, socket.userId]
        );
        if (authRows.length === 0) {
          socket.emit("error", { message: "Not part of this match" });
          return;
        }

        const { rows } = await db.query(
          "INSERT INTO messages (match_id, sender_id, content, msg_type) VALUES ($1, $2, $3, $4) RETURNING *",
          [matchId, socket.userId, content.trim(), type]
        );

        const msg = rows[0];
        const envelope = {
          id:       msg.id,
          matchId,
          senderId: socket.userId,
          content:  msg.content,
          type:     msg.msg_type,
          sentAt:   msg.sent_at,
        };
        io.to(`match:${matchId}`).emit("new:message", envelope);

        // Push to the offline partner
        const { rows: matchRow } = await db.query(
          "SELECT user_a_id, user_b_id FROM matches WHERE id = $1",
          [matchId]
        );
        if (matchRow[0]) {
          const partnerId = matchRow[0].user_a_id === socket.userId
            ? matchRow[0].user_b_id
            : matchRow[0].user_a_id;
          const { rows: senderRow } = await db.query(
            "SELECT COALESCE(display_name, username, 'Someone') AS name FROM users WHERE id = $1",
            [socket.userId]
          );
          sendPushToUser(partnerId, {
            title: senderRow[0]?.name ?? "New Message",
            body:  content.trim().slice(0, 100),
            data:  { type: "new_message", matchId },
          }).catch(() => {});
        }
      } catch (err) {
        fastify.log.error({ err }, "[socket] message insert failed");
      }
    });

    async function assertInMatch(matchId: string): Promise<boolean> {
      const { rows } = await db.query(
        "SELECT id FROM matches WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2) AND status = 'matched'",
        [matchId, socket.userId]
      );
      return rows.length > 0;
    }

    socket.on("typing:start", async ({ matchId }: { matchId: string }) => {
      if (!await assertInMatch(matchId)) return;
      socket.to(`match:${matchId}`).emit("peer:typing", { userId: socket.userId });
    });

    socket.on("typing:stop", async ({ matchId }: { matchId: string }) => {
      if (!await assertInMatch(matchId)) return;
      socket.to(`match:${matchId}`).emit("peer:stopped-typing", { userId: socket.userId });
    });

    socket.on("mark:read", async ({ matchId }: { matchId: string }) => {
      if (!await assertInMatch(matchId)) return;
      socket.to(`match:${matchId}`).emit("messages:read", {
        matchId,
        readBy: socket.userId,
        readAt: new Date().toISOString(),
      });
    });

    socket.on("disconnect", () => {
      fastify.log.info({ userId: socket.userId }, "[socket] client disconnected");
    });
  });

  fastify.decorate("io", io);

  fastify.addHook("onClose", async () => {
    io.close();
  });
};

export default fp(socketPlugin, { name: "socket" });

declare module "fastify" {
  interface FastifyInstance {
    io: Server;
  }
}
