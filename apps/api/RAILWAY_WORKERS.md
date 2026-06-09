# Railway Worker Deployment Guide

The Bae4U backend has **3 separate Railway services** that must all be running:

---

## 1. Main API (already deployed)
- **Start command**: `pnpm start`
- **Root directory**: `apps/api`
- No changes needed.

---

## 2. Pets-Sync Worker (NEW — must add)
Polls Base Sepolia every 30s for `PetPurchased` events and keeps `pets_state` + `pet_transactions` tables up to date.

### Railway Dashboard Steps:
1. Go to your Railway project → **New Service** → **GitHub repo**
2. Set **Root Directory** to `apps/api`
3. In service settings → **Start Command**: `pnpm worker:pets`
4. Add the **same environment variables** as the main API service (share the DATABASE_URL, BASE_SEPOLIA_RPC_URL, PETS_MARKET_ADDRESS, etc.)
5. Deploy

---

## 3. Ranking Worker (NEW — must add)
Runs a weekly cron (Sunday 23:00 UTC) to compute hero scores, sign badge proofs, and snapshot rankings.

### Railway Dashboard Steps:
1. Go to your Railway project → **New Service** → **GitHub repo**
2. Set **Root Directory** to `apps/api`
3. In service settings → **Start Command**: `pnpm worker:ranking`
4. Add the **same environment variables** as the main API service (share DATABASE_URL, DEPLOYER_PRIVATE_KEY, etc.)
5. Deploy

> **Tip**: You can also trigger the ranking run manually without waiting for Sunday:
> Set env var `RUN_RANKING_NOW=true` on the service → redeploy → it will run immediately then exit.

---

## 4. Run the safety migration (ONE-TIME)
After deploying, run this once to create the `blocked_users` table in the existing Railway database:

```bash
# From apps/api directory, with .env pointing to Railway DATABASE_URL:
pnpm migrate:safety
```

Or run the SQL manually in Railway's database console:
```sql
CREATE TABLE IF NOT EXISTS blocked_users (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_blocked_blocker ON blocked_users (blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_blocked ON blocked_users (blocked_id);
```
