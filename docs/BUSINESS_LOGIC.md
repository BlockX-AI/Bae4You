# Trading Core Business Logic

## Currency Rules
- All monetary values stored as integer cents/wei
- NO floating-point math anywhere
- PCASH, Gold, Value: all `int` (or `bigint` in DB)

## Buy Mechanic

### Price Calculation
```
new_value = floor(current_value * 110 / 100)
delta = new_value - current_value
```

### Fund Distribution
1. **Buyer debited:** `new_value`
2. **Previous owner credited:** `current_value + floor(delta / 2)`
3. **Bought user credited:** `ceil(delta / 2)`
4. **First-time buy** (no previous owner): bought user gets full `new_value`

### Atomic Transaction
All balance updates execute in single DB transaction - all-or-nothing.

## Constraints

| Constraint | Error Code |
|------------|------------|
| PCASH >= 0 | ERR_INSUFFICIENT_FUNDS |
| Max 400 ownerships per owner | ERR_OWNERSHIP_LIMIT |
| Cannot buy self | ERR_SELF_PURCHASE |
| Cannot buy locked pet | ERR_PET_LOCKED |
| Cannot buy already-owned pet | ERR_ALREADY_OWNED |
| Bid > current_value | ERR_INVALID_BID_AMOUNT |
| Bid <= bidder PCASH | ERR_INVALID_BID_AMOUNT |

## Place Bid
- Store bid, do not execute purchase
- Bid amount must be > `current_value` and <= bidder's PCASH
- Expires after 7 days
- Status: `active`, `expired`, `accepted`, `withdrawn`

## List for Sale
- Owner sets price >= `current_value`
- Buyer pays listed price (not 110%)
- Same split rules apply to delta

## Get Bids
- Return active bids only (status = 'active', expires_at > NOW)
- Sorted by amount descending
- Include bidder name + amount + created_at

## Error Codes
- `ERR_INSUFFICIENT_FUNDS` - 402
- `ERR_OWNERSHIP_LIMIT` - 409
- `ERR_PET_LOCKED` - 409
- `ERR_SELF_PURCHASE` - 400
- `ERR_ALREADY_OWNED` - 409
- `ERR_INVALID_BID_AMOUNT` - 400
- `ERR_UNAUTHORIZED` - 401
- `ERR_NOT_FOUND` - 404
