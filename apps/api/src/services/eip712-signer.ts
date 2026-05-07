import { ethers } from "ethers";
import { config } from "../config";

const signer = new ethers.Wallet(config.SIGNER_PRIVATE_KEY);

const bonusDomain = {
  name: "Bae4U",
  version: "1",
  chainId: parseInt(config.CHAIN_ID),
  verifyingContract: config.PETS_CASH_ADDRESS as `0x${string}`,
};

const badgeDomain = {
  name: "Bae4U",
  version: "1",
  chainId: parseInt(config.CHAIN_ID),
  verifyingContract: config.PETS_RANKING_ADDRESS as `0x${string}`,
};

const BONUS_TYPES = {
  BonusClaim: [
    { name: "user",      type: "address" },
    { name: "amount",    type: "uint256" },
    { name: "timestamp", type: "uint256" },
  ],
};

const BADGE_TYPES = {
  BadgeClaim: [
    { name: "user",       type: "address" },
    { name: "tier",       type: "uint8"   },
    { name: "snapshotTs", type: "uint256" },
  ],
};

/**
 * Signs a login bonus claim. User submits this signature directly to PetsCash.claimBonus().
 * The backend never calls mintBonus() itself — trustless pattern.
 */
export async function signBonusClaim(
  userAddress: string,
  amount: bigint,
  timestamp: number
): Promise<string> {
  return signer.signTypedData(bonusDomain, BONUS_TYPES, {
    user:      userAddress,
    amount,
    timestamp: BigInt(timestamp),
  });
}

/**
 * Signs a badge claim proof. User submits this to PetsRanking.issueBadge().
 */
export async function signBadgeClaim(
  userAddress: string,
  tier: number,
  snapshotTs: number
): Promise<string> {
  return signer.signTypedData(badgeDomain, BADGE_TYPES, {
    user:       userAddress,
    tier,
    snapshotTs: BigInt(snapshotTs),
  });
}

export const signerAddress = signer.address;
