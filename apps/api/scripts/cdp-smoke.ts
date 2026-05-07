/**
 * CDP Smoke Test
 *
 * Verifies that the CDP credentials are valid and wallet operations work.
 * Run: pnpm --filter=api cdp-smoke
 *
 * Phase 1 — Auth check: list accounts (GET, no walletSecret needed)
 * Phase 2 — Write check: getOrCreate a test account (POST, walletSecret required)
 */

import "dotenv/config";
import { createPrivateKey } from "crypto";
import { CdpClient } from "@coinbase/cdp-sdk";

function normaliseCdpSecret(raw: string): string {
  const pem = raw.replace(/\\n/g, "\n");
  if (pem.includes("-----BEGIN EC PRIVATE KEY-----")) {
    const keyObj = createPrivateKey({ key: pem, format: "pem" });
    return keyObj.export({ type: "pkcs8", format: "pem" }) as string;
  }
  return pem;
}

const keyId     = process.env.CDP_API_KEY_ID;
const keySecret = process.env.CDP_API_KEY_SECRET;
const walletSec = process.env.CDP_WALLET_SECRET;

function ok(msg: string)   { console.log(`  ✓ ${msg}`); }
function fail(msg: string) { console.error(`  ✗ ${msg}`); }
function hdr(msg: string)  { console.log(`\n── ${msg}`); }

async function main() {
  console.log("CDP Smoke Test\n");

  hdr("Env check");
  if (!keyId)     { fail("CDP_API_KEY_ID missing");    process.exit(1); }
  if (!keySecret) { fail("CDP_API_KEY_SECRET missing"); process.exit(1); }
  ok(`CDP_API_KEY_ID  : ${keyId.slice(0, 40)}…`);
  ok(`CDP_API_KEY_SECRET: ${keySecret.includes("BEGIN EC") ? "EC PEM key ✓" : keySecret.slice(0, 20) + "…"}`);
  ok(`CDP_WALLET_SECRET : ${walletSec ? walletSec.slice(0, 20) + "…" : "(not set)"}`);

  hdr("Phase 1 — Initialize client");
  let cdp: CdpClient;
  try {
    const normalisedSecret = normaliseCdpSecret(keySecret);
    ok(`Key format normalised to: ${normalisedSecret.includes("BEGIN PRIVATE KEY") ? "PKCS#8 ✓" : "(unchanged)"}`);
    cdp = new CdpClient({ apiKeyId: keyId, apiKeySecret: normalisedSecret, walletSecret: walletSec });
    ok("CdpClient created");
  } catch (e) {
    fail(`CdpClient constructor threw: ${e}`);
    process.exit(1);
  }

  hdr("Phase 2 — List accounts (read-only, tests JWT auth)");
  try {
    const result = await cdp.evm.listAccounts({ pageSize: 5 });
    const count  = result.accounts?.length ?? 0;
    ok(`listAccounts returned ${count} account(s)`);
    for (const acc of result.accounts ?? []) {
      console.log(`    • ${acc.address}  name="${acc.name}"`);
    }
  } catch (e: any) {
    fail(`listAccounts failed: ${e?.message ?? e}`);
    console.error("\n  The API key credentials appear invalid. Re-check CDP_API_KEY_ID / CDP_API_KEY_SECRET.\n");
    process.exit(1);
  }

  hdr("Phase 3 — getOrCreate smoke account (write, tests walletSecret)");
  if (!walletSec) {
    console.log("  ⚠  CDP_WALLET_SECRET not set — skipping write test.");
    console.log("     Get yours at https://portal.cdp.coinbase.com/projects/wallet-secrets");
  } else {
    try {
      const account = await cdp.evm.getOrCreateAccount({ name: "bae4u-smoke-test" });
      ok(`getOrCreateAccount → ${account.address}`);
    } catch (e: any) {
      fail(`getOrCreateAccount failed: ${e?.message ?? e}`);
      console.error("\n  CDP_WALLET_SECRET is likely wrong for this API key / project.\n");
      process.exit(1);
    }
  }

  console.log("\n✅  CDP credentials are valid and working.\n");
}

main().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
