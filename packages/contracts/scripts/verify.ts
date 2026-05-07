/**
 * Verify all deployed Bae4U contracts on Base Sepolia Basescan.
 *
 * Requirements:
 *   BASESCAN_API_KEY must be set in .env
 *   Get a free key at https://basescan.org/register
 *
 * Run: pnpm --filter=contracts verify:all
 */
import { run } from "hardhat";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const DEPLOYER = "0xa58DCCb0F17279abD1d0D9069Aa8711Df4a4c58E";
const CASH     = "0x468577EB93f248c770036bFC7EFb5639DD66fF13";
const REG      = "0x3E86590FE85536a194693eBC83be224De1412aca";
const MKT      = "0xa21eA1176bd8c58870e22B0455A4B3B6eF06FfeF";
const RANKING  = "0x21B029301734223757694a5A10a1ce4fACa7ec6C";

async function verifyOne(
  label: string,
  address: string,
  constructorArguments: unknown[]
) {
  console.log(`\nVerifying ${label} at ${address}...`);
  try {
    await run("verify:verify", { address, constructorArguments });
    console.log(`  ✅ ${label} verified`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("already verified")) {
      console.log(`  ℹ️  ${label} already verified`);
    } else {
      console.error(`  ❌ ${label} failed:`, msg);
    }
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  Bae4U — Contract Verification (Base Sepolia)");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  BASESCAN_API_KEY: ${process.env.BASESCAN_API_KEY ? "set ✓" : "MISSING — get one free at https://basescan.org/register"}`);
  console.log();

  // PetsCash(address admin, address signer)
  await verifyOne("PetsCash", CASH, [DEPLOYER, DEPLOYER]);

  // PetsRegistry(address admin)
  await verifyOne("PetsRegistry", REG, [DEPLOYER]);

  // PetsMarket(address cash, address registry, address treasury, address admin)
  await verifyOne("PetsMarket", MKT, [CASH, REG, DEPLOYER, DEPLOYER]);

  // PetsRanking(address admin, address signer)
  await verifyOne("PetsRanking", RANKING, [DEPLOYER, DEPLOYER]);

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Explorer links:");
  console.log(`  PetsCash     → https://sepolia.basescan.org/address/${CASH}#code`);
  console.log(`  PetsRegistry → https://sepolia.basescan.org/address/${REG}#code`);
  console.log(`  PetsMarket   → https://sepolia.basescan.org/address/${MKT}#code`);
  console.log(`  PetsRanking  → https://sepolia.basescan.org/address/${RANKING}#code`);
  console.log("═══════════════════════════════════════════════════");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
