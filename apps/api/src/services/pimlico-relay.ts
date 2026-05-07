/**
 * Pimlico ERC-4337 Relay Service
 *
 * Replaces the manual ETH gas-top-up approach with a true ERC-4337 paymaster.
 * Each custodial EOA owns a SimpleSmartAccount (deterministic CREATE2 address).
 * The Pimlico Paymaster signs UserOperations so the smart account needs ZERO ETH.
 *
 * Architecture:
 *   Custodial EOA private key (encrypted in DB)
 *     └─► SimpleSmartAccount (ERC-4337, deterministic address stored as wallet_address)
 *           └─► UserOperation signed by EOA
 *                 └─► Pimlico Bundler submits on-chain
 *                       └─► Pimlico Paymaster covers gas — user pays nothing
 */

import { createPublicClient, http, encodeFunctionData, type Hex, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";

const ENTRYPOINT_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as Address;

const BASE_SEPOLIA_RPC = process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";

function pimlicoUrl(apiKey: string): string {
  return `https://api.pimlico.io/v2/base-sepolia/rpc?apikey=${apiKey}`;
}

const publicClient = createPublicClient({
  chain:     baseSepolia,
  transport: http(BASE_SEPOLIA_RPC),
});

export interface SmartAccountRelay {
  address:   Address;
  sendCalls: (calls: { to: Address; data: Hex; value?: bigint }[]) => Promise<{ txHash: Hex; blockNumber: number }>;
}

/**
 * Builds a fully-sponsored smart account relay for the given EOA private key.
 * The returned address is the SimpleSmartAccount address — deterministic per key.
 * No ETH is needed in the smart account — Pimlico Paymaster covers all gas.
 */
export async function buildSmartAccountRelay(
  eoaPrivateKey: string,
  pimlicoApiKey: string
): Promise<SmartAccountRelay> {
  const owner  = privateKeyToAccount(eoaPrivateKey as Hex);
  const pimRpc = pimlicoUrl(pimlicoApiKey);

  const pimlico = createPimlicoClient({
    transport:  http(pimRpc),
    entryPoint: { address: ENTRYPOINT_V07, version: "0.7" as const },
  });

  const account = await toSimpleSmartAccount({
    client:     publicClient,
    owner,
    entryPoint: { address: ENTRYPOINT_V07, version: "0.7" as const },
  });

  const smartAccountClient = createSmartAccountClient({
    account,
    chain:            baseSepolia,
    bundlerTransport: http(pimRpc),
    paymaster:        pimlico,
    userOperation: {
      estimateFeesPerGas: async () => (await pimlico.getUserOperationGasPrice()).fast,
    },
  });

  async function sendCalls(
    calls: { to: Address; data: Hex; value?: bigint }[]
  ): Promise<{ txHash: Hex; blockNumber: number }> {
    const txHash = await smartAccountClient.sendTransaction({
      to:    calls[0].to,
      data:  calls[0].data,
      value: calls[0].value ?? 0n,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as Hex });
    return { txHash: txHash as Hex, blockNumber: Number(receipt.blockNumber) };
  }

  return { address: account.address, sendCalls };
}

/**
 * Derives the deterministic SimpleSmartAccount address for an EOA private key.
 * This is computed off-chain via CREATE2 — no transaction needed.
 * The result is what gets stored as `wallet_address` in the DB.
 */
export async function deriveSmartAccountAddress(
  eoaPrivateKey: string,
  pimlicoApiKey: string
): Promise<Address> {
  const relay = await buildSmartAccountRelay(eoaPrivateKey, pimlicoApiKey);
  return relay.address;
}

// ── Helpers for encoding common contract calls ──────────────────────────────

const MARKET_ABI = [
  { name: "buy",     type: "function", inputs: [{ name: "tokenId", type: "uint256" }],                           outputs: [], stateMutability: "nonpayable" },
  { name: "lockPet", type: "function", inputs: [{ name: "tokenId", type: "uint256" }, { name: "duration", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { name: "giftCash", type: "function", inputs: [{ name: "tokenId", type: "uint256" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
] as const;

const CASH_ABI = [
  { name: "approve",     type: "function", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { name: "claimBonus",  type: "function", inputs: [{ name: "amount", type: "uint256" }, { name: "timestamp", type: "uint256" }, { name: "sig", type: "bytes" }], outputs: [], stateMutability: "nonpayable" },
] as const;

export function encodeBuy(tokenId: number): Hex {
  return encodeFunctionData({ abi: MARKET_ABI, functionName: "buy",     args: [BigInt(tokenId)] });
}
export function encodeLockPet(tokenId: number, durationSeconds: number): Hex {
  return encodeFunctionData({ abi: MARKET_ABI, functionName: "lockPet", args: [BigInt(tokenId), BigInt(durationSeconds)] });
}
export function encodeGiftCash(tokenId: number, amount: bigint): Hex {
  return encodeFunctionData({ abi: MARKET_ABI, functionName: "giftCash", args: [BigInt(tokenId), amount] });
}
export function encodeApprove(spender: Address, amount: bigint): Hex {
  return encodeFunctionData({ abi: CASH_ABI, functionName: "approve", args: [spender, amount] });
}
export function encodeClaimBonus(amount: bigint, timestamp: number, sig: Hex): Hex {
  return encodeFunctionData({ abi: CASH_ABI, functionName: "claimBonus", args: [amount, BigInt(timestamp), sig] });
}
