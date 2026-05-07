/**
 * E2E smoke test — runs against live Base Sepolia contracts.
 * Usage: pnpm --filter=api exec tsx scripts/e2e-test.ts
 */

import "../src/config";
import { ethers } from "ethers";
import axios from "axios";

const RPC   = process.env.BASE_SEPOLIA_RPC_URL!;
const CASH  = process.env.PETS_CASH_ADDRESS!;
const REG   = process.env.PETS_REGISTRY_ADDRESS!;
const MKT   = process.env.PETS_MARKET_ADDRESS!;
const RANK  = process.env.PETS_RANKING_ADDRESS!;
const DEP   = process.env.DEPLOYER_PRIVATE_KEY!;

const OK  = "✅";
const ERR = "❌";

function pass(label: string, detail = "") {
  console.log(`  ${OK}  ${label}${detail ? "  →  " + detail : ""}`);
}
function fail(label: string, err: unknown) {
  console.error(`  ${ERR}  ${label}:`, err instanceof Error ? err.message : err);
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const deployer = new ethers.Wallet(DEP, provider);

  console.log("\n══════════════════════════════════════════════════");
  console.log("  Bae4U — E2E Testnet Smoke Test");
  console.log("══════════════════════════════════════════════════\n");

  // ── 1. Network connectivity ──────────────────────────────
  console.log("[ 1 ] Network");
  try {
    const net = await provider.getNetwork();
    const block = await provider.getBlockNumber();
    pass("Connected to Base Sepolia", `chainId=${net.chainId} block=${block}`);
  } catch (e) { fail("RPC connection", e); process.exit(1); }

  // ── 2. Deployer wallet ────────────────────────────────────
  console.log("\n[ 2 ] Deployer Wallet");
  try {
    const bal = await provider.getBalance(deployer.address);
    pass("Deployer address", deployer.address);
    pass("Balance", `${ethers.formatEther(bal)} ETH`);
  } catch (e) { fail("Wallet check", e); }

  // ── 3. Contract bytecode exists on-chain ─────────────────
  console.log("\n[ 3 ] Contract Deployment Verification");
  const contracts: Record<string, string> = {
    PetsCash:     CASH,
    PetsRegistry: REG,
    PetsMarket:   MKT,
    PetsRanking:  RANK,
  };
  for (const [name, addr] of Object.entries(contracts)) {
    try {
      const code = await provider.getCode(addr);
      if (code === "0x") throw new Error("No bytecode at address");
      pass(`${name} deployed`, addr);
    } catch (e) { fail(`${name} missing`, e); }
  }

  // ── 4. Read contract state ────────────────────────────────
  console.log("\n[ 4 ] Contract State Reads");

  const cashAbi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
  ];
  const regAbi = [
    "function getTokenByAddress(address user) view returns (uint256)",
    "function getUserAddress(uint256 tokenId) view returns (address)",
  ];
  const mktAbi = [
    "function paused() view returns (bool)",
    "function FEE_BPS() view returns (uint256)",
    "function getPrice(uint256 tokenId) view returns (uint256)",
  ];

  try {
    const cash = new ethers.Contract(CASH, cashAbi, provider);
    const name   = await cash.name();
    const symbol = await cash.symbol();
    const supply = await cash.totalSupply();
    pass("PetsCash.name()", name);
    pass("PetsCash.symbol()", symbol);
    pass("PetsCash.totalSupply()", ethers.formatEther(supply) + " PCASH");
  } catch (e) { fail("PetsCash reads", e); }

  try {
    const reg = new ethers.Contract(REG, regAbi, provider);
    const zeroAddr = "0x0000000000000000000000000000000000000001";
    const tok = await reg.getTokenByAddress(zeroAddr);
    pass("PetsRegistry.getTokenByAddress()", `tokenId=${tok} for unknown addr (expected 0)`);
  } catch (e) { fail("PetsRegistry reads", e); }

  try {
    const mkt = new ethers.Contract(MKT, mktAbi, provider);
    const paused = await mkt.paused();
    const fee    = await mkt.FEE_BPS();
    pass("PetsMarket.paused()", paused ? "paused" : "active");
    pass("PetsMarket.FEE_BPS()", `${Number(fee) / 100}%`);
  } catch (e) { fail("PetsMarket reads", e); }

  // ── 5. Mint a test profile SFT ────────────────────────────
  console.log("\n[ 5 ] Profile SFT Mint (live tx)");
  try {
    const regFull = new ethers.Contract(REG, [
      "function mintProfile(address user, uint256 startingPrice) external returns (uint256)",
      "function getTokenByAddress(address user) view returns (uint256)",
    ], deployer);

    const testWallet = ethers.Wallet.createRandom();
    const startingPrice = ethers.parseEther("1000");
    const tx = await regFull.mintProfile(testWallet.address, startingPrice);
    const receipt = await tx.wait();
    pass("mintProfile() tx confirmed", `hash=${receipt.hash.slice(0, 18)}... block=${receipt.blockNumber}`);

    const tokenId = await regFull.getTokenByAddress(testWallet.address);
    pass("getTokenByAddress() reads back", `tokenId=${tokenId}`);
  } catch (e) { fail("SFT mint", e); }

  // ── 6. EIP-712 Signer service ────────────────────────────
  console.log("\n[ 6 ] EIP-712 Signer (off-chain)");
  try {
    const { signBonusClaim, signerAddress } = await import("../src/services/eip712-signer");
    const testAddr = "0xa58DCCb0F17279abD1d0D9069Aa8711Df4a4c58E";
    const ts  = Math.floor(Date.now() / 1000);
    const sig = await signBonusClaim(testAddr, ethers.parseEther("100"), ts);
    pass("signBonusClaim() produced signature", sig.slice(0, 20) + "...");
    pass("Signer address", signerAddress);
  } catch (e) { fail("EIP-712 signer", e); }

  // ── 7. Custodial wallet service ───────────────────────────
  console.log("\n[ 7 ] Custodial Wallet (encryption round-trip)");
  try {
    const { encryptKey, decryptKey } = await import("../src/services/custodial-wallet");
    const testKey  = "0x" + "ab".repeat(32);
    const enc      = encryptKey(testKey);
    const dec      = decryptKey(enc);
    if (dec !== testKey) throw new Error("Decryption mismatch");
    pass("AES-256 encrypt/decrypt round-trip", "keys match ✓");
  } catch (e) { fail("Custodial wallet crypto", e); }

  // ── Summary ───────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════");
  console.log("  Contracts on Base Sepolia Basescan:");
  console.log(`  PetsCash     → https://sepolia.basescan.org/address/${CASH}`);
  console.log(`  PetsRegistry → https://sepolia.basescan.org/address/${REG}`);
  console.log(`  PetsMarket   → https://sepolia.basescan.org/address/${MKT}`);
  console.log(`  PetsRanking  → https://sepolia.basescan.org/address/${RANK}`);
  console.log("══════════════════════════════════════════════════\n");
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
