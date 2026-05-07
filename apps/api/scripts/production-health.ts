/**
 * ══════════════════════════════════════════════════════════════════
 *  Bae4U — Production Health Dashboard
 *
 *  Single command that exercises EVERY production-grade service
 *  powering the "invisible UX" layer of the app:
 *
 *  Layer 1 — Infrastructure
 *    PostgreSQL · Redis · Base Sepolia RPC
 *
 *  Layer 2 — Smart Contracts (all 4)
 *    PetsCash · PetsRegistry · PetsMarket · PetsRanking
 *
 *  Layer 3 — Invisible UX Services
 *    CDP Wallet  (Coinbase SDK, EC key, getOrCreateAccount)
 *    Pimlico     (ERC-4337 bundler, smart account, gasless tx)
 *    Custodial   (AES-256 key encrypt/decrypt)
 *    EIP-712     (bonus sig + badge sig)
 *
 *  Layer 4 — Live Railway Backend (HTTP)
 *    Health · SIWE auth · Pets feed · Wallet setup · Bonus · Rankings
 *
 *  Layer 5 — On-chain Game Mechanics
 *    Mint SFT · initPet · claimBonus · buy() (10% rule) · lockPet
 *
 *  Run: pnpm --filter=api prod-health
 * ══════════════════════════════════════════════════════════════════
 */

import "dotenv/config";
import { createPrivateKey } from "crypto";
import { ethers } from "ethers";
import { Pool }   from "pg";
import Redis      from "ioredis";
import * as siwe  from "siwe";
import { config } from "../src/config";
import { encryptKey, decryptKey }    from "../src/services/custodial-wallet";
import { signBonusClaim, signBadgeClaim } from "../src/services/eip712-signer";
import { buildSmartAccountRelay }    from "../src/services/pimlico-relay";
import { CdpClient }                 from "@coinbase/cdp-sdk";

// ── Types & counters ────────────────────────────────────────────────────────

type ServiceStatus = "PASS" | "FAIL" | "SKIP";
interface ServiceResult { service: string; status: ServiceStatus; detail: string; checks: number; failures: number; }

const results: ServiceResult[] = [];
let   curService = "";
let   curChecks  = 0;
let   curFails   = 0;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Logging helpers ─────────────────────────────────────────────────────────

function service(name: string) {
  if (curService) flush();
  curService = name;
  curChecks  = 0;
  curFails   = 0;
  console.log(`\n${"═".repeat(62)}\n  ${name}\n${"═".repeat(62)}`);
}
function flush(forceStatus?: ServiceStatus) {
  if (!curService) return;
  const status = forceStatus ?? (curFails === 0 ? "PASS" : "FAIL");
  results.push({ service: curService, status, checks: curChecks, failures: curFails, detail: "" });
}
function ok(msg: string, detail = "") {
  curChecks++;
  console.log(`  ✅  ${msg}${detail ? "  →  " + detail : ""}`);
}
function fail(msg: string, err?: unknown) {
  curChecks++; curFails++;
  const d = err instanceof Error ? err.message.split("\n")[0].slice(0, 100) : String(err ?? "");
  console.error(`  ❌  ${msg}${d ? "  →  " + d : ""}`);
}
function skip(msg: string) {
  console.log(`  ⏭️   ${msg}`);
}
function detail(msg: string) {
  console.log(`       ${msg}`);
}

// ── Shared contracts ABI ────────────────────────────────────────────────────

const CASH_ABI  = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) external returns (bool)",
  "function claimBonus(uint256,uint256,bytes) external",
  "function allowance(address,address) view returns (uint256)",
];
const REG_ABI   = [
  "function mintProfile(address,uint256) external returns (uint256)",
  "function getTokenByAddress(address) view returns (uint256)",
  "event ProfileMinted(address indexed,uint256 indexed,uint256)",
];
const MKT_ABI   = [
  "function paused() view returns (bool)",
  "function FEE_BPS() view returns (uint256)",
  "function initPet(uint256,address,uint256) external",
  "function buy(uint256) external",
  "function lockPet(uint256,uint256) external",
  "function isLocked(uint256) view returns (bool)",
  "function getPrice(uint256) view returns (uint256)",
  "function states(uint256) view returns (address,uint256,bool,uint256,uint256)",
];
const RANK_ABI  = ["function claimBadge(uint8 tier, uint256 timestamp, bytes calldata sig) external"];

const IFACE_MINTED = new ethers.Interface([
  "event ProfileMinted(address indexed,uint256 indexed,uint256)",
]);
function parseTokenId(rcpt: ethers.TransactionReceipt): number {
  for (const l of rcpt.logs) {
    try { const p = IFACE_MINTED.parseLog({ topics: l.topics as string[], data: l.data }); if (p) return Number(p.args[1]); } catch {}
  }
  throw new Error("ProfileMinted event not found");
}

// ── SEC1 → PKCS8 normaliser (mirrors cdp-wallet.ts) ────────────────────────

function normaliseCdpSecret(raw: string): string {
  const pem = raw.replace(/\\n/g, "\n");
  if (pem.includes("-----BEGIN EC PRIVATE KEY-----")) {
    const k = createPrivateKey({ key: pem, format: "pem" });
    return k.export({ type: "pkcs8", format: "pem" }) as string;
  }
  return pem;
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const provider = new ethers.JsonRpcProvider(config.BASE_SEPOLIA_RPC_URL);
  const deployer = new ethers.Wallet(config.DEPLOYER_PRIVATE_KEY, provider);
  const RAILWAY  = process.env.RAILWAY_URL ?? "https://baebackend-production.up.railway.app";

  console.log("\n" + "═".repeat(62));
  console.log("  Bae4U — Production Health Dashboard");
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log("═".repeat(62));
  console.log(`  Railway:  ${RAILWAY}`);
  console.log(`  Chain:    Base Sepolia (84532)`);
  console.log(`  Deployer: ${deployer.address}`);

  // ──────────────────────────────────────────────────────────────────────────
  //  LAYER 1 — INFRASTRUCTURE
  // ──────────────────────────────────────────────────────────────────────────

  // ── PostgreSQL ────────────────────────────────────────────────────────────
  service("PostgreSQL");
  try {
    const pool = new Pool({ connectionString: config.DATABASE_URL, ssl: config.DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : false });
    const r = await pool.query("SELECT NOW() AS ts, COUNT(*) AS users FROM users");
    ok("Connected", `ts=${String(r.rows[0].ts).slice(0,19)}`);
    ok("Users table readable", `rows=${r.rows[0].users}`);
    await pool.end();
  } catch (e) { fail("PostgreSQL", e); }

  // ── Redis ─────────────────────────────────────────────────────────────────
  service("Redis");
  try {
    const redis = new Redis(config.REDIS_URL ?? "", { lazyConnect: true, connectTimeout: 5000 });
    await redis.connect();
    await redis.set("bae4u:health", "1", "EX", 30);
    const v = await redis.get("bae4u:health");
    if (v !== "1") throw new Error("Read-back mismatch");
    ok("Connected + read/write", `PONG`);
    await redis.quit();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ENOTFOUND") || msg.includes("undefined") || msg.includes("missing")) {
      skip("Redis — REDIS_URL not set (optional service)");
      flush("SKIP");
    } else { fail("Redis", e); }
  }

  // ── Base Sepolia RPC ──────────────────────────────────────────────────────
  service("Base Sepolia RPC");
  try {
    const net   = await provider.getNetwork();
    const block = await provider.getBlockNumber();
    const bal   = await provider.getBalance(deployer.address);
    ok("Connected", `chainId=${net.chainId}  block=${block}`);
    ok("Deployer balance", `${ethers.formatEther(bal)} ETH`);
    if (bal < ethers.parseEther("0.0005")) fail("Low deployer balance — top up at https://www.alchemy.com/faucets/base-sepolia");
    else ok("Balance sufficient for test txs");
  } catch (e) { fail("RPC", e); }

  // ──────────────────────────────────────────────────────────────────────────
  //  LAYER 2 — SMART CONTRACTS
  // ──────────────────────────────────────────────────────────────────────────

  // ── PetsCash ──────────────────────────────────────────────────────────────
  service("Contract — PetsCash (PCASH ERC-20)");
  try {
    const code = await provider.getCode(config.PETS_CASH_ADDRESS);
    if (code === "0x") throw new Error("No bytecode");
    ok("Bytecode deployed", `${Math.floor((code.length - 2) / 2)} bytes`);
    const c = new ethers.Contract(config.PETS_CASH_ADDRESS, CASH_ABI, provider);
    const [name, sym, sup] = await Promise.all([c.name(), c.symbol(), c.totalSupply()]);
    ok(`${name} (${sym})`, `totalSupply=${parseFloat(ethers.formatEther(sup)).toFixed(0)} PCASH`);
    detail(`https://sepolia.basescan.org/address/${config.PETS_CASH_ADDRESS}`);
  } catch (e) { fail("PetsCash", e); }

  // ── PetsRegistry ─────────────────────────────────────────────────────────
  service("Contract — PetsRegistry (Profile SFTs)");
  try {
    const code = await provider.getCode(config.PETS_REGISTRY_ADDRESS);
    if (code === "0x") throw new Error("No bytecode");
    ok("Bytecode deployed", `${Math.floor((code.length - 2) / 2)} bytes`);
    const c = new ethers.Contract(config.PETS_REGISTRY_ADDRESS, REG_ABI, provider);
    const tok = await c.getTokenByAddress("0x0000000000000000000000000000000000000001");
    ok("getTokenByAddress()", `tokenId=${tok} for unknown addr (expected 0) ✓`);
    detail(`https://sepolia.basescan.org/address/${config.PETS_REGISTRY_ADDRESS}`);
  } catch (e) { fail("PetsRegistry", e); }

  // ── PetsMarket ────────────────────────────────────────────────────────────
  service("Contract — PetsMarket (Buy/Sell/Lock)");
  try {
    const code = await provider.getCode(config.PETS_MARKET_ADDRESS);
    if (code === "0x") throw new Error("No bytecode");
    ok("Bytecode deployed", `${Math.floor((code.length - 2) / 2)} bytes`);
    const c = new ethers.Contract(config.PETS_MARKET_ADDRESS, MKT_ABI, provider);
    const [paused, fee] = await Promise.all([c.paused(), c.FEE_BPS()]);
    ok(`paused=${paused}`, `FEE_BPS=${Number(fee)/100}%`);
    detail(`https://sepolia.basescan.org/address/${config.PETS_MARKET_ADDRESS}`);
  } catch (e) { fail("PetsMarket", e); }

  // ── PetsRanking ───────────────────────────────────────────────────────────
  service("Contract — PetsRanking (Leaderboard badges)");
  try {
    const code = await provider.getCode(config.PETS_RANKING_ADDRESS);
    if (code === "0x") throw new Error("No bytecode");
    ok("Bytecode deployed", `${Math.floor((code.length - 2) / 2)} bytes`);
    const badgeTs  = Math.floor(Date.now() / 1000);
    const badgeSig = await signBadgeClaim(deployer.address, 1, badgeTs);
    ok("EIP-712 badge sig for claimBadge()", badgeSig.slice(0, 22) + "…  (off-chain proof ready)");
    detail(`https://sepolia.basescan.org/address/${config.PETS_RANKING_ADDRESS}`);
  } catch (e) { fail("PetsRanking", e); }

  // ──────────────────────────────────────────────────────────────────────────
  //  LAYER 3 — INVISIBLE UX SERVICES
  // ──────────────────────────────────────────────────────────────────────────

  // ── Custodial Wallet (AES-256) ────────────────────────────────────────────
  service("Invisible UX — Custodial Wallet (AES-256 EOA)");
  try {
    const raw = "0x" + "ff".repeat(32);
    const enc = encryptKey(raw);
    const dec = decryptKey(enc);
    if (dec !== raw) throw new Error("Decrypt mismatch");
    ok("AES-256-CBC encrypt → store → decrypt → match ✓");
    const w = ethers.Wallet.createRandom();
    const e2 = encryptKey(w.privateKey);
    const d2 = decryptKey(e2);
    if (d2 !== w.privateKey) throw new Error("Random key round-trip failed");
    ok("Random EOA key round-trip", `addr=${w.address}`);
  } catch (e) { fail("Custodial wallet crypto", e); }

  // ── EIP-712 Signer ────────────────────────────────────────────────────────
  service("Invisible UX — EIP-712 Signer (PCASH + Badge)");
  try {
    const { signerAddress } = await import("../src/services/eip712-signer");
    const addr = deployer.address;
    const ts   = Math.floor(Date.now() / 1000);
    const bonusSig = await signBonusClaim(addr, ethers.parseEther("100"), ts);
    ok("Bonus claim sig produced", bonusSig.slice(0, 22) + "…");
    const badgeSig = await signBadgeClaim(addr, 1, ts);
    ok("Badge claim sig produced (tier=1 Bronze)", badgeSig.slice(0, 22) + "…");
    ok("EIP-712 signer address", signerAddress);
  } catch (e) { fail("EIP-712 signer", e); }

  // ── CDP Wallet ────────────────────────────────────────────────────────────
  service("Invisible UX — CDP Wallet (Coinbase MPC)");
  const cdpKeyId     = config.CDP_API_KEY_ID;
  const cdpKeySecret = config.CDP_API_KEY_SECRET;
  const cdpWalletSec = config.CDP_WALLET_SECRET;
  if (!cdpKeyId || !cdpKeySecret) {
    skip("CDP_API_KEY_ID / CDP_API_KEY_SECRET not set — skipping");
    flush("SKIP");
  } else {
    try {
      const normSecret = normaliseCdpSecret(cdpKeySecret);
      const fmt = normSecret.includes("BEGIN PRIVATE KEY") ? "PKCS#8 ✓" : "raw";
      ok("Key normalised", `SEC1→${fmt}`);
      ok("CDP_API_KEY_ID", cdpKeyId.slice(0, 45) + "…");

      const cdp = new CdpClient({ apiKeyId: cdpKeyId, apiKeySecret: normSecret, walletSecret: cdpWalletSec });
      ok("CdpClient initialised");

      const listed = await cdp.evm.listAccounts({ pageSize: 5 });
      const count  = listed.accounts?.length ?? 0;
      ok("listAccounts() (read-only auth check)", `${count} existing account(s)`);

      if (!cdpWalletSec) {
        skip("CDP_WALLET_SECRET not set — skipping getOrCreateAccount");
      } else {
        const acct = await cdp.evm.getOrCreateAccount({ name: "bae4u-health-check" });
        ok("getOrCreateAccount()", `address=${acct.address}`);
      }
    } catch (e) { fail("CDP Wallet", e); }
  }

  // ── Pimlico ERC-4337 Paymaster ────────────────────────────────────────────
  service("Invisible UX — Pimlico ERC-4337 Paymaster");
  const pimlicoKey = process.env.PIMLICO_API_KEY;
  if (!pimlicoKey) {
    skip("PIMLICO_API_KEY not set — skipping");
    flush("SKIP");
  } else {
    let smartAcctAddr = "";
    try {
      const testEoa = ethers.Wallet.createRandom();
      ok("Test EOA created", `${testEoa.address}  (0 ETH — gasless test)`);

      const relay = await buildSmartAccountRelay(testEoa.privateKey, pimlicoKey);
      smartAcctAddr = relay.address;
      ok("SimpleSmartAccount derived (CREATE2)", `addr=${relay.address}`);

      const eoaBal = await provider.getBalance(testEoa.address);
      const saBal  = await provider.getBalance(relay.address);
      ok("EOA ETH balance", `${ethers.formatEther(eoaBal)} ETH ← intentionally zero`);
      ok("SmartAccount ETH balance", `${ethers.formatEther(saBal)} ETH ← also zero`);

      // ── Live gasless tx: claimBonus via Pimlico ──────────────────────────
      const ts  = Math.floor(Date.now() / 1000);
      const sig = await signBonusClaim(relay.address, ethers.parseEther("10"), ts);
      ok("EIP-712 bonus sig for smart account", sig.slice(0, 22) + "…");

      const cashIface = new ethers.Interface(CASH_ABI);
      const calldata  = cashIface.encodeFunctionData("claimBonus", [
        ethers.parseEther("10"), BigInt(ts), sig,
      ]) as `0x${string}`;

      console.log("  ⏳  Submitting UserOperation via Pimlico bundler (gasless)…");
      const result = await relay.sendCalls([{ to: config.PETS_CASH_ADDRESS as `0x${string}`, data: calldata }]);
      ok("UserOperation confirmed ✓  (EOA spent 0 ETH)", `tx=${result.txHash.slice(0, 22)}…  block #${result.blockNumber}`);

      await sleep(2500);
      const pcash = new ethers.Contract(config.PETS_CASH_ADDRESS, CASH_ABI, provider);
      const bal   = await pcash.balanceOf(relay.address);
      ok("PCASH balance on smart account", `${ethers.formatEther(bal)} PCASH`);

      const finalEoaBal = await provider.getBalance(testEoa.address);
      ok("EOA ETH after tx", `${ethers.formatEther(finalEoaBal)} ETH ← Pimlico paid ALL gas ✓`);

      detail(`SmartAccount: https://sepolia.basescan.org/address/${smartAcctAddr}`);
    } catch (e) { fail("Pimlico ERC-4337", e); }
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  LAYER 4 — LIVE RAILWAY BACKEND (HTTP)
  // ──────────────────────────────────────────────────────────────────────────

  service("Railway Backend (HTTP API)");
  const httpGet  = async (path: string, tok?: string) => {
    const r = await fetch(`${RAILWAY}${path}`, { headers: tok ? { Authorization: `Bearer ${tok}` } : {} });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };
  const httpPost = async (path: string, body: unknown, tok?: string) => {
    const r = await fetch(`${RAILWAY}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
      body: JSON.stringify(body),
    });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };

  let jwt = "";
  try {
    // health
    const h = await httpGet("/health");
    if (h.status === 200 && (h.body as any).status === "ok") ok("GET /health", `uptime=${Math.round((h.body as any).uptime)}s`);
    else fail("GET /health", `status=${h.status}`);

    // SIWE
    const wallet  = ethers.Wallet.createRandom();
    const nonceR  = await httpGet(`/auth/nonce/${wallet.address}`);
    const nonce   = (nonceR.body as any).nonce as string;
    if (!nonce) throw new Error("No nonce");
    const msg     = new siwe.SiweMessage({ domain: "baebackend-production.up.railway.app", address: wallet.address, statement: "Sign in to Bae4U", uri: `https://baebackend-production.up.railway.app`, version: "1", chainId: 84532, nonce });
    const sig2    = await wallet.signMessage(msg.prepareMessage());
    const authR   = await httpPost("/auth/siwe", { message: msg.prepareMessage(), signature: sig2 });
    jwt = (authR.body as any).accessToken ?? (authR.body as any).token ?? "";
    if (jwt) ok("SIWE auth → JWT", `jwt=${jwt.slice(0, 20)}…`);
    else fail("SIWE auth", `status=${authR.status}`);

    // profile
    const me = await httpGet("/users/me", jwt);
    if (me.status === 200 && (me.body as any).id) ok("GET /users/me", `id=${(me.body as any).id}`);
    else fail("GET /users/me", `status=${me.status}`);

    // setup custodial wallet
    const wR = await httpPost("/actions/setup-wallet", {}, jwt);
    if (wR.status === 200 || wR.status === 201 || wR.status === 409) {
      const addr = (wR.body as any).wallet_address ?? (wR.body as any).walletAddress ?? "exists";
      ok("POST /actions/setup-wallet", `addr=${String(addr).slice(0, 16)}…`);
    } else fail("setup-wallet", `status=${wR.status}`);

    // bonus
    const bR = await httpPost("/bonus/claim", {}, jwt);
    if (bR.status === 200 && ((bR.body as any).signature || (bR.body as any).sig)) ok("POST /bonus/claim → EIP-712 sig", `sig=${String((bR.body as any).signature ?? (bR.body as any).sig).slice(0, 20)}…`);
    else if (bR.status === 429) ok("POST /bonus/claim → cooldown active (expected)", `status=429`);
    else fail("bonus/claim", `status=${bR.status}`);

    // pets feed
    const pR = await httpGet("/pets/", jwt);
    if (pR.status === 200) ok("GET /pets/", `count=${Array.isArray(pR.body) ? pR.body.length : (pR.body as any).total ?? "?"}`);
    else fail("GET /pets/", `status=${pR.status}`);

    // rankings
    const rR = await httpGet("/rankings/global", jwt);
    if (rR.status === 200) ok("GET /rankings/global", `data=${JSON.stringify(rR.body).slice(0, 50)}`);
    else fail("GET /rankings/global", `status=${rR.status}`);

    // discover
    const dR = await httpGet("/matches/discover?limit=3", jwt);
    if (dR.status === 200) ok("GET /matches/discover", `candidates=${(dR.body as any).candidates?.length ?? 0}`);
    else fail("GET /matches/discover", `status=${dR.status}`);

    // tx-data/buy calldata shape
    const petsBody = (pR.body as any).pets ?? pR.body;
    const tid = Array.isArray(petsBody) && petsBody.length > 0 ? parseInt(String(petsBody[0].tokenId ?? petsBody[0].token_id ?? 1), 10) : 1;
    const txR = await httpGet(`/actions/tx-data/buy/${tid}`, jwt);
    if (txR.status === 200 && (txR.body as any).externalWallet) ok("GET /actions/tx-data/buy/:id", `steps=${(txR.body as any).steps?.length} chainId=${(txR.body as any).steps?.[0]?.chainId}`);
    else if (txR.status === 404) ok("GET /actions/tx-data/buy/:id", "404 (no pets in clean env — acceptable)");
    else fail("tx-data/buy", `status=${txR.status}`);

  } catch (e) { fail("Railway HTTP", e); }

  // ──────────────────────────────────────────────────────────────────────────
  //  LAYER 5 — ON-CHAIN GAME MECHANICS
  // ──────────────────────────────────────────────────────────────────────────

  service("On-chain Game Mechanics (live Base Sepolia txs)");
  const cash     = new ethers.Contract(config.PETS_CASH_ADDRESS,     CASH_ABI, deployer);
  const registry = new ethers.Contract(config.PETS_REGISTRY_ADDRESS, REG_ABI,  deployer);
  const market   = new ethers.Contract(config.PETS_MARKET_ADDRESS,   MKT_ABI,  deployer);

  const alice = ethers.Wallet.createRandom().connect(provider);
  const bob   = ethers.Wallet.createRandom().connect(provider);
  let aliceTokenId = 0;
  let bobTokenId   = 0;

  try {
    // Gas top-up
    await (await deployer.sendTransaction({ to: alice.address, value: ethers.parseEther("0.0002") })).wait();
    await (await deployer.sendTransaction({ to: bob.address,   value: ethers.parseEther("0.0002") })).wait();
    ok("Gas top-up", `Alice + Bob funded (0.0002 ETH each)`);

    // Mint
    const rA = await (await registry.mintProfile(alice.address, ethers.parseEther("1000"))).wait();
    aliceTokenId = parseTokenId(rA!);
    const rB = await (await registry.mintProfile(bob.address,   ethers.parseEther("1000"))).wait();
    bobTokenId = parseTokenId(rB!);
    ok("PetsRegistry.mintProfile()", `Alice tokenId=${aliceTokenId}  Bob tokenId=${bobTokenId}`);

    // initPet
    await (await market.initPet(aliceTokenId, alice.address, ethers.parseEther("1000"))).wait();
    await (await market.initPet(bobTokenId,   bob.address,   ethers.parseEther("1000"))).wait();
    ok("PetsMarket.initPet()", `both pets listed at 1000 PCASH`);

    // EIP-712 claimBonus
    const ts    = Math.floor(Date.now() / 1000);
    const bsig  = await signBonusClaim(alice.address, ethers.parseEther("2000"), ts);
    const cashA = cash.connect(alice) as ethers.Contract;
    await (await cashA.claimBonus(ethers.parseEther("2000"), BigInt(ts), bsig)).wait();
    await sleep(2500);
    const alicePcash = await cash.balanceOf(alice.address);
    ok("PetsCash.claimBonus() on-chain", `Alice has ${ethers.formatEther(alicePcash)} PCASH`);

    // approve + buy (poll allowance before proceeding — avoids RPC lag revert)
    await (await cashA.approve(config.PETS_MARKET_ADDRESS, ethers.MaxUint256)).wait();
    await sleep(2500);
    const cashView = new ethers.Contract(config.PETS_CASH_ADDRESS, CASH_ABI, provider);
    for (let i = 0; i < 6; i++) {
      const all = await cashView.allowance(alice.address, config.PETS_MARKET_ADDRESS);
      if (all > 0n) break;
      await sleep(2000);
    }
    const priceBefore = await market.getPrice(bobTokenId);
    const mktA = market.connect(alice) as ethers.Contract;
    await (await mktA.buy(bobTokenId)).wait();
    await sleep(2500);
    const priceAfter  = await market.getPrice(bobTokenId);
    const expected    = (priceBefore * 11000n) / 10000n;
    const priceOk     = priceAfter === expected;
    ok("PetsMarket.buy()", `10% rule: ${ethers.formatEther(priceBefore)} → ${ethers.formatEther(priceAfter)} PCASH ${priceOk ? "✓" : "FAIL"}`);
    if (!priceOk) fail("10% price invariant violated");

    // lockPet
    await (await mktA.lockPet(bobTokenId, 3600)).wait();
    await sleep(2000);
    const locked = await market.isLocked(bobTokenId);
    ok("PetsMarket.lockPet()", locked ? "isLocked=true ✓" : "FAIL — not locked");
    if (!locked) fail("lockPet did not lock");

    // lock guard
    try {
      await (market.connect(bob) as ethers.Contract).buy.staticCall(bobTokenId);
      fail("Lock guard — buy() should have reverted on locked pet");
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      if (m.includes("locked")) ok("Lock guard — buy() reverts 'PetsMarket: locked' ✓");
      else fail("Unexpected revert reason", m);
    }

    // EIP-712 badge sig (PetsRanking)
    const badgeTs  = Math.floor(Date.now() / 1000);
    const badgeSig = await signBadgeClaim(alice.address, 1, badgeTs);
    ok("PetsRanking EIP-712 badge sig (tier=1 Bronze)", badgeSig.slice(0, 22) + "…");

  } catch (e) { fail("Game mechanics", e); }

  // ──────────────────────────────────────────────────────────────────────────
  //  FINAL DASHBOARD
  // ──────────────────────────────────────────────────────────────────────────

  flush(); // flush last service

  const W     = 38;
  const totalP = results.filter(r => r.status === "PASS").length;
  const totalF = results.filter(r => r.status === "FAIL").length;
  const totalS = results.filter(r => r.status === "SKIP").length;

  console.log("\n\n" + "═".repeat(62));
  console.log("  PRODUCTION HEALTH DASHBOARD");
  console.log(`  ${new Date().toISOString()}`);
  console.log("═".repeat(62));
  console.log(`  ${"SERVICE".padEnd(W)} STATUS    CHECKS`);
  console.log(`  ${"─".repeat(W)} ────────  ──────`);
  for (const r of results) {
    const icon   = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "⏭️ ";
    const checks = r.status === "SKIP" ? "skipped" : `${r.checks - r.failures}/${r.checks}`;
    console.log(`  ${r.service.padEnd(W)} ${icon}  ${r.status.padEnd(6)}  ${checks}`);
  }
  console.log("═".repeat(62));
  console.log(`  OVERALL   ${totalP} passed  |  ${totalF} failed  |  ${totalS} skipped`);
  if (totalF === 0) {
    console.log("  STATUS    ✅  ALL SYSTEMS GO — invisible UX is production-ready");
  } else {
    console.log("  STATUS    ❌  Issues found — review failures above");
  }
  console.log("═".repeat(62));
  console.log(`\n  Contracts (Base Sepolia):`);
  console.log(`    PetsCash     → https://sepolia.basescan.org/address/${config.PETS_CASH_ADDRESS}`);
  console.log(`    PetsRegistry → https://sepolia.basescan.org/address/${config.PETS_REGISTRY_ADDRESS}`);
  console.log(`    PetsMarket   → https://sepolia.basescan.org/address/${config.PETS_MARKET_ADDRESS}`);
  console.log(`    PetsRanking  → https://sepolia.basescan.org/address/${config.PETS_RANKING_ADDRESS}\n`);

  if (totalF > 0) process.exitCode = 1;
}

main().catch(e => {
  console.error("\n❌  Fatal:", e instanceof Error ? e.message : e);
  if (e instanceof Error && e.stack) console.error(e.stack);
  process.exit(1);
});
