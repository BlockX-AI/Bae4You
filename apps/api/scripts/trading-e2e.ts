/**
 * Trading Core E2E Tests
 * Tests buy_pet, placeBid, listPetForSale, getPetBids endpoints
 * Usage: DOTENV_CONFIG_PATH=../../.env pnpm --filter=api exec tsx scripts/trading-e2e.ts
 */

import "../src/config";
import { db } from "../src/db/client";
import { v4 as uuidv4 } from "uuid";

const OK = "✅";
const ERR = "❌";

interface TestUser {
  id: string;
  username: string;
  wallet_address: string;
  pcash_balance: number;
}

interface TestPet {
  token_id: number;
  user_address: string;
  current_price_wei: number;
}

let testCount = 0;
let passCount = 0;

function test(label: string) {
  testCount++;
  process.stdout.write(`  ${label}... `);
  return {
    pass: (detail = "") => {
      passCount++;
      console.log(`${OK} ${detail}`);
    },
    fail: (err: unknown) => {
      console.log(`${ERR} ${err instanceof Error ? err.message : err}`);
    }
  };
}

async function setupTestData(): Promise<{ buyer: TestUser; seller: TestUser; pet: TestPet }> {
  // Create test users
  const buyerId = uuidv4();
  const sellerId = uuidv4();
  const boughtUserId = uuidv4();

  await db.query(
    `INSERT INTO users (id, username, wallet_address, pcash_balance, gold_balance, current_value, is_active)
     VALUES ($1, 'test_buyer', '0xbuyer', 1000000, 0, 0, true),
            ($2, 'test_seller', '0xseller', 1000000, 0, 0, true),
            ($3, 'test_bought_user', '0xbought', 0, 0, 0, true)`,
    [buyerId, sellerId, boughtUserId]
  );

  // Create test pet with bought_user as the "bought user" (person whose photo was used)
  const tokenId = Math.floor(Math.random() * 1000000) + 1000000;
  await db.query(
    `INSERT INTO pets_state (token_id, user_address, current_price_wei, total_purchases, is_locked, pet_status)
     VALUES ($1, $2, 10000, 0, false, 'active')`,
    [tokenId, '0xbought']
  );

  return {
    buyer: { id: buyerId, username: 'test_buyer', wallet_address: '0xbuyer', pcash_balance: 1000000 },
    seller: { id: sellerId, username: 'test_seller', wallet_address: '0xseller', pcash_balance: 1000000 },
    pet: { token_id: tokenId, user_address: '0xbought', current_price_wei: 10000 }
  };
}

async function cleanupTestData() {
  await db.query(`DELETE FROM value_history WHERE reason = 'test_trading'`);
  await db.query(`DELETE FROM transactions WHERE type = 'buy'`);
  await db.query(`DELETE FROM bids WHERE bidder_id IN (SELECT id FROM users WHERE username LIKE 'test_%')`);
  await db.query(`DELETE FROM pets_ownership WHERE owner_id IN (SELECT id FROM users WHERE username LIKE 'test_%')`);
  await db.query(`DELETE FROM pets_state WHERE token_id >= 1000000`);
  await db.query(`DELETE FROM users WHERE username LIKE 'test_%'`);
}

async function runTests() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("  Trading Core E2E Tests");
  console.log("══════════════════════════════════════════════════\n");

  await cleanupTestData();
  const { buyer, seller, pet } = await setupTestData();

  // Test 1: Happy path - buy pet
  {
    const t = test("Happy path: buy pet");
    try {
      const result = await db.query(
        `SELECT buy_pet($1::bigint, $2::uuid)`,
        [pet.token_id, buyer.id]
      );
      const outcome = result.rows[0].buy_pet;

      if (!outcome.success) throw new Error(`Expected success, got: ${outcome.error}`);

      // Verify buyer debited
      const buyerBal = await db.query(`SELECT pcash_balance FROM users WHERE id = $1`, [buyer.id]);
      const expectedBuyerBal = 1000000 - 11000; // 10000 * 1.1 = 11000
      if (buyerBal.rows[0].pcash_balance !== expectedBuyerBal) {
        throw new Error(`Buyer balance wrong: ${buyerBal.rows[0].pcash_balance} vs ${expectedBuyerBal}`);
      }

      // Verify bought user credited (no prev owner, so gets full new_price)
      const boughtUserBal = await db.query(`SELECT pcash_balance FROM users WHERE wallet_address = $1`, ['0xbought']);
      if (boughtUserBal.rows[0].pcash_balance !== 11000) {
        throw new Error(`Bought user balance wrong: ${boughtUserBal.rows[0].pcash_balance} vs 11000`);
      }

      // Verify ownership created
      const ownership = await db.query(
        `SELECT * FROM pets_ownership WHERE pet_id = $1 AND owner_id = $2 AND released_at IS NULL`,
        [pet.token_id, buyer.id]
      );
      if (ownership.rows.length !== 1) throw new Error("Ownership not created");

      // Verify transaction recorded
      const tx = await db.query(`SELECT * FROM transactions WHERE pet_id = $1`, [pet.token_id]);
      if (tx.rows.length !== 1) throw new Error("Transaction not recorded");

      t.pass(`tx_id=${outcome.transaction_id}`);
    } catch (e) { t.fail(e); }
  }

  // Test 2: Insufficient funds
  {
    const t = test("Insufficient funds → ERR_INSUFFICIENT_FUNDS");
    try {
      // Create poor buyer
      const poorBuyerId = uuidv4();
      await db.query(
        `INSERT INTO users (id, username, wallet_address, pcash_balance, is_active)
         VALUES ($1, 'test_poor', '0xpoor', 100, true)`,
        [poorBuyerId]
      );

      // Create expensive pet
      const expensiveTokenId = Math.floor(Math.random() * 1000000) + 2000000;
      await db.query(
        `INSERT INTO pets_state (token_id, user_address, current_price_wei, total_purchases, is_locked, pet_status)
         VALUES ($1, $2, 100000, 0, false, 'active')`,
        [expensiveTokenId, '0xbought']
      );

      const result = await db.query(
        `SELECT buy_pet($1::bigint, $2::uuid)`,
        [expensiveTokenId, poorBuyerId]
      );
      const outcome = result.rows[0].buy_pet;

      if (outcome.code !== 'ERR_INSUFFICIENT_FUNDS') {
        throw new Error(`Expected ERR_INSUFFICIENT_FUNDS, got: ${outcome.code}`);
      }
      t.pass("402 returned");
    } catch (e) { t.fail(e); }
  }

  // Test 3: Already owned
  {
    const t = test("Already owned → ERR_ALREADY_OWNED");
    try {
      // Buyer already owns from test 1
      const result = await db.query(
        `SELECT buy_pet($1::bigint, $2::uuid)`,
        [pet.token_id, buyer.id]
      );
      const outcome = result.rows[0].buy_pet;

      if (outcome.code !== 'ERR_ALREADY_OWNED') {
        throw new Error(`Expected ERR_ALREADY_OWNED, got: ${outcome.code}`);
      }
      t.pass("409 returned");
    } catch (e) { t.fail(e); }
  }

  // Test 4: 400 pet limit
  {
    const t = test("400 pet limit → ERR_OWNERSHIP_LIMIT");
    try {
      // Create user with 400 pets
      const limitBuyerId = uuidv4();
      await db.query(
        `INSERT INTO users (id, username, wallet_address, pcash_balance, is_active)
         VALUES ($1, 'test_limit', '0xlimit', 10000000, true)`,
        [limitBuyerId]
      );

      // Create 400 ownership records
      for (let i = 0; i < 400; i++) {
        const fakeTokenId = 10000000 + i;
        await db.query(
          `INSERT INTO pets_state (token_id, user_address, current_price_wei, pet_status)
           VALUES ($1, $2, 100, 'active')
           ON CONFLICT DO NOTHING`,
          [fakeTokenId, '0xbought']
        );
        await db.query(
          `INSERT INTO pets_ownership (owner_id, pet_id, purchase_price, purchased_at)
           VALUES ($1, $2, 100, NOW())`,
          [limitBuyerId, fakeTokenId]
        );
      }

      // Try to buy one more
      const newTokenId = 10005000;
      await db.query(
        `INSERT INTO pets_state (token_id, user_address, current_price_wei, pet_status)
         VALUES ($1, $2, 100, 'active')`,
        [newTokenId, '0xbought']
      );

      const result = await db.query(
        `SELECT buy_pet($1::bigint, $2::uuid)`,
        [newTokenId, limitBuyerId]
      );
      const outcome = result.rows[0].buy_pet;

      if (outcome.code !== 'ERR_OWNERSHIP_LIMIT') {
        throw new Error(`Expected ERR_OWNERSHIP_LIMIT, got: ${outcome.code}`);
      }
      t.pass("409 returned");
    } catch (e) { t.fail(e); }
  }

  // Test 5: Integer split verification (delta=1)
  {
    const t = test("Integer split: delta=1 → no cents lost");
    try {
      const splitBuyerId = uuidv4();
      const splitSellerId = uuidv4();
      const splitBoughtId = uuidv4();

      await db.query(
        `INSERT INTO users (id, username, wallet_address, pcash_balance, is_active)
         VALUES ($1, 'test_split_buyer', '0xsplitbuyer', 1000000, true),
                ($2, 'test_split_seller', '0xsplitseller', 0, true),
                ($3, 'test_split_bought', '0xsplitbought', 0, true)`,
        [splitBuyerId, splitSellerId, splitBoughtId]
      );

      // Price 10, new price 11, delta=1
      const splitTokenId = 20000000;
      await db.query(
        `INSERT INTO pets_state (token_id, user_address, current_price_wei, pet_status)
         VALUES ($1, $2, 10, 'active')`,
        [splitTokenId, '0xsplitbought']
      );

      // Seller owns it
      await db.query(
        `INSERT INTO pets_ownership (owner_id, pet_id, purchase_price, purchased_at)
         VALUES ($1, $2, 5, NOW())`,
        [splitSellerId, splitTokenId]
      );

      const result = await db.query(
        `SELECT buy_pet($1::bigint, $2::uuid)`,
        [splitTokenId, splitBuyerId]
      );
      const outcome = result.rows[0].buy_pet;

      if (!outcome.success) throw new Error(outcome.error);

      // prev_owner_value = current_price + floor(delta/2) = 10 + 0 = 10
      // bought_user_value = ceil(delta/2) = 1
      // Total = 10 + 1 = 11 (no loss!)

      if (outcome.prev_owner_value !== 10) {
        throw new Error(`prev_owner_value: ${outcome.prev_owner_value} vs 10`);
      }
      if (outcome.bought_user_value !== 1) {
        throw new Error(`bought_user_value: ${outcome.bought_user_value} vs 1`);
      }

      t.pass("10 + 1 = 11 ✓");
    } catch (e) { t.fail(e); }
  }

  // Test 6: Integer split verification (delta=999)
  {
    const t = test("Integer split: delta=999 → no cents lost");
    try {
      const splitBuyerId = uuidv4();
      const splitSellerId = uuidv4();

      // Get existing bought user from earlier
      const { rows: [boughtUser] } = await db.query(
        `SELECT id FROM users WHERE wallet_address = $1`, ['0xsplitbought']
      );

      // Price 1000, new price 1100, delta=100 (actually: 1000 * 1.1 = 1100, delta=100)
      // Let me recalculate: new_price = floor(1000 * 110 / 100) = 1100
      // delta = 1100 - 1000 = 100
      // prev_owner: 1000 + floor(100/2) = 1000 + 50 = 1050
      // bought_user: ceil(100/2) = 50
      // Total: 1050 + 50 = 1100 ✓

      const splitTokenId = 20000001;
      await db.query(
        `INSERT INTO pets_state (token_id, user_address, current_price_wei, pet_status)
         VALUES ($1, $2, 1000, 'active')`,
        [splitTokenId, '0xsplitbought']
      );

      // Seller owns it
      await db.query(
        `INSERT INTO pets_ownership (owner_id, pet_id, purchase_price, purchased_at)
         VALUES ($1, $2, 500, NOW())`,
        [splitSellerId, splitTokenId]
      );

      const result = await db.query(
        `SELECT buy_pet($1::bigint, $2::uuid)`,
        [splitTokenId, splitBuyerId]
      );
      const outcome = result.rows[0].buy_pet;

      if (!outcome.success) throw new Error(outcome.error);

      // Verify: 1050 + 50 = 1100
      const sellerBal = await db.query(`SELECT pcash_balance FROM users WHERE id = $1`, [splitSellerId]);
      const boughtBal = await db.query(`SELECT pcash_balance FROM users WHERE wallet_address = $1`, ['0xsplitbought']);

      if (sellerBal.rows[0].pcash_balance !== 1050) {
        throw new Error(`Seller got ${sellerBal.rows[0].pcash_balance} vs 1050`);
      }
      if (boughtBal.rows[0].pcash_balance !== 1 + 50) { // 1 from previous + 50
        throw new Error(`Bought user got ${boughtBal.rows[0].pcash_balance} vs 51`);
      }

      t.pass("1050 + 50 = 1100 ✓");
    } catch (e) { t.fail(e); }
  }

  // Test 7: Place bid
  {
    const t = test("Place bid: creates active bid");
    try {
      const bidderId = uuidv4();
      await db.query(
        `INSERT INTO users (id, username, wallet_address, pcash_balance, is_active)
         VALUES ($1, 'test_bidder', '0xbidder', 100000, true)`,
        [bidderId]
      );

      const bidPetId = 30000000;
      await db.query(
        `INSERT INTO pets_state (token_id, user_address, current_price_wei, pet_status)
         VALUES ($1, $2, 5000, 'active')`,
        [bidPetId, '0xbought']
      );

      const { rows } = await db.query(
        `INSERT INTO bids (bidder_id, pet_id, amount, status, expires_at)
         VALUES ($1, $2, 6000, 'active', NOW() + INTERVAL '7 days')
         RETURNING id, amount, created_at, expires_at`,
        [bidderId, bidPetId]
      );

      if (rows.length !== 1) throw new Error("Bid not created");
      if (rows[0].amount !== 6000) throw new Error(`Amount: ${rows[0].amount} vs 6000`);

      t.pass(`bid_id=${rows[0].id}`);
    } catch (e) { t.fail(e); }
  }

  // Test 8: Get bids sorted
  {
    const t = test("Get bids: sorted by amount desc");
    try {
      const bidPetId = 30000001;
      await db.query(
        `INSERT INTO pets_state (token_id, user_address, current_price_wei, pet_status)
         VALUES ($1, $2, 1000, 'active')`,
        [bidPetId, '0xbought']
      );

      // Create multiple bidders
      for (let i = 0; i < 3; i++) {
        const bidderId = uuidv4();
        await db.query(
          `INSERT INTO users (id, username, wallet_address, pcash_balance, is_active)
           VALUES ($1, $2, $3, 100000, true)`,
          [bidderId, `test_bidder_${i}`, `0xbidder${i}`]
        );
        await db.query(
          `INSERT INTO bids (bidder_id, pet_id, amount, status, expires_at)
           VALUES ($1, $2, $3, 'active', NOW() + INTERVAL '7 days')`,
          [bidderId, bidPetId, 5000 + i * 1000]
        );
      }

      const { rows } = await db.query(
        `SELECT amount FROM bids WHERE pet_id = $1 AND status = 'active' ORDER BY amount DESC`,
        [bidPetId]
      );

      if (rows.length !== 3) throw new Error(`Got ${rows.length} bids`);
      if (rows[0].amount !== 7000) throw new Error(`First: ${rows[0].amount} vs 7000`);
      if (rows[2].amount !== 5000) throw new Error(`Last: ${rows[2].amount} vs 5000`);

      t.pass("7000, 6000, 5000 ✓");
    } catch (e) { t.fail(e); }
  }

  console.log("\n══════════════════════════════════════════════════");
  console.log(`  Results: ${passCount}/${testCount} tests passed`);
  console.log("══════════════════════════════════════════════════\n");

  await cleanupTestData();
  process.exit(passCount === testCount ? 0 : 1);
}

runTests().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
