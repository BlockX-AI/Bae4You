import { ethers } from "ethers";
import { config } from "../config";

const provider = new ethers.JsonRpcProvider(config.BASE_SEPOLIA_RPC_URL);

// Minimal ABIs — only what we need
const ERC1155_ABI = [
  "function balanceOf(address account, uint256 id) view returns (uint256)",
];

const REGISTRY_ABI = [
  "function getTokenByAddress(address user) view returns (uint256)",
  "function getUserAddress(uint256 tokenId) view returns (address)",
  "function getPetStatus(uint256 tokenId) view returns (uint8)",
];

const MARKET_ABI = [
  "function states(uint256 tokenId) view returns (address owner, uint256 price, bool isLocked, uint256 lockExpiry, uint256 totalBuys)",
  "function getPrice(uint256 tokenId) view returns (uint256)",
];

const registry = new ethers.Contract(config.PETS_REGISTRY_ADDRESS, REGISTRY_ABI, provider);
const market   = new ethers.Contract(config.PETS_MARKET_ADDRESS,   MARKET_ABI,   provider);

export async function getUserTokenId(walletAddress: string): Promise<bigint> {
  return registry.getTokenByAddress(walletAddress);
}

export async function getPetOwner(tokenId: bigint): Promise<string> {
  const state = await market.states(tokenId);
  return state.owner as string;
}

export async function getPetPrice(tokenId: bigint): Promise<bigint> {
  return market.getPrice(tokenId);
}

/**
 * Verifies that walletAddress holds at least 1 of the given ERC-1155 tokenId
 * on the specified contract address. Used to gate creator pass content.
 */
export async function verifySFTOwnership(
  contractAddress: string,
  walletAddress: string,
  tokenId: bigint
): Promise<boolean> {
  const contract = new ethers.Contract(contractAddress, ERC1155_ABI, provider);
  const balance: bigint = await contract.balanceOf(walletAddress, tokenId);
  return balance > 0n;
}

export async function isPetActive(tokenId: bigint): Promise<boolean> {
  const status: number = await registry.getPetStatus(tokenId);
  return status === 0; // 0 = Active
}
