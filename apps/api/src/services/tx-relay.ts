/**
 * Transaction Relay Service — "Invisible UX" Core
 *
 * Gas strategy (priority order):
 *   1. Pimlico ERC-4337 Paymaster (PIMLICO_API_KEY set) — fully gasless, zero ETH in user wallet
 *   2. Platform gas sponsorship — deployer ETH tops up user wallet (fallback / dev mode)
 */

import { ethers } from "ethers";
import { config } from "../config";
import { getCustodialSigner, getCustodialPrivateKey, ensureGasBalance } from "./custodial-wallet";
import {
  buildSmartAccountRelay,
  encodeBuy, encodeLockPet, encodeGiftCash, encodeApprove,
} from "./pimlico-relay";
import {
  cdpRelayBuyPet, cdpRelayLockPet, cdpRelayGiftCash, isCdpEnabled,
} from "./cdp-wallet";
import { db } from "../db/client";
import type { Address } from "viem";

const provider = new ethers.JsonRpcProvider(config.BASE_SEPOLIA_RPC_URL);

const MARKET_ABI = [
  "function buy(uint256 tokenId) external",
  "function lockPet(uint256 tokenId, uint256 durationSeconds) external",
  "function giftCash(uint256 tokenId, uint256 amount) external",
  "function states(uint256 tokenId) view returns (address owner, uint256 price, bool isLocked, uint256 lockExpiry, uint256 totalBuys)",
];
const REGISTRY_ABI = [
  "function mintProfile(address user, uint256 startingPrice) external returns (uint256)",
];

const market   = new ethers.Contract(config.PETS_MARKET_ADDRESS,   MARKET_ABI,   provider);
const registry = new ethers.Contract(config.PETS_REGISTRY_ADDRESS, REGISTRY_ABI, provider);

const CASH_VIEW_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
];
const cash = new ethers.Contract(config.PETS_CASH_ADDRESS, CASH_VIEW_ABI, provider);

/**
 * Thrown by routeRelay when the user has wallet_type = 'external'.
 * The caller (actions route) should catch this and return unsigned tx steps instead.
 */
export class ExternalWalletError extends Error {
  constructor(public readonly userId: string) {
    super("EXTERNAL_WALLET");
    this.name = "ExternalWalletError";
  }
}

export interface TxStep {
  step:        number;
  description: string;
  to:          string;
  data:        string;
  value:       string;
  chainId:     number;
  gasLimit:    string;
}

export interface ExternalTxPayload {
  externalWallet: true;
  steps:          TxStep[];
  currentPriceWei?: string;
  currentPrice?:    string;
}

export interface RelayResult {
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  gasless: boolean;
}

// ── Internal: 3-way wallet router ─────────────────────────────────────────────
// Priority: CDP embedded → Pimlico ERC-4337 → EOA fallback

async function getWalletType(userId: string): Promise<string> {
  const { rows } = await db.query("SELECT wallet_type FROM users WHERE id = $1", [userId]);
  return rows[0]?.wallet_type ?? "custodial";
}

async function routeRelay(
  userId: string,
  cdpCall:       () => Promise<{ txHash: string; gasless: boolean }>,
  pimlicoCall:   () => Promise<{ txHash: string; blockNumber: number }>,
  eoaFallback:   () => Promise<RelayResult>
): Promise<RelayResult> {
  const walletType = await getWalletType(userId);

  // External wallets sign their own transactions client-side — cannot relay
  if (walletType === "external") throw new ExternalWalletError(userId);

  if (walletType === "cdp" && isCdpEnabled()) {
    const r = await cdpCall();
    return { txHash: r.txHash, blockNumber: 0, gasUsed: "0", gasless: r.gasless };
  }

  if (config.PIMLICO_API_KEY && walletType === "custodial") {
    const r = await pimlicoCall();
    return { txHash: r.txHash, blockNumber: r.blockNumber, gasUsed: "0", gasless: true };
  }

  return eoaFallback();
}

// ── Public relay functions ─────────────────────────────────────────────────

/**
 * Relay: buy a pet on behalf of a user.
 * With Pimlico: fully gasless via ERC-4337 UserOperation.
 * Without Pimlico: deployer tops up EOA, then submits tx.
 */
export async function relayBuyPet(userId: string, tokenId: number): Promise<RelayResult> {
  return routeRelay(
    userId,
    () => cdpRelayBuyPet(userId, tokenId, config.PETS_MARKET_ADDRESS as Address),
    async () => {
      const pk    = await getCustodialPrivateKey(userId);
      if (!pk) throw new Error("No custodial wallet for user");
      const relay = await buildSmartAccountRelay(pk, config.PIMLICO_API_KEY!);
      return relay.sendCalls([{ to: config.PETS_MARKET_ADDRESS as Address, data: encodeBuy(tokenId) }]);
    },
    async () => {
      const signer = await getCustodialSigner(userId, provider);
      if (!signer) throw new Error("No custodial wallet for user");
      await ensureGasBalance(signer.address, provider);
      const tx      = await (market.connect(signer) as ethers.Contract).buy(tokenId);
      const receipt = await tx.wait();
      return { txHash: receipt.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed.toString(), gasless: false };
    }
  );
}

export async function relayLockPet(userId: string, tokenId: number, durationSeconds: number): Promise<RelayResult> {
  return routeRelay(
    userId,
    () => cdpRelayLockPet(userId, tokenId, durationSeconds, config.PETS_MARKET_ADDRESS as Address),
    async () => {
      const pk    = await getCustodialPrivateKey(userId);
      if (!pk) throw new Error("No custodial wallet");
      const relay = await buildSmartAccountRelay(pk, config.PIMLICO_API_KEY!);
      return relay.sendCalls([{ to: config.PETS_MARKET_ADDRESS as Address, data: encodeLockPet(tokenId, durationSeconds) }]);
    },
    async () => {
      const signer = await getCustodialSigner(userId, provider);
      if (!signer) throw new Error("No custodial wallet");
      await ensureGasBalance(signer.address, provider);
      const tx      = await (market.connect(signer) as ethers.Contract).lockPet(tokenId, durationSeconds);
      const receipt = await tx.wait();
      return { txHash: receipt.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed.toString(), gasless: false };
    }
  );
}

export async function relayGiftCash(userId: string, tokenId: number, amountWei: bigint): Promise<RelayResult> {
  return routeRelay(
    userId,
    () => cdpRelayGiftCash(userId, tokenId, amountWei, config.PETS_MARKET_ADDRESS as Address),
    async () => {
      const pk    = await getCustodialPrivateKey(userId);
      if (!pk) throw new Error("No custodial wallet");
      const relay = await buildSmartAccountRelay(pk, config.PIMLICO_API_KEY!);
      return relay.sendCalls([{ to: config.PETS_MARKET_ADDRESS as Address, data: encodeGiftCash(tokenId, amountWei) }]);
    },
    async () => {
      const signer = await getCustodialSigner(userId, provider);
      if (!signer) throw new Error("No custodial wallet");
      await ensureGasBalance(signer.address, provider);
      const tx      = await (market.connect(signer) as ethers.Contract).giftCash(tokenId, amountWei);
      const receipt = await tx.wait();
      return { txHash: receipt.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed.toString(), gasless: false };
    }
  );
}

/**
 * Relay: mint profile SFT on user signup.
 * Always called by deployer (ADMIN_ROLE) — user never pays gas for this.
 */
export async function relayMintProfile(
  walletAddress: string,
  startingPrice: bigint
): Promise<{ tokenId: number; txHash: string }> {
  const deployer  = new ethers.Wallet(config.DEPLOYER_PRIVATE_KEY, provider);
  const tx        = await (registry.connect(deployer) as ethers.Contract).mintProfile(walletAddress, startingPrice);
  const receipt   = await tx.wait();

  const iface = new ethers.Interface([
    "event ProfileMinted(address indexed user, uint256 indexed tokenId, uint256 startingPrice)",
  ]);
  let tokenId = 0;
  for (const l of receipt.logs) {
    try {
      const p = iface.parseLog({ topics: l.topics as string[], data: l.data });
      if (p?.name === "ProfileMinted") { tokenId = Number(p.args[1]); break; }
    } catch {}
  }
  return { tokenId, txHash: receipt.hash };
}

export function formatPetPrice(priceWei: bigint): string {
  return `${parseFloat(ethers.formatEther(priceWei)).toFixed(2)} CASH`;
}

// ── Unsigned tx builders for external (WalletConnect) wallets ────────────────

const CHAIN_ID  = parseInt(config.CHAIN_ID);
const MAX_U256  = (2n ** 256n - 1n).toString();

async function getUserWallet(userId: string): Promise<string> {
  const { rows } = await db.query(
    "SELECT wallet_address FROM users WHERE id = $1",
    [userId]
  );
  if (!rows[0]?.wallet_address) throw new Error("User has no wallet address");
  return rows[0].wallet_address as string;
}

/**
 * Returns the unsigned transaction steps for buying a pet.
 * Step 1: Approve PetsCash spend (only if current allowance < price).
 * Step 2: PetsMarket.buy(tokenId)
 */
export async function buildBuyTxData(
  userId: string,
  tokenId: number
): Promise<ExternalTxPayload & { currentPriceWei: string; currentPrice: string }> {
  const walletAddress = await getUserWallet(userId);
  const state         = await market.states(tokenId);
  const priceWei      = state[1] as bigint;
  const allowance     = await cash.allowance(walletAddress, config.PETS_MARKET_ADDRESS) as bigint;

  const steps: TxStep[] = [];

  if (allowance < priceWei) {
    steps.push({
      step:        1,
      description: "Approve PetsCash for PetsMarket",
      to:          config.PETS_CASH_ADDRESS,
      data:        encodeApprove(config.PETS_MARKET_ADDRESS as Address, BigInt(MAX_U256)),
      value:       "0",
      chainId:     CHAIN_ID,
      gasLimit:    "60000",
    });
  }

  steps.push({
    step:        steps.length + 1,
    description: `Buy pet #${tokenId} for ${formatPetPrice(priceWei)}`,
    to:          config.PETS_MARKET_ADDRESS,
    data:        encodeBuy(tokenId),
    value:       "0",
    chainId:     CHAIN_ID,
    gasLimit:    "200000",
  });

  return {
    externalWallet:  true,
    steps,
    currentPriceWei: priceWei.toString(),
    currentPrice:    formatPetPrice(priceWei),
  };
}

/** Unsigned tx for locking a pet (owner only). */
export async function buildLockTxData(
  tokenId: number,
  durationSeconds: number
): Promise<ExternalTxPayload> {
  return {
    externalWallet: true,
    steps: [{
      step:        1,
      description: `Lock pet #${tokenId} for ${Math.round(durationSeconds / 3600)}h`,
      to:          config.PETS_MARKET_ADDRESS,
      data:        encodeLockPet(tokenId, durationSeconds),
      value:       "0",
      chainId:     CHAIN_ID,
      gasLimit:    "150000",
    }],
  };
}

/** Unsigned tx steps for gifting PCASH (includes approval if needed). */
export async function buildGiftTxData(
  userId: string,
  tokenId: number,
  amountWei: bigint
): Promise<ExternalTxPayload> {
  const walletAddress = await getUserWallet(userId);
  const allowance     = await cash.allowance(walletAddress, config.PETS_MARKET_ADDRESS) as bigint;

  const steps: TxStep[] = [];

  if (allowance < amountWei) {
    steps.push({
      step:        1,
      description: "Approve PetsCash for PetsMarket",
      to:          config.PETS_CASH_ADDRESS,
      data:        encodeApprove(config.PETS_MARKET_ADDRESS as Address, BigInt(MAX_U256)),
      value:       "0",
      chainId:     CHAIN_ID,
      gasLimit:    "60000",
    });
  }

  steps.push({
    step:        steps.length + 1,
    description: `Gift ${ethers.formatEther(amountWei)} PCASH to pet #${tokenId}`,
    to:          config.PETS_MARKET_ADDRESS,
    data:        encodeGiftCash(tokenId, amountWei),
    value:       "0",
    chainId:     CHAIN_ID,
    gasLimit:    "120000",
  });

  return { externalWallet: true, steps };
}

/**
 * Broadcast a pre-signed transaction hex from an external wallet.
 * The client signs each TxStep using WalletConnect/MetaMask and POSTs the signed hex.
 */
export async function broadcastSignedTx(
  signedTxHex: string
): Promise<{ txHash: string; blockNumber: number; gasUsed: string }> {
  const tx      = await provider.broadcastTransaction(signedTxHex);
  const receipt = await tx.wait();
  if (!receipt) throw new Error("Transaction confirmed but receipt is null");
  return {
    txHash:      receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed:     receipt.gasUsed.toString(),
  };
}
