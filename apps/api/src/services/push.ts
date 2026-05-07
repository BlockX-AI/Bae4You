import { config } from "../config";
import { db } from "../db/client";

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
}

export async function registerPushToken(
  userId: string,
  token: string,
  platform: string
): Promise<void> {
  await db.query(
    `INSERT INTO push_tokens (user_id, token, platform, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, token) DO UPDATE
       SET platform = EXCLUDED.platform, updated_at = NOW()`,
    [userId, token, platform]
  );
}

export async function removePushToken(userId: string, token: string): Promise<void> {
  await db.query(
    "DELETE FROM push_tokens WHERE user_id = $1 AND token = $2",
    [userId, token]
  );
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const { rows } = await db.query(
    "SELECT token FROM push_tokens WHERE user_id = $1",
    [userId]
  );
  if (rows.length === 0) return;
  await sendPush(rows.map((r: { token: string }) => r.token), payload);
}

export async function sendPush(tokens: string[], payload: PushPayload): Promise<void> {
  if (tokens.length === 0) return;
  try {
    const { default: Expo } = await import("expo-server-sdk");
    const expo = new Expo({ accessToken: config.EXPO_ACCESS_TOKEN });

    const messages = tokens
      .filter((t) => Expo.isExpoPushToken(t))
      .map((to) => ({
        to,
        sound: "default" as const,
        title: payload.title,
        body:  payload.body,
        data:  payload.data ?? {},
        badge: payload.badge,
      }));

    if (messages.length === 0) return;
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch (err) {
    console.error("[push] send failed:", err);
  }
}
