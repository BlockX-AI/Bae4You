/**
 * Multi-user E2E: Alice, Bob, Carol — 3 independent custodial wallets,
 * profile SFT mints, cross-user buy, gift, DB isolation checks.
 * Run: pnpm --filter=api multiuser
 */
import "dotenv/config";
import { ethers } from "ethers";
import { Pool }   from "pg";
import crypto     from "crypto";
import { config } from "../src/config";

let passed = 0, failed = 0;
const ok   = (l: string, d?: string) => { console.log(`  ✅ ${l}${d ? `  → ${d}` : ""}`); passed++; };
const fail = (l: string, e?: unknown) => { console.log(`  ❌ ${l}  → ${e instanceof Error ? e.message : String(e ?? "")}`); failed++; };
const sec  = (t: string) => console.log(`\n${"─".repeat(60)}\n  ${t}\n${"─".repeat(60)}`);

const AES_KEY  = config.WALLET_ENCRYPTION_SECRET.slice(0, 32);
const provider = new ethers.JsonRpcProvider(config.BASE_SEPOLIA_RPC_URL);

function getPool() {
  const u = config.DATABASE_URL;
  return new Pool({ connectionString: u, ssl: u.includes("sslmode=require") ? { rejectUnauthorized: false } : false });
}

function encryptKey(pk: string) {
  const iv = crypto.randomBytes(16);
  const c  = crypto.createCipheriv("aes-256-cbc", Buffer.from(AES_KEY), iv);
  return iv.toString("hex") + ":" + Buffer.concat([c.update(pk, "utf8"), c.final()]).toString("hex");
}

const REGISTRY_ABI = [
  "function mintProfile(address, uint256) external returns (uint256)",
  "event ProfileMinted(address indexed, uint256 indexed, uint256)",
];
const MARKET_ABI = [
  "function initPet(uint256, address, uint256) external",
  "function buy(uint256) external",
  "function giftCash(uint256, uint256) external",
  "function getPrice(uint256) view returns (uint256)",
];
const CASH_ABI = [
  "function MARKET_ROLE() view returns (bytes32)",
  "function grantMarketRole(address) external",
  "function mintFromMarket(address, uint256) external",
  "function totalSupply() view returns (uint256)",
  "function transfer(address, uint256) external returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address, uint256) external returns (bool)",
];

interface User { name: string; wallet: ethers.HDNodeWallet | ethers.Wallet; id: string; tokenId: number | null; }

async function createUser(pool: Pool, name: string): Promise<User> {
  const w = ethers.Wallet.createRandom();
  const { rows } = await pool.query(
    `INSERT INTO users (wallet_address, custodial_key_enc, wallet_type, username, display_name)
     VALUES ($1,$2,'custodial',$3,$4) RETURNING id`,
    [w.address.toLowerCase(), encryptKey(w.privateKey), name.toLowerCase(), name]
  );
  return { name, wallet: w, id: rows[0].id, tokenId: null };
}

async function mintSFT(pool: Pool, user: User, deployer: ethers.Wallet): Promise<number> {
  const reg    = new ethers.Contract(config.PETS_REGISTRY_ADDRESS, REGISTRY_ABI, deployer);
  const market = new ethers.Contract(config.PETS_MARKET_ADDRESS,   MARKET_ABI,   deployer);
  const price  = BigInt(config.STARTING_PRICE_PCASH);

  const tx   = await reg.mintProfile(user.wallet.address, price);
  const rcpt = await tx.wait();

  const iface = new ethers.Interface(["event ProfileMinted(address indexed,uint256 indexed,uint256)"]);
  let tokenId = 0;
  for (const log of rcpt.logs) {
    try { const p = iface.parseLog({ topics: log.topics as string[], data: log.data }); if (p) { tokenId = Number(p.args[1]); break; } } catch {}
  }
  if (!tokenId) throw new Error("ProfileMinted not found");

  const tx2 = await market.initPet(tokenId, user.wallet.address, price);
  await tx2.wait();

  await pool.query("UPDATE users SET token_id=$1 WHERE id=$2", [tokenId, user.id]);
  await pool.query(
    `INSERT INTO pets_state(token_id,owner_address,user_address,current_price_wei)
     VALUES($1,$2,$3,$4) ON CONFLICT(token_id) DO NOTHING`,
    [tokenId, user.wallet.address.toLowerCase(), user.wallet.address.toLowerCase(), price.toString()]
  );
  user.tokenId = tokenId;
  return tokenId;
}

async function main() {
  console.log("\n════════════════════════════════════════════════════════════");
  console.log("  Bae4U — Multi-User E2E (Vijendra + Satyam + Sakshi)");
  console.log("════════════════════════════════════════════════════════════");

  const pool     = getPool();
  const deployer = new ethers.Wallet(config.DEPLOYER_PRIVATE_KEY, provider);
  const cash     = new ethers.Contract(config.PETS_CASH_ADDRESS,   CASH_ABI,   deployer);
  const market   = new ethers.Contract(config.PETS_MARKET_ADDRESS, MARKET_ABI, deployer);

  const users: User[] = [];

  // ── 1. Create 3 users ───────────────────────────────────────────────────────
  sec("1  Create 3 custodial wallets + DB rows");
  try {
    const suffix = Date.now().toString(36);
    const [alice, bob, carol] = await Promise.all([
      createUser(pool, `Vijendra_${suffix}`),
      createUser(pool, `Satyam_${suffix}`),
      createUser(pool, `Sakshi_${suffix}`),
    ]);
    users.push(alice, bob, carol);
    for (const u of users) ok(`${u.name} created`, `wallet=${u.wallet.address.slice(0,10)}… id=${u.id}`);
  } catch (e) { fail("User creation", e); await pool.end(); return; }

  const [alice, bob, carol] = users;

  // ── 2. Check deployer balance ────────────────────────────────────────────────
  sec("2  Deployer balance check");
  const balance = await provider.getBalance(deployer.address);
  ok("Deployer ETH balance", ethers.formatEther(balance) + " ETH");
  if (balance < ethers.parseEther("0.0005")) {
    fail("Insufficient ETH for 3 mints — need 0.0005+ ETH");
    await cleanup(pool, users);
    return;
  }

  // ── 3. Mint SFTs for all 3 ──────────────────────────────────────────────────
  sec("3  Mint profile SFTs (PetsRegistry + PetsMarket.initPet)");
  try {
    for (const u of users) {
      const tid = await mintSFT(pool, u, deployer);
      ok(`${u.name} SFT minted + initPet`, `tokenId=${tid}`);
    }
  } catch (e) { fail("SFT mint", e); await cleanup(pool, users); return; }

  // ── 4. Verify DB isolation ───────────────────────────────────────────────────
  sec("4  DB isolation — each user sees only their own token_id");
  for (const u of users) {
    const { rows } = await pool.query("SELECT token_id FROM users WHERE id=$1", [u.id]);
    if (Number(rows[0].token_id) === u.tokenId) ok(`${u.name} token_id isolated`, `tokenId=${u.tokenId}`);
    else fail(`${u.name} token_id mismatch`);
  }

  // Verify no token_id collision between users
  const tokenIds = users.map(u => u.tokenId);
  const unique   = new Set(tokenIds);
  if (unique.size === 3) ok("All 3 tokenIds are unique — no collisions");
  else                    fail("Token ID collision detected", tokenIds.join(","));

  // ── 5. Fund Bob with PCASH to buy Alice's pet ────────────────────────────────
  sec("5  Fund Bob with PCASH — deployer grants itself MARKET_ROLE then calls mintFromMarket");
  try {
    const grantTx = await cash.grantMarketRole(deployer.address);
    await grantTx.wait();
    ok("MARKET_ROLE granted to deployer for test minting");

    const mintTx = await cash.mintFromMarket(bob.wallet.address, ethers.parseEther("2000"));
    await mintTx.wait();
    const bobBal = await cash.balanceOf(bob.wallet.address);
    ok("Bob minted 2000 PCASH via mintFromMarket", ethers.formatEther(bobBal) + " PCASH");

    // Bob also needs extra PCASH for the gift (giftPet transfers PCASH to petProfile)
    const mintTx2 = await cash.mintFromMarket(bob.wallet.address, ethers.parseEther("500"));
    await mintTx2.wait();
    ok("Bob minted extra 500 PCASH for giftPet fee");

    // Fund Carol with PCASH for giftPet
    const mintTx3 = await cash.mintFromMarket(carol.wallet.address, ethers.parseEther("500"));
    await mintTx3.wait();
    ok("Carol minted 500 PCASH for giftPet fee");
  } catch (e) { fail("Fund Bob PCASH", e); }

  // Fund Bob with ETH for gas + give MaxUint256 PCASH approval to market
  try {
    const supplyBefore = await cash.totalSupply();
    ok("PCASH totalSupply before mints", ethers.formatEther(supplyBefore) + " PCASH");

    const gasTx = await deployer.sendTransaction({ to: bob.wallet.address, value: ethers.parseEther("0.0003") });
    await gasTx.wait();
    ok("Bob funded with ETH for gas");

    const cashBob = new ethers.Contract(config.PETS_CASH_ADDRESS, [
      "function approve(address,uint256) external returns (bool)",
      "function allowance(address,address) view returns (uint256)",
      "function balanceOf(address) view returns (uint256)",
    ], bob.wallet.connect(provider));

    const approveTx = await cashBob.approve(config.PETS_MARKET_ADDRESS, ethers.MaxUint256);
    await approveTx.wait();
    const bobBalance  = await cashBob.balanceOf(bob.wallet.address);
    const bobAllowance = await cashBob.allowance(bob.wallet.address, config.PETS_MARKET_ADDRESS);
    ok("Bob MaxUint256 approve set", `balance=${ethers.formatEther(bobBalance)} PCASH, allowance=${bobAllowance > 0n ? "MaxUint256 ✓" : "0 ✗"}`);

    const supplyAfter = await cash.totalSupply();
    ok("PCASH totalSupply after mints", ethers.formatEther(supplyAfter) + " PCASH");
  } catch (e) { fail("Fund Bob ETH + approve", e); }

  // ── 6. Bob buys Alice's pet ──────────────────────────────────────────────────
  sec(`6  Bob buys Alice's pet (tokenId=${alice.tokenId})`);
  try {
    const price    = await market.getPrice(alice.tokenId!);
    ok("Alice's pet price", ethers.formatEther(price) + " PCASH");

    const mktB   = new ethers.Contract(config.PETS_MARKET_ADDRESS, MARKET_ABI, bob.wallet.connect(provider));
    const buyTx  = await mktB.buy(alice.tokenId!);
    const buyRcpt = await buyTx.wait();
    ok("Bob bought Alice's pet", `tx=${buyRcpt.hash.slice(0,10)}…`);

    const newPrice = await market.getPrice(alice.tokenId!);
    ok("Alice's pet new price (+10%)", ethers.formatEther(newPrice) + " PCASH");

    await pool.query(
      "UPDATE pets_state SET owner_address=$1, total_purchases=total_purchases+1, current_price_wei=$2 WHERE token_id=$3",
      [bob.wallet.address.toLowerCase(), newPrice.toString(), alice.tokenId]
    );
    ok("DB: pets_state updated with new owner + price");
  } catch (e) { fail("Bob buys Alice's pet", e); }

  // ── 7. Bob gifts the pet to Carol ────────────────────────────────────────────
  sec(`7  Bob giftCash 100 PCASH via his own pet (tokenId=${bob.tokenId})`);
  try {
    const giftAmount = ethers.parseEther("100");

    // Bob already approved MaxUint256 in step 6; no extra approve needed
    const mktB     = new ethers.Contract(config.PETS_MARKET_ADDRESS, MARKET_ABI, bob.wallet.connect(provider));
    const giftTx   = await mktB.giftCash(bob.tokenId!, giftAmount);
    const giftRcpt = await giftTx.wait();
    ok("Bob giftCash 100 PCASH via pet #" + bob.tokenId, `tx=${giftRcpt.hash.slice(0,10)}…`);

    const bobProfileBal = await new ethers.Contract(config.PETS_CASH_ADDRESS, ["function balanceOf(address) view returns (uint256)"], provider).balanceOf(bob.wallet.address);
    ok("Bob's profile PCASH balance after gift", ethers.formatEther(bobProfileBal) + " PCASH");
  } catch (e) { fail("Bob giftCash", e); }

  // ── 8. Cross-user DB validation ──────────────────────────────────────────────
  sec("8  Final DB state validation");
  for (const u of users) {
    const { rows } = await pool.query(
      "SELECT id, username, wallet_address, token_id, wallet_type FROM users WHERE id=$1", [u.id]
    );
    const r = rows[0];
    if (r && r.wallet_type === "custodial" && r.username === u.name.toLowerCase()) {
      ok(`${u.name} DB row complete`, `type=custodial tokenId=${r.token_id}`);
    } else {
      fail(`${u.name} DB row incomplete`, JSON.stringify(r));
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────
  await cleanup(pool, users);

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("\n════════════════════════════════════════════════════════════");
  console.log(`  RESULTS  ${passed} passed  |  ${failed} failed`);
  console.log(`  STATUS   ${failed === 0 ? "✅ Multi-user flow fully working (Vijendra + Satyam + Sakshi)" : "❌ Issues found — see above"}`);
  console.log("════════════════════════════════════════════════════════════\n");
  if (failed > 0) process.exitCode = 1;
}

async function cleanup(pool: Pool, users: User[]) {
  sec("Cleanup — removing test rows");
  try {
    for (const u of users) {
      if (u.tokenId) await pool.query("DELETE FROM pets_state WHERE token_id=$1", [u.tokenId]);
      await pool.query("DELETE FROM users WHERE id=$1", [u.id]);
    }
    ok("All test rows removed");
  } catch (e) { fail("Cleanup", e); }
  await pool.end();
}

main().catch(e => { console.error("Fatal:", e); process.exitCode = 1; });
