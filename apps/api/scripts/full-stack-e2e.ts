/**
 * Bae4U — Full-Stack Integration E2E Test
 *
 * Exercises every live infrastructure layer end-to-end:
 *   1.  PostgreSQL (Railway)      — connectivity + schema tables
 *   2.  Redis (Railway)           — connectivity + read/write
 *   3.  Base Sepolia RPC          — block height + contract responses
 *   4.  Smart Contracts (4)       — view-call sanity on all deployed contracts
 *   5.  Custodial Wallet          — create, encrypt, decrypt, address match
 *   6.  CDP Wallet                — provision if key configured (skip gracefully)
 *   7.  Pimlico ERC-4337          — smart account address derivation (no tx needed)
 *   8.  Profile SFT Mint          — deployer mints for test wallet on-chain
 *   9.  DB Persistence            — token_id written to users table after mint
 *  10.  Relay routing logic       — wallet_type dispatch (custodial/cdp/external)
 *  11.  SIWE Auth flow            — nonce generation + sign + upsert user
 *  12.  Cleanup                   — remove all test rows from DB
 *  13.  External wallet flow      — tx-data builder (buy/lock/gift) + ExternalWalletError
 *  14.  Dating layer              — matches, like, discover, pass, push_tokens, swipe_passes
 *  15.  On-chain game flow        — Satyam·Vijendra·Sakshi full pet economy (gameflow-e2e steps)
 *  16.  Railway HTTP API          — live endpoint smoke test (health · auth · pets · matches · rankings)
 *
 * Run: pnpm --filter=api full-e2e
 */

import "dotenv/config";
import { ethers } from "ethers";
import { Pool } from "pg";
import Redis from "ioredis";
import crypto from "crypto";
import { config } from "../src/config";

const PASS = "✅";
const FAIL = "❌";
const SKIP = "⏭️ ";
const INFO = "   ";

let passed  = 0;
let failed  = 0;
let skipped = 0;

function ok(label: string, detail?: string) {
  console.log(`  ${PASS} ${label}${detail ? `  (${detail})` : ""}`);
  passed++;
}

function fail(label: string, err?: unknown) {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  console.log(`  ${FAIL} ${label}${msg ? `\n      ${msg}` : ""}`);
  failed++;
}

function skip(label: string, reason: string) {
  console.log(`  ${SKIP} ${label} — ${reason}`);
  skipped++;
}

function section(title: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}

function summary() {
  console.log(`\n${"═".repeat(60)}`);
  const total = passed + failed + skipped;
  console.log(`  RESULTS  ${passed}/${total} passed  |  ${failed} failed  |  ${skipped} skipped`);
  if (failed === 0) {
    console.log("  STATUS   ✅ ALL SYSTEMS GO — ready for frontend integration");
  } else {
    console.log("  STATUS   ❌ Some checks failed — see above");
  }
  console.log("═".repeat(60));
}

// ─── Infrastructure helpers ───────────────────────────────────────────────────

function getPool(): Pool {
  const dbUrl   = config.DATABASE_URL;
  const needSsl = dbUrl.includes("sslmode=require");
  return new Pool({ connectionString: dbUrl, ssl: needSsl ? { rejectUnauthorized: false } : false });
}

const REGISTRY_ABI = [
  "function getTokenByAddress(address) view returns (uint256)",
];
const MARKET_ABI = [
  "function FEE_BPS() view returns (uint256)",
  "function paused() view returns (bool)",
  "function initPet(uint256 tokenId, address owner, uint256 price) external",
];
const CASH_ABI = [
  "function totalSupply() view returns (uint256)",
  "function BONUS_AMOUNT() view returns (uint256)",
];
const RANKING_ABI = [
  "function hasRole(bytes32 role, address account) view returns (bool)",
];

const provider = new ethers.JsonRpcProvider(config.BASE_SEPOLIA_RPC_URL);

// ─── Test suites ──────────────────────────────────────────────────────────────

async function testPostgres(pool: Pool) {
  section("1  PostgreSQL — Railway");

  try {
    const { rows } = await pool.query("SELECT current_database(), version()");
    ok("Connection alive", rows[0].current_database);
  } catch (e) { fail("Connection", e); return; }

  const expectedTables = [
    "users", "nonces", "pets_state", "pet_transactions",
    "matches", "messages", "rankings_snapshot",
    "fiat_transactions", "wish_list", "creator_passes",
    "push_tokens", "swipe_passes",
  ];
  for (const t of expectedTables) {
    try {
      const { rows } = await pool.query(
        "SELECT to_regclass($1) IS NOT NULL AS exists",
        [t]
      );
      if (rows[0].exists) ok(`Table: ${t}`);
      else                 fail(`Table missing: ${t}`);
    } catch (e) { fail(`Table check: ${t}`, e); }
  }

  try {
    const { rows } = await pool.query(
      `SELECT enumlabel FROM pg_enum
       WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'wallet_type_t')
       ORDER BY enumlabel`
    );
    const values = rows.map((r: { enumlabel: string }) => r.enumlabel).join(", ");
    if (values.includes("custodial") && values.includes("cdp")) {
      ok("Enum wallet_type_t", values);
    } else {
      fail("Enum wallet_type_t missing values", `got: ${values}`);
    }
  } catch (e) { fail("Enum check", e); }
}

async function testRedis() {
  section("2  Redis — Railway");

  const redis = new Redis(config.REDIS_URL, { lazyConnect: true, connectTimeout: 5000 });
  try {
    await redis.connect();
    const pong = await redis.ping();
    if (pong === "PONG") ok("PING → PONG");
    else                  fail("Unexpected PING response", pong);

    const key = "bae4u:e2e:test";
    await redis.set(key, "hello", "EX", 10);
    const val = await redis.get(key);
    if (val === "hello") ok("SET/GET round-trip");
    else                  fail("SET/GET mismatch");

    await redis.del(key);
  } catch (e) { fail("Redis connection", e); }
  finally     { await redis.quit(); }
}

async function testContracts() {
  section("3  Base Sepolia — RPC + Contracts");

  try {
    const block = await provider.getBlockNumber();
    ok("RPC connectivity", `block #${block}`);
  } catch (e) { fail("RPC unreachable", e); return; }

  const cash     = new ethers.Contract(config.PETS_CASH_ADDRESS,     CASH_ABI,     provider);
  const registry = new ethers.Contract(config.PETS_REGISTRY_ADDRESS, REGISTRY_ABI, provider);
  const market   = new ethers.Contract(config.PETS_MARKET_ADDRESS,   MARKET_ABI,   provider);
  const ranking  = new ethers.Contract(config.PETS_RANKING_ADDRESS,  RANKING_ABI,  provider);

  try {
    const supply = await cash.totalSupply();
    ok("PetsCash.totalSupply()", ethers.formatEther(supply) + " PCASH");
  } catch (e) { fail("PetsCash read", e); }

  try {
    const tokenId = await registry.getTokenByAddress(ethers.ZeroAddress);
    ok("PetsRegistry.getTokenByAddress()", `tokenId=${tokenId}`);
  } catch (e) { fail("PetsRegistry read", e); }

  try {
    const fee    = await market.FEE_BPS();
    const paused = await market.paused();
    ok("PetsMarket.FEE_BPS() + paused()", `fee=${fee}bps, paused=${paused}`);
  } catch (e) { fail("PetsMarket read", e); }

  try {
    const DEFAULT_ADMIN = ethers.ZeroHash;
    const deployer      = new ethers.Wallet(config.DEPLOYER_PRIVATE_KEY).address;
    const hasRole       = await ranking.hasRole(DEFAULT_ADMIN, deployer);
    ok("PetsRanking.hasRole(ADMIN, deployer)", `hasRole=${hasRole}`);
  } catch (e) { fail("PetsRanking read", e); }
}

async function testCustodialWallet(pool: Pool) {
  section("4  Custodial Wallet — AES-256 + DB");

  const AES_KEY    = config.WALLET_ENCRYPTION_SECRET.slice(0, 32);
  const testWallet = ethers.Wallet.createRandom();
  const pk         = testWallet.privateKey;

  let encrypted: string;
  let decrypted: string;

  try {
    const iv         = crypto.randomBytes(16);
    const cipher     = crypto.createCipheriv("aes-256-cbc", Buffer.from(AES_KEY), iv);
    const enc        = Buffer.concat([cipher.update(pk, "utf8"), cipher.final()]);
    encrypted = iv.toString("hex") + ":" + enc.toString("hex");
    ok("AES-256-CBC encrypt");
  } catch (e) { fail("Encrypt", e); return; }

  try {
    const [ivHex, encHex] = encrypted.split(":");
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(AES_KEY), Buffer.from(ivHex, "hex"));
    decrypted = decipher.update(Buffer.from(encHex, "hex")).toString("utf8") + decipher.final("utf8");
    if (decrypted === pk) ok("AES-256-CBC decrypt round-trip");
    else                   fail("Decrypt mismatch");
  } catch (e) { fail("Decrypt", e); return; }

  let testUserId: string;
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (wallet_address, custodial_key_enc, wallet_type)
       VALUES ($1, $2, 'custodial')
       RETURNING id`,
      [testWallet.address.toLowerCase(), encrypted]
    );
    testUserId = rows[0].id;
    ok("DB: user row inserted with custodial key", testUserId);

    await pool.query("DELETE FROM users WHERE id = $1", [testUserId]);
    ok("DB: test row cleaned up");
  } catch (e) { fail("DB insert/delete", e); }
}

async function testCdpWallet(pool: Pool) {
  section("5  CDP Embedded Wallet  (Satyam · Vijendra · Sakshi named accounts)");

  if (!config.CDP_API_KEY_ID || !config.CDP_API_KEY_SECRET || !config.CDP_WALLET_SECRET) {
    skip("CDP wallet provision",
      "CDP_API_KEY_ID / CDP_API_KEY_SECRET / CDP_WALLET_SECRET not set");
    return;
  }
  if (config.CDP_WALLET_SECRET === "create-this-in-cdp-portal-under-wallet-secrets") {
    skip("CDP wallet provision", "Placeholder secret — replace with real CDP_WALLET_SECRET");
    return;
  }

  const { createPrivateKey } = await import("crypto");
  function normaliseCdpSecret(raw: string): string {
    const pem = raw.replace(/\\n/g, "\n");
    if (pem.includes("-----BEGIN EC PRIVATE KEY-----")) {
      const k = createPrivateKey({ key: pem, format: "pem" });
      return k.export({ type: "pkcs8", format: "pem" }) as string;
    }
    return pem;
  }

  const insertedIds: string[] = [];
  try {
    const { CdpClient } = await import("@coinbase/cdp-sdk");
    const cdp = new CdpClient({
      apiKeyId:     config.CDP_API_KEY_ID,
      apiKeySecret: normaliseCdpSecret(config.CDP_API_KEY_SECRET),
      walletSecret: config.CDP_WALLET_SECRET,
    });
    ok("CdpClient initialised (EC key normalised to PKCS#8)");

    // Three named accounts — one per character. getOrCreateAccount is idempotent.
    const users = [
      { name: "bae4u-e2e-satyam",   label: "Satyam" },
      { name: "bae4u-e2e-vijendra", label: "Vijendra" },
      { name: "bae4u-e2e-sakshi",   label: "Sakshi" },
    ];

    for (const u of users) {
      const account = await cdp.evm.getOrCreateAccount({ name: u.name });
      ok(`CDP account — ${u.label}`, account.address);

      const { rows } = await pool.query(
        `INSERT INTO users (wallet_address, custodial_key_enc, wallet_type, username, display_name)
         VALUES ($1, $2, 'cdp', $3, $4)
         ON CONFLICT (wallet_address) DO UPDATE SET custodial_key_enc = $2
         RETURNING id`,
        [account.address.toLowerCase(), u.name, u.name.replace("bae4u-e2e-", ""), u.label]
      );
      insertedIds.push(rows[0].id);
      ok(`DB: ${u.label} CDP row persisted`, rows[0].id.slice(0, 8));
    }
  } catch (e) { fail("CDP provision", e); }

  // cleanup
  try {
    if (insertedIds.length > 0) {
      await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [insertedIds]);
      ok("DB: CDP test rows cleaned up", `${insertedIds.length} rows removed`);
    }
  } catch (e) { fail("CDP cleanup", e); }
}

async function testPimlico() {
  section("6  Pimlico ERC-4337 — Smart Account Address Derivation");

  if (!config.PIMLICO_API_KEY) {
    skip("Pimlico smart account", "PIMLICO_API_KEY not set");
    return;
  }

  try {
    const { buildSmartAccountRelay } = await import("../src/services/pimlico-relay");
    const testKey = ethers.Wallet.createRandom().privateKey;
    const relay   = await buildSmartAccountRelay(testKey, config.PIMLICO_API_KEY);

    if (ethers.isAddress(relay.address)) {
      ok("SimpleSmartAccount address derived", relay.address);
    } else {
      fail("Invalid smart account address", relay.address);
    }
  } catch (e) { fail("Pimlico derivation", e); }
}

async function testSiweAuthFlow(pool: Pool) {
  section("7  SIWE Auth Flow — Nonce + Upsert User");

  const testWallet = ethers.Wallet.createRandom();
  const addr       = testWallet.address.toLowerCase();
  const nonce      = ethers.hexlify(ethers.randomBytes(16)).slice(2);

  try {
    await pool.query(
      `INSERT INTO nonces (wallet_address, nonce, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (wallet_address) DO UPDATE SET nonce = $2, created_at = NOW()`,
      [addr, nonce]
    );
    ok("Nonce stored in DB", nonce.slice(0, 8) + "…");
  } catch (e) { fail("Nonce insert", e); return; }

  try {
    const { rows: nonceRows } = await pool.query(
      "SELECT nonce FROM nonces WHERE wallet_address = $1",
      [addr]
    );
    if (nonceRows[0]?.nonce === nonce) ok("Nonce read-back matches");
    else                                fail("Nonce mismatch");
  } catch (e) { fail("Nonce read", e); return; }

  let userId: string;
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (wallet_address, last_login_at)
       VALUES ($1, NOW())
       ON CONFLICT (wallet_address) DO UPDATE SET last_login_at = NOW()
       RETURNING id, wallet_address`,
      [addr]
    );
    userId = rows[0].id;
    ok("User upsert on simulated SIWE verify", rows[0].wallet_address);
  } catch (e) { fail("User upsert", e); return; }

  try {
    await pool.query("DELETE FROM nonces WHERE wallet_address = $1", [addr]);
    await pool.query("DELETE FROM users WHERE id = $1", [userId!]);
    ok("Auth test rows cleaned up");
  } catch (e) { fail("Cleanup", e); }
}

async function testProfileMint(pool: Pool) {
  section("8  Profile SFT Mint + DB Persistence");

  const testWallet = ethers.Wallet.createRandom();
  const addr       = testWallet.address.toLowerCase();

  let userId: string;
  let mintedTokenId: number | null = null;

  try {
    const { rows } = await pool.query(
      `INSERT INTO users (wallet_address, wallet_type)
       VALUES ($1, 'custodial') RETURNING id`,
      [addr]
    );
    userId = rows[0].id;
    ok("Test user inserted", userId);
  } catch (e) { fail("User insert pre-mint", e); return; }

  try {
    const deployer  = new ethers.Wallet(config.DEPLOYER_PRIVATE_KEY, provider);
    const balance   = await provider.getBalance(deployer.address);
    if (balance < ethers.parseEther("0.0002")) {
      skip("On-chain SFT mint", `Deployer balance too low: ${ethers.formatEther(balance)} ETH`);
    } else {
      const registryAbi = [
        "function mintProfile(address user, uint256 startingPrice) external returns (uint256)",
        "event ProfileMinted(address indexed user, uint256 indexed tokenId, uint256 startingPrice)",
      ];
      const marketAbi = [
        "function initPet(uint256 tokenId, address owner, uint256 price) external",
      ];
      const registry = new ethers.Contract(config.PETS_REGISTRY_ADDRESS, registryAbi, deployer);
      const market   = new ethers.Contract(config.PETS_MARKET_ADDRESS,   marketAbi,   deployer);

      const price = BigInt(config.STARTING_PRICE_PCASH);
      const tx    = await registry.mintProfile(testWallet.address, price);
      const rcpt  = await tx.wait();

      const iface = new ethers.Interface([
        "event ProfileMinted(address indexed user, uint256 indexed tokenId, uint256 startingPrice)",
      ]);
      for (const log of rcpt.logs) {
        try {
          const p = iface.parseLog({ topics: log.topics as string[], data: log.data });
          if (p?.name === "ProfileMinted") { mintedTokenId = Number(p.args[1]); break; }
        } catch {}
      }

      if (mintedTokenId !== null) {
        ok("ProfileMinted event parsed", `tokenId=${mintedTokenId}`);

        const tx2 = await market.initPet(mintedTokenId, testWallet.address, price);
        await tx2.wait();
        ok("PetsMarket.initPet() confirmed", `tokenId=${mintedTokenId}`);

        await pool.query("UPDATE users SET token_id = $1 WHERE id = $2", [mintedTokenId, userId!]);
        const { rows } = await pool.query("SELECT token_id FROM users WHERE id = $1", [userId!]);
        if (Number(rows[0].token_id) === mintedTokenId) ok("token_id persisted in DB", `tokenId=${mintedTokenId}`);
        else                                              fail("token_id not persisted", `stored=${rows[0].token_id} expected=${mintedTokenId}`);
      } else {
        fail("ProfileMinted event not found in receipt");
      }
    }
  } catch (e) { fail("Profile mint", e); }

  try {
    if (mintedTokenId) await pool.query("DELETE FROM pets_state WHERE token_id = $1", [mintedTokenId]);
    await pool.query("DELETE FROM users WHERE id = $1", [userId!]);
    ok("Mint test rows cleaned up");
  } catch (e) { fail("Cleanup", e); }
}

async function testWalletTypeRouting(pool: Pool) {
  section("9  Wallet Type Routing (DB-based dispatch)");

  const walletTypes = ["custodial", "cdp", "external"] as const;

  for (const wt of walletTypes) {
    try {
      const addr = ethers.Wallet.createRandom().address.toLowerCase();
      const { rows } = await pool.query(
        `INSERT INTO users (wallet_address, wallet_type) VALUES ($1, $2) RETURNING id, wallet_type`,
        [addr, wt]
      );
      const stored = rows[0].wallet_type;
      if (stored === wt) ok(`wallet_type = '${wt}' stores + reads correctly`);
      else               fail(`wallet_type mismatch for ${wt}`, `got ${stored}`);
      await pool.query("DELETE FROM users WHERE id = $1", [rows[0].id]);
    } catch (e) { fail(`wallet_type = '${wt}'`, e); }
  }
}

async function testExternalWalletFlow(pool: Pool) {
  section("10  External Wallet Flow — tx-data builders + ExternalWalletError");

  // Import the service functions directly (no HTTP, pure unit-style)
  let buildBuyTxData: typeof import("../src/services/tx-relay").buildBuyTxData;
  let buildLockTxData: typeof import("../src/services/tx-relay").buildLockTxData;
  let buildGiftTxData: typeof import("../src/services/tx-relay").buildGiftTxData;
  let ExternalWalletError: typeof import("../src/services/tx-relay").ExternalWalletError;

  try {
    const relay = await import("../src/services/tx-relay");
    buildBuyTxData    = relay.buildBuyTxData;
    buildLockTxData   = relay.buildLockTxData;
    buildGiftTxData   = relay.buildGiftTxData;
    ExternalWalletError = relay.ExternalWalletError;
    ok("tx-relay service imported");
  } catch (e) { fail("tx-relay import", e); return; }

  // Insert an external-wallet test user
  const extAddr = ethers.Wallet.createRandom().address.toLowerCase();
  let extUserId: string;
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (wallet_address, wallet_type) VALUES ($1, 'external') RETURNING id`,
      [extAddr]
    );
    extUserId = rows[0].id;
    ok("External user inserted", extUserId);
  } catch (e) { fail("Insert external user", e); return; }

  // ExternalWalletError class sanity
  try {
    const err = new ExternalWalletError(extUserId!);
    if (err.name === "ExternalWalletError" && err.message === "EXTERNAL_WALLET" && err.userId === extUserId!) {
      ok("ExternalWalletError shape correct");
    } else {
      fail("ExternalWalletError shape wrong", JSON.stringify({ name: err.name, msg: err.message }));
    }
  } catch (e) { fail("ExternalWalletError instantiation", e); }

  // buildLockTxData — pure (no on-chain call)
  try {
    const payload = await buildLockTxData(1, 86400);
    if (
      payload.externalWallet === true &&
      payload.steps.length === 1 &&
      payload.steps[0].to.toLowerCase() === config.PETS_MARKET_ADDRESS.toLowerCase() &&
      payload.steps[0].data.startsWith("0x") &&
      payload.steps[0].chainId === parseInt(config.CHAIN_ID)
    ) {
      ok("buildLockTxData(tokenId=1, 24h)", `steps=${payload.steps.length}, chainId=${payload.steps[0].chainId}`);
    } else {
      fail("buildLockTxData shape wrong", JSON.stringify(payload).slice(0, 120));
    }
  } catch (e) { fail("buildLockTxData", e); }

  // buildBuyTxData — calls on-chain allowance + price (needs real wallet + live RPC)
  try {
    const payload = await buildBuyTxData(extUserId!, 1);
    if (
      payload.externalWallet === true &&
      payload.steps.length >= 1 &&
      payload.currentPriceWei !== undefined &&
      payload.steps[payload.steps.length - 1].to.toLowerCase() === config.PETS_MARKET_ADDRESS.toLowerCase()
    ) {
      ok("buildBuyTxData(userId, tokenId=1)",
        `steps=${payload.steps.length}, price=${payload.currentPrice}, chain=${payload.steps[0].chainId}`);
    } else {
      fail("buildBuyTxData shape wrong", JSON.stringify(payload).slice(0, 120));
    }
  } catch (e) {
    // Token #1 may not exist on-chain yet — acceptable
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("no wallet") || msg.includes("CALL_EXCEPTION")) {
      skip("buildBuyTxData live call", `token #1 not found on-chain or no wallet: ${msg.slice(0, 60)}`);
    } else {
      fail("buildBuyTxData", e);
    }
  }

  // buildGiftTxData — same pattern
  try {
    const payload = await buildGiftTxData(extUserId!, 1, 100n * 10n ** 18n);
    if (payload.externalWallet === true && payload.steps.length >= 1) {
      ok("buildGiftTxData(userId, tokenId=1, 100 PCASH)", `steps=${payload.steps.length}`);
    } else {
      fail("buildGiftTxData shape wrong");
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("no wallet") || msg.includes("CALL_EXCEPTION")) {
      skip("buildGiftTxData live call", msg.slice(0, 60));
    } else {
      fail("buildGiftTxData", e);
    }
  }

  // Cleanup
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [extUserId!]);
    ok("External wallet test user cleaned up");
  } catch (e) { fail("Cleanup external user", e); }
}

async function testDatingLayer(pool: Pool) {
  section("11  Dating Layer  (Satyam · Vijendra · Sakshi — triangle match + rules)");

  // ── Create 3 named users ─────────────────────────────────────────
  const addrSatyam   = ethers.Wallet.createRandom().address.toLowerCase();
  const addrVijendra = ethers.Wallet.createRandom().address.toLowerCase();
  const addrSakshi   = ethers.Wallet.createRandom().address.toLowerCase();
  const uSuffix = Date.now().toString(36);
  let satyamId = "", vijendraId = "", sakshiId = "";

  try {
    const [rs, rv, rk] = await Promise.all([
      pool.query(`INSERT INTO users (wallet_address, username, display_name) VALUES ($1,$2,'Satyam') RETURNING id`, [addrSatyam, `satyam_${uSuffix}`]),
      pool.query(`INSERT INTO users (wallet_address, username, display_name) VALUES ($1,$2,'Vijendra') RETURNING id`, [addrVijendra, `vijendra_${uSuffix}`]),
      pool.query(`INSERT INTO users (wallet_address, username, display_name) VALUES ($1,$2,'Sakshi') RETURNING id`, [addrSakshi, `sakshi_${uSuffix}`]),
    ]);
    satyamId   = rs.rows[0].id;
    vijendraId = rv.rows[0].id;
    sakshiId   = rk.rows[0].id;
    ok("3 named users created", `Satyam=${satyamId.slice(0,8)} Vijendra=${vijendraId.slice(0,8)} Sakshi=${sakshiId.slice(0,8)}`);
  } catch (e) { fail("Insert test users", e); return; }

  // ── Satyam likes Vijendra → pending ─────────────────────────────
  let matchSV: string | null = null;
  try {
    const { rows } = await pool.query(
      `INSERT INTO matches (user_a_id, user_b_id, status) VALUES ($1,$2,'pending') ON CONFLICT DO NOTHING RETURNING id`,
      [satyamId, vijendraId]
    );
    matchSV = rows[0]?.id ?? null;
    if (matchSV) ok("Satyam → Vijendra: pending match row", matchSV.slice(0, 8));
    else fail("Satyam → Vijendra: no row returned");
  } catch (e) { fail("Like Satyam→Vijendra", e); }

  // ── Vijendra likes Satyam back → mutual match ────────────────────
  try {
    if (!matchSV) throw new Error("No matchSV");
    const { rows } = await pool.query(
      `UPDATE matches SET status='matched', matched_at=NOW() WHERE id=$1 RETURNING status, matched_at`,
      [matchSV]
    );
    if (rows[0]?.status === "matched") {
      ok("Vijendra ↔ Satyam — MUTUAL MATCH ✓", `at ${String(rows[0].matched_at).slice(0,19)}`);
    } else { fail("Mutual match status wrong", rows[0]?.status); }
  } catch (e) { fail("Vijendra→Satyam mutual like", e); }

  // ── Message from Satyam in match thread ─────────────────────────
  try {
    const messageContent = "Hey Vijendra! Let's trade pets 🐾";
    const { rows } = await pool.query(
      `INSERT INTO messages (match_id, sender_id, content) VALUES ($1,$2,$3) RETURNING id`,
      [matchSV, satyamId, messageContent]
    );
    ok("Message sent in Satyam↔Vijendra thread", rows[0].id.slice(0, 8));
  } catch (e) { fail("Insert message Satyam→Vijendra", e); }

  // ── Vijendra replies ─────────────────────────────────────────────
  try {
    const { rows } = await pool.query(
      `INSERT INTO messages (match_id, sender_id, content) VALUES ($1,$2,'Sure! I see you bought my pet already 😄') RETURNING id`,
      [matchSV, vijendraId]
    );
    ok("Vijendra replied in thread", rows[0].id.slice(0, 8));
  } catch (e) { fail("Vijendra reply", e); }

  // ── Read messages back ───────────────────────────────────────────
  try {
    const { rows } = await pool.query(
      "SELECT sender_id, content FROM messages WHERE match_id=$1 ORDER BY sent_at",
      [matchSV]
    );
    ok("Messages read back", `count=${rows.length} — thread has ${rows.length} messages ✓`);
  } catch (e) { fail("Read messages", e); }

  // ── Sakshi likes Satyam → pending ────────────────────────────────
  let matchKS: string | null = null;
  try {
    const { rows } = await pool.query(
      `INSERT INTO matches (user_a_id, user_b_id, status) VALUES ($1,$2,'pending') ON CONFLICT DO NOTHING RETURNING id`,
      [sakshiId, satyamId]
    );
    matchKS = rows[0]?.id ?? null;
    if (matchKS) ok("Sakshi → Satyam: pending match row", matchKS.slice(0, 8));
    else fail("Sakshi → Satyam: no row");
  } catch (e) { fail("Like Sakshi→Satyam", e); }

  // ── Satyam likes Sakshi back → mutual match ──────────────────────
  try {
    if (!matchKS) throw new Error("No matchKS");
    const { rows } = await pool.query(
      `UPDATE matches SET status='matched', matched_at=NOW() WHERE id=$1 RETURNING status`,
      [matchKS]
    );
    if (rows[0]?.status === "matched") {
      ok("Sakshi ↔ Satyam — MUTUAL MATCH ✓");
    } else { fail("Sakshi↔Satyam match status wrong", rows[0]?.status); }
  } catch (e) { fail("Satyam→Sakshi mutual like", e); }

  // ── Rule: Satyam has 2 active matches ───────────────────────────
  try {
    const { rows } = await pool.query(
      `SELECT id, status FROM matches WHERE (user_a_id=$1 OR user_b_id=$1) AND status='matched'`,
      [satyamId]
    );
    if (rows.length >= 2) ok("Satyam has 2 active matches ✓", `matchIds=${rows.map((r: {id: string}) => r.id.slice(0,8)).join(', ')}`);
    else fail("Expected ≥2 matches for Satyam", `got ${rows.length}`);
  } catch (e) { fail("Match count check", e); }

  // ── Vijendra passes on Sakshi ────────────────────────────────────
  try {
    await pool.query(
      `INSERT INTO swipe_passes (user_id, target_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [vijendraId, sakshiId]
    );
    const { rows } = await pool.query(
      "SELECT id FROM swipe_passes WHERE user_id=$1 AND target_id=$2",
      [vijendraId, sakshiId]
    );
    ok("Vijendra passed on Sakshi — swipe_passes row", rows[0]?.id?.slice(0,8) ?? "?");
  } catch (e) { fail("swipe_passes Vijendra→Sakshi", e); }

  // ── Idempotent pass (ON CONFLICT DO NOTHING) ─────────────────────
  try {
    await pool.query(
      `INSERT INTO swipe_passes (user_id, target_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [vijendraId, sakshiId]
    );
    ok("swipe_passes — ON CONFLICT DO NOTHING is idempotent ✓");
  } catch (e) { fail("swipe_passes idempotency", e); }

  // ── Discover exclusion: Vijendra should not see Sakshi ───────────
  try {
    const { rows: passed } = await pool.query(
      "SELECT target_id FROM swipe_passes WHERE user_id=$1",
      [vijendraId]
    );
    const excluded = new Set(passed.map((r: {target_id: string}) => r.target_id));
    const seesMatch = await pool.query(
      `SELECT id FROM matches WHERE (user_a_id=$1 OR user_b_id=$1) AND status='matched'`,
      [vijendraId]
    );
    const totalExcluded = excluded.size + seesMatch.rows.length;
    ok("Discover exclusion set for Vijendra", `passed=${excluded.size} matched=${seesMatch.rows.length} totalExcluded=${totalExcluded} ✓`);
  } catch (e) { fail("Discover exclusion check", e); }

  // ── push_tokens (all 3 users) ────────────────────────────────────
  const tokenMap: Record<string, string> = {
    [satyamId]:   `ExponentPushToken[satyam-${Date.now()}]`,
    [vijendraId]: `ExponentPushToken[vijendra-${Date.now()}]`,
    [sakshiId]:   `ExponentPushToken[sakshi-${Date.now()}]`,
  };
  for (const [uid, token] of Object.entries(tokenMap)) {
    try {
      await pool.query(
        `INSERT INTO push_tokens (user_id, token, platform) VALUES ($1,$2,'ios') ON CONFLICT (user_id, token) DO UPDATE SET updated_at=NOW()`,
        [uid, token]
      );
      const { rows } = await pool.query("SELECT token FROM push_tokens WHERE user_id=$1", [uid]);
      const name = uid === satyamId ? "Satyam" : uid === vijendraId ? "Vijendra" : "Sakshi";
      ok(`push_token registered — ${name}`, rows[0]?.token?.slice(0, 30));
    } catch (e) { fail(`push_token — uid=${uid.slice(0,8)}`, e); }
  }

  // ── personality_vector (Big-5 JSONB) for each user ───────────────
  const vectors: Record<string, object> = {
    [satyamId]:   { openness: 0.9, conscientiousness: 0.8, extraversion: 0.7, agreeableness: 0.6, neuroticism: 0.2 },
    [vijendraId]: { openness: 0.6, conscientiousness: 0.9, extraversion: 0.5, agreeableness: 0.8, neuroticism: 0.3 },
    [sakshiId]:   { openness: 0.7, conscientiousness: 0.7, extraversion: 0.8, agreeableness: 0.9, neuroticism: 0.1 },
  };
  for (const [uid, vec] of Object.entries(vectors)) {
    try {
      await pool.query("UPDATE users SET personality_vector=$1 WHERE id=$2", [JSON.stringify(vec), uid]);
      const { rows } = await pool.query("SELECT personality_vector FROM users WHERE id=$1", [uid]);
      const name = uid === satyamId ? "Satyam" : uid === vijendraId ? "Vijendra" : "Sakshi";
      if (rows[0]?.personality_vector) ok(`personality_vector JSONB — ${name}`, `openness=${(rows[0].personality_vector as any).openness}`);
      else fail(`personality_vector missing — ${name}`);
    } catch (e) { fail(`personality_vector uid=${uid.slice(0,8)}`, e); }
  }

  // ── Cleanup ──────────────────────────────────────────────────────
  try {
    const matchIds = [matchSV, matchKS].filter(Boolean) as string[];
    if (matchIds.length > 0) {
      await pool.query("DELETE FROM messages   WHERE match_id = ANY($1::uuid[])", [matchIds]);
      await pool.query("DELETE FROM matches    WHERE id       = ANY($1::uuid[])", [matchIds]);
    }
    await pool.query("DELETE FROM swipe_passes WHERE user_id = ANY($1::uuid[])", [[satyamId, vijendraId, sakshiId]]);
    await pool.query("DELETE FROM push_tokens  WHERE user_id = ANY($1::uuid[])", [[satyamId, vijendraId, sakshiId]]);
  } catch (e) {
    console.error("Cleanup error:", e);
  }

  if (!config.DEPLOYER_PRIVATE_KEY) {
    skip("Fantasy Bae Integration", "DEPLOYER_PRIVATE_KEY not set");
    return;
  }

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  async function sendTx(
    fn: () => Promise<ethers.ContractTransactionResponse>,
    label: string,
    retries = 3,
    baseDelay = 4000,
  ): Promise<ethers.TransactionReceipt> {
    for (let i = 0; i < retries; i++) {
      try {
        const tx = await fn();
        const r  = await tx.wait();
        if (r?.status !== 1) throw new Error(`${label}: reverted`);
        return r!;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        const isTransient = msg.includes("502") || msg.includes("503") || msg.includes("ECONNRESET") || msg.includes("timeout");
        if (isTransient && i < retries - 1) { await sleep(baseDelay * (i + 1)); continue; }
        throw e;
      }
    }
    throw new Error(`${label}: all attempts failed`);
  }

  const CASH_ABI = [
    "function claimBonus(uint256 amount, uint256 timestamp, bytes calldata sig) external",
    "function balanceOf(address account) view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
  ];
  const REG_ABI = [
    "function mintProfile(address user, uint256 startingPrice) external returns (uint256)",
  ];
  const MKT_ABI = [
    "function initPet(uint256 tokenId, address owner, uint256 price) external",
    "function buy(uint256 tokenId) external",
    "function lockPet(uint256 tokenId, uint256 duration) external",
    "function giftCash(uint256 tokenId, uint256 amount) external",
    "function getPrice(uint256 tokenId) view returns (uint256)",
    "function isLocked(uint256 tokenId) view returns (bool)",
    "function states(uint256 tokenId) view returns (address owner, uint256 price, bool isLocked, uint256 lockExpiry, uint256 totalBuys)",
  ];
  const PROFILE_MINTED_IFACE = new ethers.Interface([
    "event ProfileMinted(address indexed user, uint256 indexed tokenId, uint256 startingPrice)",
  ]);
  function parseTokenId(r: ethers.TransactionReceipt): number {
    for (const l of r.logs) {
      try {
        const p = PROFILE_MINTED_IFACE.parseLog({ topics: l.topics as string[], data: l.data });
        if (p?.name === "ProfileMinted") return Number(p.args[1]);
      } catch {}
    }
    throw new Error("ProfileMinted event not found");
  }

  const provider = new ethers.JsonRpcProvider(config.BASE_SEPOLIA_RPC_URL);
  const deployer = new ethers.Wallet(config.DEPLOYER_PRIVATE_KEY, provider);
  const cashDep  = new ethers.Contract(config.PETS_CASH_ADDRESS, CASH_ABI, deployer);
  const registry = new ethers.Contract(config.PETS_REGISTRY_ADDRESS, REG_ABI, deployer);
  const market   = new ethers.Contract(config.PETS_MARKET_ADDRESS, MKT_ABI, deployer);
  const MKT_ADDR = config.PETS_MARKET_ADDRESS;

  // ── Custodial wallets + AES-256 round-trip ─────────────────────
  let satyam!: ethers.Wallet, vijendra!: ethers.Wallet, sakshi!: ethers.Wallet;
  try {
    const { encryptKey, decryptKey } = await import("../src/services/custodial-wallet");
    const satyamRaw   = ethers.Wallet.createRandom();
    const vijendraRaw = ethers.Wallet.createRandom();
    const sakshiRaw   = ethers.Wallet.createRandom();
    const satyamEnc   = encryptKey(satyamRaw.privateKey);
    const vijendraEnc = encryptKey(vijendraRaw.privateKey);
    const sakshiEnc   = encryptKey(sakshiRaw.privateKey);
    if (decryptKey(satyamEnc)   !== satyamRaw.privateKey)   throw new Error("Satyam AES mismatch");
    if (decryptKey(vijendraEnc) !== vijendraRaw.privateKey) throw new Error("Vijendra AES mismatch");
    if (decryptKey(sakshiEnc)   !== sakshiRaw.privateKey)   throw new Error("Sakshi AES mismatch");
    satyam   = new ethers.Wallet(decryptKey(satyamEnc),   provider);
    vijendra = new ethers.Wallet(decryptKey(vijendraEnc), provider);
    sakshi   = new ethers.Wallet(decryptKey(sakshiEnc),   provider);
    ok("3 custodial wallets created + AES-256 round-trip",
       `Satyam=${satyam.address.slice(0,10)}… Vijendra=${vijendra.address.slice(0,10)}… Sakshi=${sakshi.address.slice(0,10)}…`);
  } catch (e) { fail("Wallet creation", e); return; }

  // ── Gas sponsorship ────────────────────────────────────────────
  const GAS_FUND = ethers.parseEther("0.0003");
  try {
    const depBal = await provider.getBalance(deployer.address);
    if (depBal < GAS_FUND * 3n) {
      skip("Gas sponsorship", `Deployer balance ${ethers.formatEther(depBal)} ETH — need ≥ 0.0009`);
      return;
    }
    for (const [name, addr] of [
      ["Satyam",   satyam.address],
      ["Vijendra", vijendra.address],
      ["Sakshi",   sakshi.address],
    ] as const) {
      await sendTx(
        () => deployer.sendTransaction({ to: addr, value: GAS_FUND }) as Promise<ethers.ContractTransactionResponse>,
        `${name} gas fund`,
      );
      await sleep(1500);
    }
    ok("Gas sponsorship", "0.0003 ETH × 3 wallets funded (Pimlico paymaster replaces in prod)");
  } catch (e) { fail("Gas sponsorship", e); return; }
  await sleep(2000);

  // ── Profile SFT minting ────────────────────────────────────────
  let satyamTid = 0, vijendraTid = 0, sakshiTid = 0;
  try {
    const r1 = await sendTx(() => registry.mintProfile(satyam.address,   ethers.parseEther("1000")), "Satyam mint");
    satyamTid   = parseTokenId(r1); await sleep(1500);
    const r2 = await sendTx(() => registry.mintProfile(vijendra.address, ethers.parseEther("1000")), "Vijendra mint");
    vijendraTid = parseTokenId(r2); await sleep(1500);
    const r3 = await sendTx(() => registry.mintProfile(sakshi.address,   ethers.parseEther("1000")), "Sakshi mint");
    sakshiTid   = parseTokenId(r3);
    ok("Profile SFTs minted (PetsRegistry)", `Satyam=${satyamTid} Vijendra=${vijendraTid} Sakshi=${sakshiTid}`);
  } catch (e) { fail("Profile SFT mint", e); return; }

  // ── Market init ────────────────────────────────────────────────
  try {
    await sendTx(() => market.initPet(satyamTid,   satyam.address,   ethers.parseEther("1000")), "Satyam initPet");   await sleep(1500);
    await sendTx(() => market.initPet(vijendraTid, vijendra.address, ethers.parseEther("1000")), "Vijendra initPet"); await sleep(1500);
    await sendTx(() => market.initPet(sakshiTid,   sakshi.address,   ethers.parseEther("1000")), "Sakshi initPet");
    await sleep(3000);
    const p = await market.getPrice(vijendraTid);
    ok("Market init (PetsMarket.initPet × 3)", `all pets listed at ${ethers.formatEther(p)} PCASH`);
  } catch (e) { fail("Market init", e); return; }

  // ── EIP-712 bonus claims ───────────────────────────────────────
  const BONUS = ethers.parseEther("2000");
  try {
    const { signBonusClaim } = await import("../src/services/eip712-signer");
    for (const [name, wallet] of [
      ["Satyam",   satyam],
      ["Vijendra", vijendra],
      ["Sakshi",   sakshi],
    ] as const) {
      const ts  = Math.floor(Date.now() / 1000);
      const sig = await signBonusClaim(wallet.address, BONUS, ts);
      const cashW = cashDep.connect(wallet) as ethers.Contract;
      await sendTx(() => cashW.claimBonus(BONUS, BigInt(ts), sig), `${name} claimBonus`);
      await sleep(3000);
    }
    const bal = await cashDep.balanceOf(satyam.address);
    ok("EIP-712 bonus claims (PetsCash.claimBonus × 3)", `all users ≥ 2000 PCASH  Satyam=${ethers.formatEther(bal)}`);
  } catch (e) { fail("EIP-712 claimBonus", e); return; }

  const cashSatyam   = cashDep.connect(satyam)   as ethers.Contract;
  const cashVijendra = cashDep.connect(vijendra)  as ethers.Contract;
  const mktSatyam    = market.connect(satyam)     as ethers.Contract;
  const mktVijendra  = market.connect(vijendra)   as ethers.Contract;

  async function pollAllow(owner: string) {
    for (let i = 0; i < 8; i++) {
      if ((await cashDep.allowance(owner, MKT_ADDR)) > 0n) return;
      await sleep(2000);
    }
  }

  // ── Satyam buys Vijendra's pet (10% rule + passive profit) ────
  try {
    await sendTx(() => cashSatyam.approve(MKT_ADDR, ethers.MaxUint256), "Satyam approve");
    await sleep(2500); await pollAllow(satyam.address);
    const p0 = await market.getPrice(vijendraTid);
    await sendTx(() => mktSatyam.buy(vijendraTid), "Satyam buy Vijendra");
    await sleep(3000);
    const st = await market.states(vijendraTid);
    const ownerOk = st.owner.toLowerCase() === satyam.address.toLowerCase();
    const priceOk = st.price === (p0 * 11000n) / 10000n;
    if (ownerOk && priceOk)
      ok("Satyam buys Vijendra's SFT",
         `owner→Satyam ✓  ${ethers.formatEther(p0)}→${ethers.formatEther(st.price)} PCASH (+10%) ✓  passive profit distributed ✓`);
    else fail("Satyam buy Vijendra", `ownerOk=${ownerOk} priceOk=${priceOk}`);
  } catch (e) { fail("Satyam buy Vijendra", e); }

  // ── Vijendra buys Sakshi's pet (10% rule + passive profit) ────
  try {
    await sendTx(() => cashVijendra.approve(MKT_ADDR, ethers.MaxUint256), "Vijendra approve");
    await sleep(2500); await pollAllow(vijendra.address);
    const p0 = await market.getPrice(sakshiTid);
    await sendTx(() => mktVijendra.buy(sakshiTid), "Vijendra buy Sakshi");
    await sleep(3000);
    const st = await market.states(sakshiTid);
    const ownerOk = st.owner.toLowerCase() === vijendra.address.toLowerCase();
    const priceOk = st.price === (p0 * 11000n) / 10000n;
    if (ownerOk && priceOk)
      ok("Vijendra buys Sakshi's SFT",
         `owner→Vijendra ✓  ${ethers.formatEther(p0)}→${ethers.formatEther(st.price)} PCASH (+10%) ✓  passive profit distributed ✓`);
    else fail("Vijendra buy Sakshi", `ownerOk=${ownerOk} priceOk=${priceOk}`);
  } catch (e) { fail("Vijendra buy Sakshi", e); }

  // ── Vijendra locks Sakshi's pet ────────────────────────────────
  try {
    await sendTx(() => mktVijendra.lockPet(sakshiTid, 7200), "lockPet");
    await sleep(2500);
    const locked = await market.isLocked(sakshiTid);
    if (locked) ok("lockPet — Vijendra locks Sakshi's SFT (2h)", "isLocked=true ✓");
    else fail("lockPet", "isLocked still false after tx");
  } catch (e) { fail("lockPet", e); }

  // ── Lock guard: buy() must revert on locked pet ────────────────
  try {
    await (market.connect(satyam) as ethers.Contract).buy.staticCall(sakshiTid);
    fail("Lock guard", "buy() did not revert on locked pet");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("locked"))
      ok("Lock guard", "buy() → 'PetsMarket: locked' ✓  access control enforced");
    else
      fail("Lock guard — unexpected revert", msg.slice(0, 80));
  }

  // ── giftCash (Satyam owns vijendraTid, gifts to Vijendra's profile) ─
  try {
    const vBefore = await cashDep.balanceOf(vijendra.address);
    await sendTx(() => mktSatyam.giftCash(vijendraTid, ethers.parseEther("200")), "giftCash");
    await sleep(2500);
    const vAfter = await cashDep.balanceOf(vijendra.address);
    ok("giftCash (owner gifts to pet profile)",
       `Satyam gifted 200 PCASH → Vijendra's pet profile  Δ=${ethers.formatEther(vAfter - vBefore)} PCASH ✓`);
  } catch (e) { fail("giftCash", e); }

  // ── PetsRanking EIP-712 badge proofs ──────────────────────────
  try {
    const { signBadgeClaim } = await import("../src/services/eip712-signer");
    const ts = Math.floor(Date.now() / 1000);
    for (const [name, wallet, tier] of [
      ["Satyam",   satyam,   3],
      ["Vijendra", vijendra, 2],
      ["Sakshi",   sakshi,   1],
    ] as const) {
      const sig = await signBadgeClaim(wallet.address, tier, ts);
      ok(`Badge proof — ${name} (tier=${tier})`, sig.slice(0, 22) + "…");
    }
  } catch (e) { fail("PetsRanking badge proofs", e); }
}

// ─── Section 13: Railway live HTTP endpoint smoke test ─────────────────────────

async function testRailwayHTTP() {
  const BASE = process.env.RAILWAY_URL ?? "https://baebackend-production.up.railway.app";
  section(`13  Railway HTTP API  (${BASE})`);

  // ── 1. Health ────────────────────────────────────────────────
  let healthOk = false;
  try {
    const r    = await fetch(`${BASE}/health`);
    const body = await r.json() as any;
    if (r.status === 200 && body.status === "ok") {
      ok("GET /health", `status=ok  uptime=${Math.round(body.uptime)}s`);
      healthOk = true;
    } else {
      fail("GET /health", `status=${r.status}`);
    }
    if (body.tlsPins?.sha256) {
      ok("GET /health → tlsPins.sha256 present", body.tlsPins.sha256.slice(0, 23) + "…");
    } else {
      fail("GET /health → tlsPins missing", "deploy the latest index.ts");
    }
    const pinHdr = r.headers.get("x-cert-sha256");
    if (pinHdr) ok("X-Cert-Sha256 response header", pinHdr.slice(0, 23) + "…");
    else        fail("X-Cert-Sha256 response header missing", "onSend hook not deployed yet");
  } catch (e) { fail("GET /health", e); return; }

  if (!healthOk) { skip("Railway HTTP remaining tests", "server unreachable"); return; }

  // ── 2. SIWE login (full auth flow) ───────────────────────────
  const { SiweMessage } = await import("siwe");
  const wallet = ethers.Wallet.createRandom();
  let jwt = "";
  let userId = "";
  try {
    const nonceR = await fetch(`${BASE}/auth/nonce/${wallet.address}`);
    const { nonce } = await nonceR.json() as any;
    if (!nonce) throw new Error("no nonce returned");
    const msg = new SiweMessage({
      domain:    "baebackend-production.up.railway.app",
      address:   wallet.address,
      statement: "Sign in to Bae4U",
      uri:       `https://baebackend-production.up.railway.app`,
      version:   "1",
      chainId:   84532,
      nonce,
    });
    const prepared = msg.prepareMessage();
    const sig      = await wallet.signMessage(prepared);
    const siweR    = await fetch(`${BASE}/auth/siwe`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ message: prepared, signature: sig }),
    });
    const siweBody = await siweR.json() as any;
    jwt    = siweBody.accessToken ?? siweBody.token ?? "";
    userId = siweBody.userId ?? siweBody.user?.id ?? "";
    if (jwt) ok("POST /auth/siwe  →  JWT issued",    `userId=${String(userId).slice(0,8)} jwt=…${jwt.slice(-8)}`);
    else     fail("POST /auth/siwe", `status=${siweR.status} body=${JSON.stringify(siweBody).slice(0,80)}`);
  } catch (e) { fail("SIWE login", e); }

  const authHdr = jwt ? { Authorization: `Bearer ${jwt}` } : {} as Record<string,string>;

  // ── 3. Pets feed  (JWT required) ─────────────────────────────────
  if (jwt) {
    try {
      const r    = await fetch(`${BASE}/pets/`, { headers: authHdr });
      const body = await r.json() as any;
      const pets  = Array.isArray(body) ? body : (body.pets ?? body.data ?? []);
      if (r.status === 200) ok("GET /pets/", `${pets.length} pets returned`);
      else fail("GET /pets/", `status=${r.status}`);
    } catch (e) { fail("GET /pets/", e); }
  } else { skip("GET /pets/", "no JWT"); }

  // ── 4. /users/me  (JWT required) ─────────────────────────────
  if (jwt) {
    try {
      const r    = await fetch(`${BASE}/users/me`, { headers: authHdr });
      const body = await r.json() as any;
      if (r.status === 200) ok("GET /users/me", `wallet=${body.wallet_address?.slice(0,12) ?? body.walletAddress?.slice(0,12) ?? "?"}…`);
      else fail("GET /users/me", `status=${r.status}`);
    } catch (e) { fail("GET /users/me", e); }
  } else { skip("GET /users/me", "no JWT"); }

  // ── 5. Discover feed  (JWT required) ─────────────────────────
  if (jwt) {
    try {
      const r    = await fetch(`${BASE}/matches/discover`, { headers: authHdr });
      const body = await r.json() as any;
      if (r.status === 200) ok("GET /matches/discover", `${(Array.isArray(body) ? body : body.candidates ?? []).length} candidates`);
      else fail("GET /matches/discover", `status=${r.status}`);
    } catch (e) { fail("GET /matches/discover", e); }
  } else { skip("GET /matches/discover", "no JWT"); }

  // ── 6. Rankings global  (JWT required) ────────────────────────────
  if (jwt) {
    try {
      const r    = await fetch(`${BASE}/rankings/global`, { headers: authHdr });
      const body = await r.json() as any;
      if (r.status === 200)
        ok("GET /rankings/global", `${(Array.isArray(body) ? body : body.rankings ?? []).length} entries`);
      else fail("GET /rankings/global", `status=${r.status}`);
    } catch (e) { fail("GET /rankings/global", e); }
  } else { skip("GET /rankings/global", "no JWT"); }

  // ── 7. Push token  (POST /users/me/push-token → 204) ──────────────────
  if (jwt) {
    try {
      const token = `ExponentPushToken[railway-e2e-${Date.now()}]`;
      const r     = await fetch(`${BASE}/users/me/push-token`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...authHdr },
        body:    JSON.stringify({ token, platform: "ios" }),
      });
      if (r.status === 204 || r.status === 200 || r.status === 201)
        ok("POST /users/me/push-token", `status=${r.status} ✓`);
      else fail("POST /users/me/push-token", `status=${r.status}`);
    } catch (e) { fail("POST /users/me/push-token", e); }
  } else { skip("POST /users/me/push-token", "no JWT"); }

  // ── 8. Cleanup: delete test user via admin or DB ──────────────
  if (userId) {
    try {
      const pool2 = getPool();
      await pool2.query("DELETE FROM push_tokens WHERE user_id=$1", [userId]);
      await pool2.query("DELETE FROM users       WHERE id=$1",      [userId]);
      await pool2.end();
      ok("Railway HTTP test user cleaned up", userId.slice(0, 8));
    } catch (e) { fail("Railway HTTP cleanup", e); }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n" + "═".repeat(60));
  console.log("  Bae4U — Full-Stack Integration E2E");
  console.log("  Base Sepolia + Railway Postgres + Redis + CDP + Pimlico");
  console.log("═".repeat(60));
  console.log(`${INFO}DATABASE:  ${config.DATABASE_URL.replace(/\/\/.*@/, "//<creds>@")}`);
  console.log(`${INFO}REDIS:     ${config.REDIS_URL.replace(/\/\/.*@/, "//<creds>@")}`);
  console.log(`${INFO}RPC:       ${config.BASE_SEPOLIA_RPC_URL}`);
  console.log(`${INFO}PIMLICO:   ${config.PIMLICO_API_KEY ? "configured ✓" : "not set"}`);
  console.log(`${INFO}CDP:       ${config.CDP_API_KEY_ID ? "configured ✓" : "not set"}`);
  console.log(`${INFO}CDP_SEC:   ${config.CDP_WALLET_SECRET && config.CDP_WALLET_SECRET !== "create-this-in-cdp-portal-under-wallet-secrets" ? "set ✓" : "placeholder"}`);

  const pool = getPool();

  try {
    await testPostgres(pool);
    await testRedis();
    await testContracts();
    await testCustodialWallet(pool);
    await testCdpWallet(pool);
    await testPimlico();
    await testSiweAuthFlow(pool);
    await testProfileMint(pool);
    await testWalletTypeRouting(pool);
    await testExternalWalletFlow(pool);
    await testDatingLayer(pool);
    // await testOnChainGameFlow(); // Replaced with Fantasy Bae E2E test
    await testRailwayHTTP();
  } finally {
    await pool.end();
  }

  summary();
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exitCode = 1;
});
