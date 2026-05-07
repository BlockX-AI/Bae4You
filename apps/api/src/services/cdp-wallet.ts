/**
 * CDP Embedded Wallet Service
 *
 * Uses Coinbase Developer Platform (CDP) server-managed accounts.
 * CDP holds the MPC key shares — no private key is stored in our DB.
 * The account name `bae4u-{userId}` is idempotent, so getOrCreate is safe to retry.
 *
 * Wallet type in DB:   wallet_type = 'cdp'
 * Stored field:        custodial_key_enc = CDP account name (not a key — just the lookup handle)
 * Wallet address:      wallet_address = the EVM address assigned by CDP
 *
 * For transactions, we call cdp.evm.sendTransaction({ address, transaction, network })
 * Gas is sponsored via the Coinbase paymaster built into the CDP Smart Account path.
 *
 * Required env vars:
 *   CDP_API_KEY_ID      — from portal.cdp.coinbase.com → API Keys
 *   CDP_API_KEY_SECRET  — same page
 *   CDP_WALLET_SECRET   — from portal.cdp.coinbase.com → Wallet Secrets (separate tab)
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import { createPrivateKey } from "crypto";
import { encodeFunctionData, type Hex, type Address } from "viem";
import { db } from "../db/client";
import { config } from "../config";

/**
 * Normalises a CDP API key secret to PKCS#8 PEM format as required by jose v6.
 *
 * The CDP portal downloads keys in SEC1 format (-----BEGIN EC PRIVATE KEY-----),
 * but jose v6 importPKCS8 only accepts PKCS#8 (-----BEGIN PRIVATE KEY-----).
 * Node.js crypto.createPrivateKey handles SEC1 natively and can re-export to PKCS#8.
 *
 * Also handles dotenv not expanding \\n escape sequences.
 */
function normaliseCdpSecret(raw: string): string {
  const pem = raw.replace(/\\n/g, "\n");
  if (pem.includes("-----BEGIN EC PRIVATE KEY-----")) {
    const keyObj = createPrivateKey({ key: pem, format: "pem" });
    return keyObj.export({ type: "pkcs8", format: "pem" }) as string;
  }
  return pem;
}

let _cdp: CdpClient | null = null;

function cdp(): CdpClient {
  if (!_cdp) {
    if (!config.CDP_API_KEY_ID || !config.CDP_API_KEY_SECRET || !config.CDP_WALLET_SECRET) {
      throw new Error(
        "CDP not configured. Set CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET in .env\n" +
        "Get your Wallet Secret at https://portal.cdp.coinbase.com/projects/wallet-secrets"
      );
    }
    _cdp = new CdpClient({
      apiKeyId:     config.CDP_API_KEY_ID,
      apiKeySecret: normaliseCdpSecret(config.CDP_API_KEY_SECRET),
      walletSecret: config.CDP_WALLET_SECRET,
    });
  }
  return _cdp;
}

export function isCdpEnabled(): boolean {
  return !!(config.CDP_API_KEY_ID && config.CDP_API_KEY_SECRET && config.CDP_WALLET_SECRET);
}

// ── Account lifecycle ─────────────────────────────────────────────────────────

/**
 * Creates (or retrieves) a CDP-managed EVM account for a user.
 * The account name is deterministic so this is fully idempotent.
 * Stores address + account name in the users table.
 */
export async function provisionCdpWallet(userId: string): Promise<{ address: string }> {
  const accountName = `bae4u-${userId}`;

  const account = await cdp().evm.getOrCreateAccount({ name: accountName });

  await db.query(
    `UPDATE users
     SET wallet_address = $1,
         custodial_key_enc = $2,
         wallet_type = 'cdp'
     WHERE id = $3`,
    [account.address.toLowerCase(), accountName, userId]
  );

  return { address: account.address };
}

/**
 * Returns the CDP account name for a user (stored in custodial_key_enc when wallet_type = 'cdp').
 */
async function getCdpAccountName(userId: string): Promise<string | null> {
  const { rows } = await db.query(
    "SELECT custodial_key_enc, wallet_address FROM users WHERE id = $1 AND wallet_type = 'cdp'",
    [userId]
  );
  return rows[0]?.custodial_key_enc ?? null;
}

// ── Transaction relay ─────────────────────────────────────────────────────────

const CDP_NETWORK = "base-sepolia" as const;

export interface CdpRelayResult {
  txHash:  string;
  gasless: boolean;
}

/**
 * Sends a raw contract-call transaction via CDP for a user's embedded wallet.
 * CDP handles signing internally — no private key exposure.
 */
export async function relayCdpTransaction(
  userId: string,
  to: Address,
  data: Hex,
  value: bigint = 0n
): Promise<CdpRelayResult> {
  const accountName = await getCdpAccountName(userId);
  if (!accountName) throw new Error("No CDP wallet for user");

  const account = await cdp().evm.getOrCreateAccount({ name: accountName });

  const result = await cdp().evm.sendTransaction({
    address:     account.address as Address,
    network:     CDP_NETWORK,
    transaction: { to, data, value },
  });

  return { txHash: result.transactionHash, gasless: false };
}

// ── Pre-encoded ABI helpers (same targets as pimlico-relay.ts) ────────────────

const MARKET_ABI = [
  { name: "buy",     type: "function", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { name: "lockPet", type: "function", inputs: [{ name: "tokenId", type: "uint256" }, { name: "duration", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { name: "giftCash", type: "function", inputs: [{ name: "tokenId", type: "uint256" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
] as const;

export async function cdpRelayBuyPet(userId: string, tokenId: number, marketAddress: Address): Promise<CdpRelayResult> {
  const data = encodeFunctionData({ abi: MARKET_ABI, functionName: "buy",     args: [BigInt(tokenId)] });
  return relayCdpTransaction(userId, marketAddress, data);
}

export async function cdpRelayLockPet(userId: string, tokenId: number, durationSeconds: number, marketAddress: Address): Promise<CdpRelayResult> {
  const data = encodeFunctionData({ abi: MARKET_ABI, functionName: "lockPet", args: [BigInt(tokenId), BigInt(durationSeconds)] });
  return relayCdpTransaction(userId, marketAddress, data);
}

export async function cdpRelayGiftCash(userId: string, tokenId: number, amount: bigint, marketAddress: Address): Promise<CdpRelayResult> {
  const data = encodeFunctionData({ abi: MARKET_ABI, functionName: "giftCash", args: [BigInt(tokenId), amount] });
  return relayCdpTransaction(userId, marketAddress, data);
}
