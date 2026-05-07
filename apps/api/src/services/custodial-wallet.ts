/**
 * Custodial Wallet Service
 *
 * Every user who signs up via email/social (non-crypto users) gets a server-managed
 * wallet. The private key is AES-256-CBC encrypted with WALLET_ENCRYPTION_SECRET and
 * stored in the DB. Users never see "private key", "seed phrase", or "gas fee".
 *
 * Power users can always link their own MetaMask via SIWE — the two paths coexist.
 */

import crypto from "crypto";
import { ethers } from "ethers";
import { db } from "../db/client";
import { config } from "../config";

const ALG  = "aes-256-cbc";
const IV_LEN = 16;

function deriveKey(): Buffer {
  return crypto.scryptSync(config.WALLET_ENCRYPTION_SECRET, "bae4u-wallet-salt", 32);
}

export function encryptKey(privateKey: string): string {
  const key = deriveKey();
  const iv  = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALG, key, iv);
  const encrypted = Buffer.concat([cipher.update(privateKey, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decryptKey(encryptedKey: string): string {
  const [ivHex, encHex] = encryptedKey.split(":");
  const key     = deriveKey();
  const iv      = Buffer.from(ivHex, "hex");
  const enc     = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv(ALG, key, iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

/**
 * Creates a new custodial EOA for a user who signed up without a crypto wallet.
 * Returns the wallet address (public — stored in users.wallet_address) and stores
 * the encrypted private key. The user never sees this private key.
 */
export async function createCustodialWallet(userId: string): Promise<{
  address: string;
  encryptedKey: string;
}> {
  const wallet      = ethers.Wallet.createRandom();
  const encryptedKey = encryptKey(wallet.privateKey);

  await db.query(
    `UPDATE users
     SET wallet_address = $1, custodial_key_enc = $2, wallet_type = 'custodial'
     WHERE id = $3`,
    [wallet.address.toLowerCase(), encryptedKey, userId]
  );

  return { address: wallet.address, encryptedKey };
}

/**
 * Returns the decrypted private key for a custodial wallet.
 * Used by pimlico-relay to build a SmartAccountClient (which needs the raw key).
 */
export async function getCustodialPrivateKey(userId: string): Promise<string | null> {
  const { rows } = await db.query(
    "SELECT custodial_key_enc FROM users WHERE id = $1 AND wallet_type = 'custodial'",
    [userId]
  );
  if (!rows[0]?.custodial_key_enc) return null;
  return decryptKey(rows[0].custodial_key_enc);
}

/**
 * Loads a signer for a custodial wallet user.
 * Used by tx-relay to submit transactions on behalf of the user.
 */
export async function getCustodialSigner(
  userId: string,
  provider: ethers.JsonRpcProvider
): Promise<ethers.Wallet | null> {
  const { rows } = await db.query(
    "SELECT custodial_key_enc FROM users WHERE id = $1 AND wallet_type = 'custodial'",
    [userId]
  );
  if (!rows[0]?.custodial_key_enc) return null;

  const privateKey = decryptKey(rows[0].custodial_key_enc);
  return new ethers.Wallet(privateKey, provider);
}

/**
 * Checks if a user's custodial wallet needs a gas top-up.
 * The platform sponsors gas automatically up to the configured threshold.
 */
export async function ensureGasBalance(
  walletAddress: string,
  provider: ethers.JsonRpcProvider,
  minBalanceWei = 500_000_000_000_000n // 0.0005 ETH
): Promise<void> {
  const balance = await provider.getBalance(walletAddress);
  if (balance >= minBalanceWei) return;

  const sponsorKey = config.GAS_SPONSOR_PRIVATE_KEY ?? config.DEPLOYER_PRIVATE_KEY;
  const sponsor    = new ethers.Wallet(sponsorKey, provider);

  const topUpAmount = minBalanceWei - balance + 200_000_000_000_000n; // small buffer
  const tx = await sponsor.sendTransaction({
    to:    walletAddress,
    value: topUpAmount,
  });
  await tx.wait();

  console.log(
    `[gas-sponsor] Topped up ${walletAddress} with ${ethers.formatEther(topUpAmount)} ETH`
  );
}
