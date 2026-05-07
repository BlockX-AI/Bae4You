import { Pool } from "pg";
import { config } from "../config";

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: config.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected pool error:", err.message);
});

export const db = {
  query: pool.query.bind(pool),
  connect: pool.connect.bind(pool),
  end: pool.end.bind(pool),
};

export type DbRow = Record<string, unknown>;
