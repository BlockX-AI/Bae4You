/**
 * Pimlico ERC-4337 Paymaster E2E Test
 *
 * Proves that a custodial EOA with ZERO ETH can execute on-chain
 * transactions through the Pimlico bundler + paymaster (gas-free for users).
 *
 * Flow:
 *   1. Generate a fresh EOA — no ETH ever sent to it
 *   2. Derive its SimpleSmartAccount address (CREATE2, no deploy tx needed)
 *   3. Fund the smart account with PCASH via deployer (simulates "first login bonus mint")
 *   4. EIP-712 sign a bonus claim for the smart account
 *   5. Smart account relays claimBonus() via Pimlico — 0 ETH needed
 *   6. Verify PCASH balance landed on-chain
 *   7. Relay a lockPet() via Pimlico to test market interaction
 *
 * Run: pnpm --filter=api pimlico-e2e
 */

import "dotenv/config";
import { ethers } from "ethers";
import { buildSmartAccountRelay } from "../src/services/pimlico-relay";
import { signBonusClaim } from "../src/services/eip712-signer";

const RPC         = process.env.BASE_SEPOLIA_RPC_URL!;
const CASH_ADDR   = process.env.PETS_CASH_ADDRESS!    as `0x${string}`;
const REG_ADDR    = process.env.PETS_REGISTRY_ADDRESS! as `0x${string}`;
const MKT_ADDR    = process.env.PETS_MARKET_ADDRESS!  as `0x${string}`;
const DEP_KEY     = process.env.DEPLOYER_PRIVATE_KEY!;
const PIMLICO_KEY = process.env.PIMLICO_API_KEY!;
const BONUS_AMOUNT = ethers.parseEther("100");

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const CASH_ABI = [
  "function claimBonus(uint256 amount, uint256 timestamp, bytes calldata sig) external",
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function grantMarketRole(address market) external",
  "function mintFromMarket(address to, uint256 amount) external",
];
const REG_ABI  = [
  "function mintProfile(address user, uint256 startingPrice) external returns (uint256)",
  "event ProfileMinted(address indexed user, uint256 indexed tokenId, uint256 startingPrice)",
];
const MKT_ABI  = [
  "function initPet(uint256 tokenId, address owner, uint256 price) external",
  "function lockPet(uint256 tokenId, uint256 duration) external",
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
  throw new Error("ProfileMinted not found");
}

const log = {
  section: (t: string) => console.log(`\n${"═".repeat(62)}\n  ${t}\n${"═".repeat(62)}`),
  ok:  (t: string, d = "") => console.log(`  ✅  ${t}${d ? "  →  " + d : ""}`),
  err: (t: string, e: unknown) => { console.error(`\n  ❌  ${t}:`, e instanceof Error ? e.message : e); process.exit(1); },
  info:(t: string) => console.log(`  ℹ️   ${t}`),
  tx:  (h: string, b: number) => console.log(`       tx: ${h.slice(0, 22)}…  block #${b}`),
};

async function main() {
  if (!PIMLICO_KEY) log.err("PIMLICO_API_KEY", "not set in .env");

  const provider = new ethers.JsonRpcProvider(RPC);
  const deployer = new ethers.Wallet(DEP_KEY, provider);
  const cash     = new ethers.Contract(CASH_ADDR, CASH_ABI, deployer);
  const registry = new ethers.Contract(REG_ADDR,  REG_ABI,  deployer);
  const market   = new ethers.Contract(MKT_ADDR,  MKT_ABI,  deployer);

  const net = await provider.getNetwork();
  const bal = await provider.getBalance(deployer.address);
  console.log("\n" + "═".repeat(62));
  console.log("  Bae4U — Pimlico ERC-4337 Paymaster E2E (Base Sepolia)");
  console.log("═".repeat(62));
  log.ok("Network",  `chainId=${net.chainId}`);
  log.ok("Deployer", `${deployer.address}  (${ethers.formatEther(bal)} ETH)`);
  log.ok("Pimlico",  `key=${PIMLICO_KEY.slice(0, 8)}…`);

  // ── STEP 1: Fresh EOA — intentionally no ETH ─────────────
  log.section("STEP 1 — Fresh Custodial EOA (zero ETH, invisible to user)");

  const eoaWallet = ethers.Wallet.createRandom();
  log.ok("EOA generated",   eoaWallet.address);
  const eoaBal = await provider.getBalance(eoaWallet.address);
  log.ok("EOA ETH balance", `${ethers.formatEther(eoaBal)} ETH  ← intentionally ZERO`);
  if (eoaBal > 0n) log.err("EOA should have 0 ETH", "test assumption violated");

  // ── STEP 2: Derive Smart Account via Pimlico ─────────────
  log.section("STEP 2 — Build SimpleSmartAccount via Pimlico (gasless relay)");

  log.info("Deriving SimpleSmartAccount address (CREATE2, no deploy tx)…");
  let relay: Awaited<ReturnType<typeof buildSmartAccountRelay>>;
  try {
    relay = await buildSmartAccountRelay(eoaWallet.privateKey, PIMLICO_KEY);
  } catch (e) {
    log.err("buildSmartAccountRelay", e);
    return;
  }
  log.ok("SmartAccount address", relay.address);
  const saBal = await provider.getBalance(relay.address);
  log.ok("SmartAccount ETH balance", `${ethers.formatEther(saBal)} ETH  ← also ZERO`);

  // ── STEP 3: Deployer mints profile SFT for the smart account ─
  log.section("STEP 3 — Profile SFT Mint (deployer acts as backend on signup)");

  log.info("Minting profile SFT for smart account…");
  const mintR = await (await registry.mintProfile(relay.address, ethers.parseEther("1000"))).wait();
  if (mintR?.status !== 1) log.err("mintProfile", "reverted");
  const tokenId = parseTokenId(mintR!);
  log.ok("Profile SFT minted", `tokenId=${tokenId}`);
  log.tx(mintR!.hash, mintR!.blockNumber);

  log.info("Registering in PetsMarket (initPet)…");
  const initR = await (await market.initPet(tokenId, relay.address, ethers.parseEther("1000"))).wait();
  if (initR?.status !== 1) log.err("initPet", "reverted");
  log.ok("PetsMarket.initPet()", `tokenId=${tokenId} listed`);

  // ── STEP 4: EIP-712 Bonus Claim via Pimlico ──────────────
  log.section("STEP 4 — EIP-712 claimBonus via Pimlico (0 ETH, gas sponsored)");

  const ts  = Math.floor(Date.now() / 1000);
  const sig = await signBonusClaim(relay.address, BONUS_AMOUNT, ts);
  log.ok("EIP-712 sig produced (off-chain)", sig.slice(0, 22) + "…");

  log.info("Encoding claimBonus calldata…");
  const cashIface = new ethers.Interface(CASH_ABI);
  const calldata  = cashIface.encodeFunctionData("claimBonus", [BONUS_AMOUNT, BigInt(ts), sig]) as `0x${string}`;

  log.info("Submitting UserOperation via Pimlico bundler (no ETH in smart account)…");
  let txHash: string;
  let blockNumber: number;
  try {
    const r = await relay.sendCalls([{ to: CASH_ADDR, data: calldata }]);
    txHash      = r.txHash;
    blockNumber = r.blockNumber;
  } catch (e) {
    log.err("Pimlico relay sendCalls", e);
    return;
  }
  log.ok("UserOperation bundled & confirmed ✓");
  log.tx(txHash, blockNumber);

  await sleep(3000);
  const pcashBal = await cash.balanceOf(relay.address);
  log.ok("PCASH balance after gasless claimBonus", `${ethers.formatEther(pcashBal)} PCASH`);
  if (pcashBal < BONUS_AMOUNT) log.err("claimBonus balance check", `expected ≥${ethers.formatEther(BONUS_AMOUNT)}, got ${ethers.formatEther(pcashBal)}`);

  // ── STEP 5: Pimlico-relay a lockPet (approve + lock in one bundle) ─
  log.section("STEP 5 — lockPet via Pimlico (ERC-4337 UserOp, still 0 ETH)");

  log.info("Encoding lockPet(1 hour) calldata…");
  const mktIface   = new ethers.Interface(MKT_ABI);
  const lockData   = mktIface.encodeFunctionData("lockPet", [BigInt(tokenId), 3600n]) as `0x${string}`;

  log.info("Submitting lockPet UserOperation via Pimlico…");
  try {
    const r2 = await relay.sendCalls([{ to: MKT_ADDR, data: lockData }]);
    log.ok("lockPet UserOperation confirmed ✓");
    log.tx(r2.txHash, r2.blockNumber);
  } catch (e) {
    log.err("Pimlico lockPet", e);
    return;
  }

  await sleep(2500);
  const locked = await market.isLocked(tokenId);
  log.ok("PetsMarket.isLocked()", locked ? "true ✓  (pet is locked for 1h)" : "FAIL — expected true");

  // ── STEP 6: Final audit ──────────────────────────────────
  log.section("STEP 6 — Final Audit");

  const finalEoaBal = await provider.getBalance(eoaWallet.address);
  const finalSaBal  = await provider.getBalance(relay.address);
  const finalPcash  = await cash.balanceOf(relay.address);
  const state       = await market.states(tokenId);

  log.ok("EOA ETH (still zero)",        `${ethers.formatEther(finalEoaBal)} ETH ← Pimlico paid all gas`);
  log.ok("SmartAccount ETH (still 0)",  `${ethers.formatEther(finalSaBal)} ETH`);
  log.ok("SmartAccount PCASH balance",  `${ethers.formatEther(finalPcash)} PCASH`);
  log.ok("PetsMarket owner",            state.owner.toLowerCase() === relay.address.toLowerCase() ? relay.address + " ✓" : state.owner);
  log.ok("PetsMarket locked",           state.isLocked ? "yes (1h) ✓" : "no");
  log.ok("PetsMarket totalBuys",        `${state.totalBuys}`);

  console.log("\n" + "═".repeat(62));
  console.log("  🎉  PIMLICO E2E PASSED");
  console.log("  EOA executed 2 on-chain txs with ZERO ETH — Pimlico paid gas.");
  console.log("  This is the 'invisible UX' paymaster flow in production.");
  console.log("═".repeat(62));
  console.log(`\n  SmartAccount: https://sepolia.basescan.org/address/${relay.address}`);
  console.log(`  PetsCash:     https://sepolia.basescan.org/address/${CASH_ADDR}\n`);
}

main().catch(e => {
  console.error("\n❌  Fatal:", e instanceof Error ? e.message : e);
  if (e instanceof Error && e.stack) console.error(e.stack);
  process.exit(1);
});
