import { ethers } from "ethers";
import { config } from "../config";
import { db } from "../db/client";

const provider = new ethers.JsonRpcProvider(config.BASE_SEPOLIA_RPC_URL);

const MARKET_ABI = [
  "event PetPurchased(uint256 indexed tokenId, address indexed prevOwner, address indexed newOwner, uint256 salePrice, uint256 newPrice)",
  "event PetLocked(uint256 indexed tokenId, address indexed owner, uint256 expiry)",
];

const market = new ethers.Contract(config.PETS_MARKET_ADDRESS, MARKET_ABI, provider);

async function getLastSyncedBlock(): Promise<number> {
  const { rows } = await db.query(
    "SELECT COALESCE(MAX(last_synced_block), 0) as block FROM pets_state"
  );
  return Number(rows[0]?.block ?? 0);
}

export async function syncPetPurchasedEvents(): Promise<number> {
  const fromBlock = await getLastSyncedBlock();
  const toBlock   = await provider.getBlockNumber();

  if (fromBlock >= toBlock) return 0;

  const events = await market.queryFilter(
    market.filters.PetPurchased(),
    fromBlock + 1,
    toBlock
  );

  let synced = 0;

  for (const rawEvent of events) {
    const event = rawEvent as ethers.EventLog;
    const { tokenId, prevOwner, newOwner, salePrice, newPrice } = event.args;
    const txHash     = event.transactionHash;
    const blockNum   = event.blockNumber;

    const tokenIdNum = Number(tokenId);
    const salePriceBig = BigInt(salePrice.toString());
    const newPriceBig  = BigInt(newPrice.toString());

    // Calculate profit splits matching PetsMarket contract logic:
    // fee = 2.5% of salePrice; after_fee = salePrice - fee
    // prev_price = newPrice / 1.1 (10% markup rule)
    // profit = after_fee - prev_price; split 50/50 between subject (pet profile) and seller
    const feeBps       = 250n;
    const basis        = 10000n;
    const fee          = (salePriceBig * feeBps) / basis;
    const afterFee     = salePriceBig - fee;
    // newPrice = salePrice * 1.1, so salePrice = newPrice / 1.1 = newPrice * 10 / 11
    const prevPrice    = (newPriceBig * 10n) / 11n;
    const profit       = afterFee > prevPrice ? afterFee - prevPrice : 0n;
    const halfProfit   = profit / 2n;
    const profitToPet  = halfProfit;
    const profitToSeller = afterFee - profitToPet;

    // Upsert pets_state
    await db.query(
      `INSERT INTO pets_state (token_id, owner_address, user_address, current_price_wei, total_purchases, last_synced_block)
       VALUES ($1, $2, $2, $3, 1, $4)
       ON CONFLICT (token_id) DO UPDATE SET
         owner_address    = $2,
         current_price_wei = $3,
         total_purchases  = pets_state.total_purchases + 1,
         last_synced_block = $4`,
      [tokenIdNum, newOwner.toLowerCase(), newPriceBig.toString(), blockNum]
    );

    // Insert transaction record (idempotent via tx_hash check)
    const exists = await db.query(
      "SELECT 1 FROM pet_transactions WHERE tx_hash = $1 AND token_id = $2",
      [txHash, tokenIdNum]
    );
    if (exists.rows.length === 0) {
      await db.query(
        `INSERT INTO pet_transactions
           (tx_hash, token_id, from_address, to_address,
            sale_price_wei, new_price_wei, block_number,
            profit_to_pet_wei, profit_to_seller_wei)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          txHash,
          tokenIdNum,
          prevOwner.toLowerCase(),
          newOwner.toLowerCase(),
          salePriceBig.toString(),
          newPriceBig.toString(),
          blockNum,
          profitToPet.toString(),
          profitToSeller.toString(),
        ]
      );
    }

    synced++;
  }

  return synced;
}

/**
 * Called during user signup: initialises the pets_state row for a freshly minted profile.
 */
export async function initPetState(
  tokenId: number,
  ownerAddress: string,
  startingPrice: string
): Promise<void> {
  await db.query(
    `INSERT INTO pets_state (token_id, owner_address, user_address, current_price_wei, last_synced_block)
     VALUES ($1, $2, $2, $3, 0)
     ON CONFLICT (token_id) DO NOTHING`,
    [tokenId, ownerAddress.toLowerCase(), startingPrice]
  );
}
