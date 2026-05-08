/**
 * fantasy-e2e.ts
 * HTTP end-to-end tests for all new Fantasy Bae API routes.
 * Runs against the Railway production backend (or local if BASE_URL is set).
 *
 * Sections:
 *  1.  Health check
 *  2.  SIWE login
 *  3.  GET /heroes/leaderboard
 *  4.  GET /heroes/me
 *  5.  POST /heroes/recompute (admin)
 *  6.  GET /heroes/:address/score
 *  7.  GET /heroes/:address/cards
 *  8.  GET /cards
 *  9.  GET /cards/:tokenId
 *  10. GET /tournaments/current
 *  11. GET /tournaments/leaderboard
 *  12. GET /tournaments/deck
 *  13. GET /tournaments/history
 *  14. GET /couples/my
 *  15. POST /couples/proof (requires real matchId with 10+ messages)
 */

import "dotenv/config";
import axios, { AxiosError } from "axios";
import { ethers }  from "ethers";
import { SiweMessage } from "siwe";

const BASE_URL = process.env.FANTASY_E2E_URL
  ?? process.env.RAILWAY_URL
  ?? "https://baebackend-production.up.railway.app";

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY!;

const api = axios.create({ baseURL: BASE_URL, timeout: 30_000 });

let passed = 0;
let failed = 0;
let jwt    = "";
let userId = "";
let walletAddress = "";

function ok(label: string, extra?: unknown) {
  const suffix = extra !== undefined ? `  → ${JSON.stringify(extra)}` : "";
  console.log(`  ✅  ${label}${suffix}`);
  passed++;
}

function fail(label: string, err: unknown) {
  const msg = err instanceof AxiosError
    ? `${err.response?.status} ${JSON.stringify(err.response?.data)}`
    : (err as Error).message;
  console.error(`  ❌  ${label}: ${msg}`);
  failed++;
}

async function siweLogin(): Promise<{ jwt: string; userId: string; walletAddress: string }> {
  const wallet  = new ethers.Wallet(DEPLOYER_KEY);
  const addr    = wallet.address;

  const { data: nonceData } = await api.get(`/auth/nonce/${addr}`);
  const nonce = nonceData.nonce;

  const msg = new SiweMessage({
    domain: "baebackend-production.up.railway.app",
    address: addr,
    statement: "Sign in to Bae4U",
    uri: "https://baebackend-production.up.railway.app",
    version: "1",
    chainId: 84532,
    nonce,
  });
  const prepared = msg.prepareMessage();
  const sig      = await wallet.signMessage(prepared);

  const { data: loginData } = await api.post("/auth/siwe", {
    message: prepared, signature: sig, address: addr,
  });

  return {
    jwt:           loginData.accessToken,
    userId:        loginData.user?.id ?? loginData.userId,
    walletAddress: addr,
  };
}

async function section(num: number, title: string, fn: () => Promise<void>) {
  console.log(`\n── §${num.toString().padStart(2, "0")} ${title} ${"─".repeat(Math.max(2, 47 - title.length))}`);
  try {
    await fn();
  } catch (e) {
    fail(title, e);
  }
}

async function main() {
  console.log("════════════════════════════════════════════════════");
  console.log("  Fantasy Bae API E2E Test Suite");
  console.log(`  Target: ${BASE_URL}`);
  console.log("════════════════════════════════════════════════════");

  // § 1 — Health
  await section(1, "Health check", async () => {
    const { data } = await api.get("/health");
    if (data.status !== "ok") throw new Error("Not ok");
    ok("GET /health", data.status);
  });

  // § 2 — SIWE login
  await section(2, "SIWE login", async () => {
    const result = await siweLogin();
    jwt           = result.jwt;
    userId        = result.userId;
    walletAddress = result.walletAddress;
    api.defaults.headers.common["Authorization"] = `Bearer ${jwt}`;
    ok("Login successful", { userId, walletAddress });
  });

  // § 3 — Heroes leaderboard
  await section(3, "GET /heroes/leaderboard", async () => {
    const { data } = await api.get("/heroes/leaderboard");
    if (!Array.isArray(data.heroes)) throw new Error("heroes is not an array");
    ok(`/heroes/leaderboard → ${data.heroes.length} heroes`);
  });

  // § 4 — My hero score
  await section(4, "GET /heroes/me", async () => {
    const { data } = await api.get("/heroes/me").catch((e) => {
      if (e.response?.status === 404) return { data: { score: null } };
      throw e;
    });
    ok("/heroes/me", data.score ? `rawScore=${data.score.rawScore}` : "no score yet (expected for new user)");
  });

  // § 5 — Recompute (admin only)
  await section(5, "POST /heroes/recompute (admin)", async () => {
    const { data } = await api.post("/heroes/recompute", {}).catch((e) => {
      if (e.response?.status === 403) return { data: { _skipped: "not admin" } };
      throw e;
    });
    ok("/heroes/recompute", data._skipped ?? `recomputed ${data.recomputed} heroes`);
  });

  // § 6 — Hero score by address
  await section(6, "GET /heroes/:address/score", async () => {
    const { data } = await api.get(`/heroes/${walletAddress}/score`).catch((e) => {
      if (e.response?.status === 404) return { data: { _skipped: "no score" } };
      throw e;
    });
    ok(`/heroes/${walletAddress.slice(0, 8)}…/score`, data._skipped ?? `rawScore=${data.score?.rawScore}`);
  });

  // § 7 — Hero's cards
  await section(7, "GET /heroes/:address/cards", async () => {
    const { data } = await api.get(`/heroes/${walletAddress}/cards`);
    if (!Array.isArray(data.cards)) throw new Error("cards not array");
    ok(`/heroes/cards → ${data.cards.length} cards`);
  });

  // § 8 — Card market feed
  await section(8, "GET /cards", async () => {
    const { data } = await api.get("/cards");
    if (!Array.isArray(data.cards)) throw new Error("cards not array");
    ok(`/cards → ${data.cards.length} listed`);

    if (data.cards.length > 0) {
      const c = data.cards[0];
      if (c.score_multiplier === undefined) throw new Error("Missing score_multiplier field");
      ok("score_multiplier present on card", c.score_multiplier);
    }
  });

  // § 9 — Card by ID (if any listed)
  await section(9, "GET /cards/:tokenId", async () => {
    const { data: feed } = await api.get("/cards");
    if (feed.cards.length === 0) {
      ok("No cards listed yet — skip individual card fetch");
      return;
    }
    const tokenId = feed.cards[0].token_id;
    const { data } = await api.get(`/cards/${tokenId}`);
    if (!data.card) throw new Error("No card in response");
    ok(`/cards/${tokenId} → rarity=${data.card.rarity}, multiplier=${data.card.score_multiplier}`);
  });

  // § 10 — Current tournament
  await section(10, "GET /tournaments/current", async () => {
    const { data } = await api.get("/tournaments/current");
    ok("/tournaments/current", data.tournament ? `status=${data.tournament.status}` : "no active tournament (ok)");
  });

  // § 11 — Tournament leaderboard
  await section(11, "GET /tournaments/leaderboard", async () => {
    const { data } = await api.get("/tournaments/leaderboard");
    if (!Array.isArray(data.leaderboard)) throw new Error("leaderboard not array");
    ok(`/tournaments/leaderboard → ${data.leaderboard.length} entries`);
  });

  // § 12 — My deck
  await section(12, "GET /tournaments/deck", async () => {
    const { data } = await api.get("/tournaments/deck");
    ok("/tournaments/deck", data.deck ? `rank=${data.deck.rank}` : "no deck locked yet (ok)");
  });

  // § 13 — Tournament history
  await section(13, "GET /tournaments/history", async () => {
    const { data } = await api.get("/tournaments/history");
    if (!Array.isArray(data.history)) throw new Error("history not array");
    ok(`/tournaments/history → ${data.history.length} past tournaments`);
  });

  // § 14 — My couple cards
  await section(14, "GET /couples/my", async () => {
    const { data } = await api.get("/couples/my");
    if (!Array.isArray(data.coupleCards)) throw new Error("coupleCards not array");
    ok(`/couples/my → ${data.coupleCards.length} couple cards`);
  });

  // § 15 — Couple proof (needs real match — will 404/400 on fresh env)
  await section(15, "POST /couples/proof (needs matched + 10 msgs)", async () => {
    const { data: matchData } = await api.get("/matches/list").catch(() => ({ data: { matches: [] } }));
    const matched = (matchData.matches ?? []).find((m: { status: string }) => m.status === "matched");

    if (!matched) {
      ok("No matched pair available — couple proof skipped (expected on fresh env)");
      return;
    }

    const { data } = await api.post("/couples/proof", { matchId: matched.id }).catch((e) => {
      if (e.response?.status === 400) return { data: { _skipped: e.response.data.error } };
      throw e;
    });
    ok("/couples/proof", data._skipped ?? `sig=${data.proof?.sig?.slice(0, 12)}…`);
  });

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n════════════════════════════════════════════════════");
  console.log(`  Fantasy E2E: ${passed} passed, ${failed} failed`);
  console.log("════════════════════════════════════════════════════");

  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
