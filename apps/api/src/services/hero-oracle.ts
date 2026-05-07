import { db } from "../db/client";

export interface HeroScore {
  userId: string;
  walletAddress: string;
  weekNumber: number;
  yearNumber: number;
  matchesCount: number;
  messagesCount: number;
  likesCount: number;
  pcashEarned: string;
  petsTraded: number;
  rawScore: number;
}

function currentWeekYear(): { week: number; year: number } {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const week = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
  return { week, year: now.getFullYear() };
}

/**
 * SCORE_WEIGHTS — how each activity type contributes to a hero's weekly score.
 * These are intentionally generous so scores feel meaningful fast.
 */
const SCORE_WEIGHTS = {
  match:      20,
  message:    2,
  like:       8,
  pet_trade:  15,
  pcash_unit: 1e-18,  // 1 PCASH (in wei) = 1 point
};

/**
 * Compute hero scores for all users for the given week.
 * Pulls from: matches, messages, pet_transactions tables.
 * Upserts into hero_scores.
 */
export async function computeHeroScores(week?: number, year?: number): Promise<HeroScore[]> {
  const { week: currentWeek, year: currentYear } = currentWeekYear();
  const targetWeek = week ?? currentWeek;
  const targetYear = year ?? currentYear;

  const weekStart = weekStartDate(targetWeek, targetYear);
  const weekEnd   = new Date(weekStart.getTime() + 7 * 86400000);

  const result = await db.query<{
    user_id: string;
    wallet_address: string;
    matches_count: string;
    messages_count: string;
    likes_count: string;
    pcash_earned: string;
    pets_traded: string;
  }>(`
    WITH
    match_counts AS (
      SELECT u.id AS user_id,
             COUNT(DISTINCT m.id) AS cnt
      FROM users u
      LEFT JOIN matches m ON
        (m.user_a_id = u.id OR m.user_b_id = u.id)
        AND m.status = 'matched'
        AND m.matched_at BETWEEN $1 AND $2
      GROUP BY u.id
    ),
    message_counts AS (
      SELECT u.id AS user_id,
             COUNT(msg.id) AS cnt
      FROM users u
      LEFT JOIN messages msg ON msg.sender_id = u.id
        AND msg.sent_at BETWEEN $1 AND $2
      GROUP BY u.id
    ),
    like_counts AS (
      SELECT u.id AS user_id,
             COUNT(sp.id) AS cnt
      FROM users u
      LEFT JOIN swipe_passes sp ON sp.user_id = u.id
        AND sp.created_at BETWEEN $1 AND $2
      GROUP BY u.id
    ),
    pet_trade_counts AS (
      SELECT u.id AS user_id,
             COUNT(pt.id) AS cnt
      FROM users u
      LEFT JOIN pets_state ps ON ps.user_address = u.wallet_address
      LEFT JOIN pet_transactions pt ON pt.token_id = ps.token_id
        AND pt.created_at BETWEEN $1 AND $2
      GROUP BY u.id
    ),
    pcash_totals AS (
      SELECT u.id AS user_id,
             COALESCE(SUM(CASE WHEN pt.to_address = u.wallet_address
                                THEN pt.profit_to_pet_wei ELSE 0 END), 0) AS total_wei
      FROM users u
      LEFT JOIN pets_state ps ON ps.user_address = u.wallet_address
      LEFT JOIN pet_transactions pt ON pt.token_id = ps.token_id
        AND pt.created_at BETWEEN $1 AND $2
      GROUP BY u.id
    )
    SELECT
      u.id                    AS user_id,
      u.wallet_address,
      mc.cnt::TEXT            AS matches_count,
      msg.cnt::TEXT           AS messages_count,
      lc.cnt::TEXT            AS likes_count,
      pc.total_wei::TEXT      AS pcash_earned,
      ptc.cnt::TEXT           AS pets_traded
    FROM users u
    JOIN match_counts     mc  ON mc.user_id  = u.id
    JOIN message_counts   msg ON msg.user_id = u.id
    JOIN like_counts      lc  ON lc.user_id  = u.id
    JOIN pcash_totals     pc  ON pc.user_id  = u.id
    JOIN pet_trade_counts ptc ON ptc.user_id = u.id
    WHERE u.status = 'active'
      AND u.wallet_address IS NOT NULL
    ORDER BY u.id
  `, [weekStart.toISOString(), weekEnd.toISOString()]);

  const scores: HeroScore[] = result.rows.map((row) => {
    const matchesCount  = parseInt(row.matches_count,  10) || 0;
    const messagesCount = parseInt(row.messages_count, 10) || 0;
    const likesCount    = parseInt(row.likes_count,    10) || 0;
    const pcashEarned   = row.pcash_earned ?? "0";
    const petsTraded    = parseInt(row.pets_traded,    10) || 0;
    const pcashPoints   = Number(BigInt(pcashEarned) / BigInt("1000000000000000000")); // divide by 1e18

    const rawScore =
      matchesCount  * SCORE_WEIGHTS.match    +
      messagesCount * SCORE_WEIGHTS.message  +
      likesCount    * SCORE_WEIGHTS.like     +
      petsTraded    * SCORE_WEIGHTS.pet_trade +
      pcashPoints   * 1;

    return {
      userId:         row.user_id,
      walletAddress:  row.wallet_address,
      weekNumber:     targetWeek,
      yearNumber:     targetYear,
      matchesCount,
      messagesCount,
      likesCount,
      pcashEarned,
      petsTraded,
      rawScore,
    };
  });

  await upsertHeroScores(scores);
  return scores;
}

async function upsertHeroScores(scores: HeroScore[]): Promise<void> {
  for (const s of scores) {
    await db.query(`
      INSERT INTO hero_scores
        (user_id, week_number, year_number,
         matches_count, messages_count, likes_count,
         pcash_earned, pets_traded, raw_score, computed_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
      ON CONFLICT (user_id, week_number, year_number)
      DO UPDATE SET
        matches_count  = EXCLUDED.matches_count,
        messages_count = EXCLUDED.messages_count,
        likes_count    = EXCLUDED.likes_count,
        pcash_earned   = EXCLUDED.pcash_earned,
        pets_traded    = EXCLUDED.pets_traded,
        raw_score      = EXCLUDED.raw_score,
        computed_at    = NOW()
    `, [
      s.userId, s.weekNumber, s.yearNumber,
      s.matchesCount, s.messagesCount, s.likesCount,
      s.pcashEarned, s.petsTraded, s.rawScore,
    ]);
  }
}

export async function getHeroLeaderboard(
  week?: number,
  year?: number,
  limit = 50
): Promise<Array<HeroScore & { rank: number; displayName: string | null; avatarHash: string | null }>> {
  const { week: cw, year: cy } = currentWeekYear();
  const w = week ?? cw;
  const y = year ?? cy;

  const result = await db.query<{
    user_id: string; wallet_address: string; display_name: string | null;
    avatar_ipfs_hash: string | null; matches_count: string; messages_count: string;
    likes_count: string; pcash_earned: string; pets_traded: string; raw_score: string;
  }>(`
    SELECT
      hs.user_id, u.wallet_address, u.display_name, u.avatar_ipfs_hash,
      hs.matches_count::TEXT, hs.messages_count::TEXT, hs.likes_count::TEXT,
      hs.pcash_earned::TEXT, hs.pets_traded::TEXT, hs.raw_score::TEXT
    FROM hero_scores hs
    JOIN users u ON u.id = hs.user_id
    WHERE hs.week_number = $1 AND hs.year_number = $2
    ORDER BY hs.raw_score DESC
    LIMIT $3
  `, [w, y, limit]);

  return result.rows.map((row, i) => ({
    rank:         i + 1,
    userId:       row.user_id,
    walletAddress:row.wallet_address,
    displayName:  row.display_name,
    avatarHash:   row.avatar_ipfs_hash,
    weekNumber:   w,
    yearNumber:   y,
    matchesCount: parseInt(row.matches_count,  10) || 0,
    messagesCount:parseInt(row.messages_count, 10) || 0,
    likesCount:   parseInt(row.likes_count,    10) || 0,
    pcashEarned:  row.pcash_earned ?? "0",
    petsTraded:   parseInt(row.pets_traded,    10) || 0,
    rawScore:     parseFloat(row.raw_score)    || 0,
  }));
}

export async function getUserHeroScore(
  userId: string,
  week?: number,
  year?: number
): Promise<HeroScore | null> {
  const { week: cw, year: cy } = currentWeekYear();
  const w = week ?? cw;
  const y = year ?? cy;

  const result = await db.query<{
    wallet_address: string; matches_count: string; messages_count: string;
    likes_count: string; pcash_earned: string; pets_traded: string; raw_score: string;
  }>(`
    SELECT u.wallet_address,
           hs.matches_count::TEXT, hs.messages_count::TEXT, hs.likes_count::TEXT,
           hs.pcash_earned::TEXT, hs.pets_traded::TEXT, hs.raw_score::TEXT
    FROM hero_scores hs
    JOIN users u ON u.id = hs.user_id
    WHERE hs.user_id = $1 AND hs.week_number = $2 AND hs.year_number = $3
  `, [userId, w, y]);

  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    userId,
    walletAddress:  row.wallet_address,
    weekNumber:     w,
    yearNumber:     y,
    matchesCount:   parseInt(row.matches_count,  10) || 0,
    messagesCount:  parseInt(row.messages_count, 10) || 0,
    likesCount:     parseInt(row.likes_count,    10) || 0,
    pcashEarned:    row.pcash_earned ?? "0",
    petsTraded:     parseInt(row.pets_traded,    10) || 0,
    rawScore:       parseFloat(row.raw_score)    || 0,
  };
}

function weekStartDate(week: number, year: number): Date {
  const firstDay = new Date(year, 0, 1);
  const dayOffset = (week - 1) * 7 - firstDay.getDay() + 1;
  return new Date(year, 0, 1 + dayOffset);
}
