import axios from "axios";
import { db } from "../db/client";
import { signBadgeClaim } from "./eip712-signer";
import { config } from "../config";

// Badge tier thresholds (top N% of users)
const TIER_THRESHOLDS = {
  master:   0.01,  // top 1%
  diamond:  0.05,  // top 5%
  gold:     0.10,  // top 10%
  silver:   0.25,  // top 25%
  bronze:   0.50,  // top 50%
};

const TIER_ENUM: Record<string, number> = {
  bronze:  1,
  silver:  2,
  gold:    3,
  diamond: 4,
  master:  5,
};

interface UserAssets {
  userId: string;
  walletAddress: string;
  totalValueWei: bigint;
  ownedCount: number;
  countryCode: string;
}

async function computeAssetsFromDB(): Promise<UserAssets[]> {
  // Calculate each user's total asset value from pets_state mirror
  const { rows } = await db.query(`
    SELECT
      u.id            AS user_id,
      u.wallet_address,
      u.country_code,
      COUNT(p.token_id)              AS owned_count,
      COALESCE(SUM(p.current_price_wei::numeric), 0) AS total_value_wei
    FROM users u
    LEFT JOIN pets_state p ON p.owner_address = u.wallet_address AND p.pet_status = 'active'
    WHERE u.status = 'active' AND u.wallet_address IS NOT NULL
    GROUP BY u.id, u.wallet_address, u.country_code
    ORDER BY total_value_wei DESC
  `);

  return rows.map((r: Record<string, unknown>) => ({
    userId:        r.user_id as string,
    walletAddress: r.wallet_address as string,
    totalValueWei: BigInt(String(r.total_value_wei)),
    ownedCount:    Number(r.owned_count),
    countryCode:   r.country_code as string,
  }));
}

function assignTier(rank: number, total: number): string | null {
  const pct = rank / total;
  if (pct <= TIER_THRESHOLDS.master)  return "master";
  if (pct <= TIER_THRESHOLDS.diamond) return "diamond";
  if (pct <= TIER_THRESHOLDS.gold)    return "gold";
  if (pct <= TIER_THRESHOLDS.silver)  return "silver";
  if (pct <= TIER_THRESHOLDS.bronze)  return "bronze";
  return null;
}

export async function runWeeklyRankingSnapshot(): Promise<void> {
  const users  = await computeAssetsFromDB();
  const total  = users.length;
  const now    = new Date();
  const ts     = Math.floor(now.getTime() / 1000);

  // Build country buckets for country-specific ranks
  const byCountry: Record<string, UserAssets[]> = {};
  for (const u of users) {
    if (!u.countryCode) continue;
    if (!byCountry[u.countryCode]) byCountry[u.countryCode] = [];
    byCountry[u.countryCode].push(u);
  }

  for (let i = 0; i < users.length; i++) {
    const user       = users[i];
    const assetsRank = i + 1;
    const countryArr = byCountry[user.countryCode] ?? [];
    const countryRank = countryArr.findIndex((u) => u.userId === user.userId) + 1 || null;
    const tier       = assignTier(assetsRank, total);

    let badgeProof: string | null = null;
    if (tier) {
      badgeProof = await signBadgeClaim(user.walletAddress, TIER_ENUM[tier], ts);
    }

    await db.query(
      `INSERT INTO rankings_snapshot
         (user_id, period_type, assets_rank, country_rank, badge_tier, badge_proof, snapshot_at)
       VALUES ($1, 'weekly', $2, $3, $4, $5, NOW())`,
      [user.userId, assetsRank, countryRank, tier, badgeProof]
    );
  }

  console.log(`[ranking] ✅ Snapshot complete. ${total} users ranked at ${now.toISOString()}`);
}

export async function getUserBadgeProof(userId: string): Promise<{
  tier: string;
  proof: string;
  snapshotAt: string;
} | null> {
  const { rows } = await db.query(
    `SELECT badge_tier, badge_proof, snapshot_at
     FROM rankings_snapshot
     WHERE user_id = $1 AND period_type = 'weekly' AND badge_tier IS NOT NULL
     ORDER BY snapshot_at DESC
     LIMIT 1`,
    [userId]
  );
  if (!rows[0] || !rows[0].badge_proof) return null;
  return {
    tier:       rows[0].badge_tier,
    proof:      rows[0].badge_proof,
    snapshotAt: rows[0].snapshot_at,
  };
}
