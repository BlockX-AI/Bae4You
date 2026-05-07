/**
 * Ranking Worker
 * Runs on a schedule — every Sunday night at 23:00 UTC.
 * Computes asset rankings for all active users, signs badge proofs,
 * and saves everything to rankings_snapshot.
 *
 * Start with: pnpm worker:ranking
 */

import "../config";
import cron from "node-cron";
import { runWeeklyRankingSnapshot } from "../services/ranking-engine";

console.log("[ranking] Worker starting. Schedule: every Sunday at 23:00 UTC");

// Runs every Sunday at 23:00 UTC
cron.schedule("0 23 * * 0", async () => {
  console.log("[ranking] Running weekly snapshot...");
  try {
    await runWeeklyRankingSnapshot();
  } catch (err) {
    console.error("[ranking] Snapshot failed:", err);
  }
}, {
  timezone: "UTC",
});

// Also support manual trigger via env
if (process.env.RUN_RANKING_NOW === "true") {
  console.log("[ranking] Manual trigger detected. Running now...");
  runWeeklyRankingSnapshot()
    .then(() => { console.log("[ranking] Manual run complete"); process.exit(0); })
    .catch((err) => { console.error(err); process.exit(1); });
}
