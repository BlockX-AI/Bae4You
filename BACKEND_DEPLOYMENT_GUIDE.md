# Backend Deployment Guide - Bae4U

## 🚀 Quick Deploy Steps

### Step 1: Push CORS Fix to GitHub

```bash
cd /Users/jalajnagar/Bae4u/Bae4You/backend_repo
git add apps/api/src/index.ts
git commit -m "fix: enhance CORS for Flutter Web with explicit localhost ports"
git push origin main
```

### Step 2: Railway Dashboard - Check Environment Variables

Go to: https://railway.app/dashboard

**Required Environment Variables:**

| Variable | Required | Current Value | Notes |
|----------|----------|---------------|-------|
| `DATABASE_URL` | ✅ | Set | PostgreSQL connection |
| `REDIS_URL` | ✅ | Set | Redis connection |
| `JWT_SECRET` | ✅ | Set | Min 32 characters |
| `JWT_REFRESH_SECRET` | ✅ | Set | Min 32 characters |
| `SIWE_DOMAIN` | ✅ | catchup.app | Must match Flutter app domain |
| `SIWE_CHAIN_ID` | ✅ | 84532 | Base Sepolia testnet |
| `BASE_SEPOLIA_RPC_URL` | ✅ | Set | Alchemy/Infura URL |
| `DEPLOYER_PRIVATE_KEY` | ✅ | Set | Wallet with gas funds |
| `PETS_REGISTRY_ADDRESS` | ✅ | Set | Contract address |
| `PETS_MARKET_ADDRESS` | ✅ | Set | Contract address |
| `PETS_CASH_ADDRESS` | ✅ | Set | Contract address |
| `NODE_ENV` | ✅ | production | Must be "production" |

### Step 3: Deploy to Railway

**Option A: Auto-Deploy (Recommended)**
1. Railway auto-deploys when you push to main
2. Go to your project in Railway dashboard
3. Check "Deployments" tab for status

**Option B: Manual Deploy**
1. Railway Dashboard → Your Project
2. Click "Deploy" button
3. Wait for build to complete

### Step 4: Run Database Migrations

In Railway dashboard:

```bash
# Shell access in Railway
npm run migrate
npm run migrate:features
npm run migrate:fantasy
npm run migrate:fantasy-bae
npm run migrate:performance
```

Or locally (with Railway DB connection):
```bash
cd apps/api
DATABASE_URL=your_railway_db_url npm run migrate
```

### Step 5: Verify Deployment

Test these endpoints in browser:

```
✅ Health: https://baebackend-production.up.railway.app/health
✅ Nonce: https://baebackend-production.up.railway.app/auth/nonce/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbD
```

---

## 🔧 Backend Code Fixes Applied

### CORS Configuration Updated

**File:** `apps/api/src/index.ts`

**Changes Made:**
- Added explicit localhost ports for Flutter Web
- Added methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
- Added allowedHeaders for Authorization

**Before:**
```javascript
await app.register(cors, {
  origin: config.NODE_ENV === "production"
    ? [
        "https://app.bae4u.com",
        /\.expo\.dev$/,
        /localhost/,
      ]
    : true,
  credentials: true,
});
```

**After:**
```javascript
await app.register(cors, {
  origin: config.NODE_ENV === "production"
    ? [
        "https://app.bae4u.com",
        "http://localhost:8080",     // Flutter Web
        "http://localhost:3000",     // React dev
        "http://127.0.0.1:8080",     // Flutter Web alt
        /\.expo\.dev$/,
        /localhost/,
        /127\.0\.0\.1/,
      ]
    : true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
});
```

---

## 📝 Backend Architecture Overview

### Tech Stack
- **Framework:** Fastify (Node.js)
- **Language:** TypeScript
- **Database:** PostgreSQL
- **Cache:** Redis
- **Auth:** SIWE (Sign-In with Ethereum) + JWT
- **Real-time:** Socket.io

### API Endpoints Available

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/auth/nonce/:wallet` | GET | Get SIWE nonce |
| `/auth/siwe` | POST | Verify signature |
| `/users/me` | GET | Get current user |
| `/users/me` | PUT | Update profile |
| `/matches/discover` | GET | Browse candidates |
| `/matches/like` | POST | Like user |
| `/matches/pass` | POST | Pass user |
| `/matches` | GET | Get my matches |
| `/pets` | GET | Browse pets |
| `/pets/:tokenId` | GET | Get pet details |
| `/pets/portfolio/:wallet` | GET | My pets |
| `/heroes/leaderboard` | GET | Fantasy Bae rankings |

### Database Schema

**Core Tables:**
- `users` - User profiles
- `nonces` - SIWE nonces
- `matches` - User matches
- `messages` - Chat messages
- `pets_state` - NFT pet data
- `pet_transactions` - Pet trade history
- `hero_scores` - Fantasy Bae scores

---

## 🧪 Testing After Deploy

### 1. Test Backend Health
```bash
curl https://baebackend-production.up.railway.app/health
```

### 2. Test Nonce Endpoint
```bash
curl https://baebackend-production.up.railway.app/auth/nonce/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbD
```

### 3. Test CORS from Flutter Web
Open browser console on `http://localhost:8080` and run:
```javascript
fetch('https://baebackend-production.up.railway.app/health')
  .then(r => r.json())
  .then(console.log)
```

### 4. Test Full Auth Flow
1. Open Flutter app: `flutter run -d chrome`
2. Click "Get Started"
3. Click "Quick Start"
4. Should login successfully (no more "Connection failed")

---

## 🚨 Troubleshooting

### Issue: "Connection failed" still showing

**Check:**
1. Backend is deployed: `curl /health` returns `{"status":"ok"}`
2. CORS allows your origin (check browser console for CORS errors)
3. `NODE_ENV=production` is set in Railway
4. All required env vars are set

**Fix:**
```bash
# In Railway dashboard, add if missing:
NODE_ENV=production
SIWE_DOMAIN=catchup.app
SIWE_CHAIN_ID=84532
```

### Issue: "Invalid address" error

**Check:**
Wallet address format (must be 42 chars: 0x + 40 hex)

**Fix in Flutter:**
```dart
// Correct format
final walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbD';
```

### Issue: "SIWE verification failed"

**Check:**
1. `SIWE_DOMAIN` matches the domain in Flutter app
2. `SIWE_CHAIN_ID` matches (84532 for Base Sepolia)
3. Nonce hasn't expired (5 minutes)
4. Signature format is correct

### Issue: Database errors

**Check migrations:**
```bash
npm run migrate
```

**Check connection:**
Verify `DATABASE_URL` is correct in Railway dashboard.

---

## 🔐 Security Checklist

- [ ] `JWT_SECRET` is 32+ random characters
- [ ] `DEPLOYER_PRIVATE_KEY` has funds for gas
- [ ] `NODE_ENV=production` in production
- [ ] CORS origins restricted in production
- [ ] Database has SSL enabled
- [ ] Redis has AUTH enabled

---

## 📊 Monitoring

**Health Endpoint:**
```
GET https://baebackend-production.up.railway.app/health
```

**Logs:**
Railway Dashboard → Your Project → Logs tab

**Metrics:**
- Request rate
- Error rate
- Database connections
- Redis memory usage

---

## 🎯 Next Steps After Deploy

1. ✅ Backend deployed and healthy
2. ✅ Test auth flow from Flutter app
3. ✅ Create test user via Flutter app
4. ✅ Verify data in database
5. ✅ Test all API endpoints
6. 🔄 Remove DEMO MODE from Flutter (optional)
7. 🚀 Production release!

---

## 📞 Support

If deployment fails:
1. Check Railway logs for errors
2. Verify all env vars are set
3. Ensure database is accessible
4. Test endpoints with curl

**Backend Repo:** https://github.com/BlockX-AI/Bae4You
**Railway Dashboard:** https://railway.app/dashboard
