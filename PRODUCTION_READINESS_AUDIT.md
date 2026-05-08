# Bae4U/Fantasy Bae Production Readiness Audit

## A. Executive Verdict

**Current Readiness Level: BETA-READY (NOT PRODUCTION-READY)**

**Biggest Production Blocker:**
1. No rate limiting on any endpoints
2. No pagination on list endpoints
3. No structured logging/observability
4. No load testing for mobile scale
5. Database queries not optimized for scale
6. No proper error handling for RPC failures

**Launch Recommendation:**
- ✅ **Demo Ready** - All features work, tests pass
- ✅ **Private Beta Ready** - Small user base (<1000)
- ❌ **Public Beta Ready** - Missing rate limiting, pagination, monitoring
- ❌ **Mobile Launch Ready** - Missing resilience testing, observability
- ❌ **Million-User Production Ready** - Requires complete architecture overhaul

---

## B. Existing Test Autopsy

| Test File | Coverage Area | Real Value | Missing Assertions | Risk | Must-Fix Improvement |
|-----------|---------------|------------|-------------------|------|---------------------|
| **full-e2e.ts** | Full-stack integration (94/94 pass) | ✅ Proves basic connectivity | ❌ No latency measurements<br>❌ No concurrency testing<br>❌ No error injection<br>❌ Cleanup not atomic | **HIGH** - Happy path only | Add load testing, failure injection, performance metrics |
| **fantasy-bae-e2e.ts** | Fantasy Bae features (55/55 pass) | ✅ Proves new features work | ❌ No pagination testing<br>❌ No rate limit testing<br>❌ No auth expiry testing<br>❌ No duplicate request testing | **HIGH** - Mobile unsafe | Add mobile resilience tests, auth edge cases |
| **gameflow-v2-e2e.ts** | On-chain contracts (15/15 pass) | ✅ Proves contracts deploy | ❌ No gas estimation failures<br>❌ No reorg handling<br>❌ No stuck tx testing<br>❌ No nonce conflicts | **MEDIUM** - RPC fragile | Add RPC failure scenarios, async queue testing |
| **railway-e2e.ts** | Production API (28/28 pass) | ✅ Proves endpoints respond | ❌ No rate limit validation<br>❌ No input fuzzing<br>❌ No malformed request testing<br>❌ No auth bypass attempts | **HIGH** - Security gap | Add security fuzzing, rate limit validation |
| **pimlico-e2e.ts** | ERC-4337 accounts (6/6 pass) | ✅ Proves paymaster works | ❌ No gas price volatility<br>❌ No paymaster failure<br>❌ No bundle failure testing | **MEDIUM** - Dependency risk | Add paymaster failure scenarios |

**Critical Gap: All tests are synchronous, single-user, happy-path validation. No production-like stress testing.**

---

## C. Endpoint Risk Matrix

| Endpoint | Risk Level | Bottleneck | Missing Protection | Required Fix |
|----------|------------|------------|-------------------|--------------|
| **GET /health** | LOW | None | None | ✅ Safe |
| **POST /auth/nonce/:address** | HIGH | DB write | ❌ No rate limit<br>❌ No cleanup of old nonces | Add rate limit, TTL cleanup |
| **POST /auth/siwe** | CRITICAL | DB write + RPC call | ❌ No rate limit<br>❌ No nonce validation<br>❌ No replay protection | Add comprehensive auth security |
| **GET /users/me** | MEDIUM | DB read | ❌ No caching<br>❌ No rate limit | Add user cache, rate limit |
| **POST /users/me/push-token** | MEDIUM | DB write | ❌ No deduplication<br>❌ No validation | Add token deduplication |
| **GET /pets** | HIGH | DB read + RPC | ❌ No pagination<br>❌ No caching<br>❌ Expensive RPC calls | Add pagination, caching, background sync |
| **GET /matches/discover** | CRITICAL | Complex DB query | ❌ No pagination<br>❌ No rate limit<br>❌ No caching | Add pagination, rate limit, cache |
| **GET /rankings/global** | HIGH | DB read | ❌ No pagination<br>❌ No caching | Add pagination, cache |
| **GET /heroes/me** | MEDIUM | DB read | ❌ No caching | Add hero cache |
| **GET /heroes/leaderboard** | HIGH | DB read | ❌ No pagination<br>❌ No caching | Add pagination, cache |
| **GET /cards** | HIGH | DB read + RPC | ❌ No pagination<br>❌ No caching<br>❌ Expensive queries | Add pagination, caching |
| **GET /cards/:tokenId** | MEDIUM | DB read + RPC | ❌ No caching | Add card cache |
| **GET /tournaments/current** | MEDIUM | DB read | ❌ No caching | Add tournament cache |
| **GET /tournaments/leaderboard** | HIGH | DB read | ❌ No pagination<br>❌ No caching | Add pagination, cache |
| **POST /tournaments/deck** | CRITICAL | DB write | ❌ No validation<br>❌ No rate limit | Add deck validation, rate limit |
| **GET /couples/my** | MEDIUM | DB read | ❌ No caching | Add couples cache |
| **POST /couples/proof** | CRITICAL | DB write | ❌ No rate limit<br>❌ No validation | Add rate limit, proof validation |
| **GET /actions/tx-data/\*** | CRITICAL | RPC call | ❌ No rate limit<br>❌ No input validation | Add rate limit, input validation |

**HOT ENDPOINTS (Mobile Scale Risk):**
1. `/matches/discover` - Will crash under load
2. `/pets` - Expensive RPC calls per request
3. `/auth/siwe` - No rate limiting
4. `/actions/tx-data/*` - No rate limiting

---

## D. Load/Stress Test Plan

### k6 Scripts

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '2m', target: 100 },   // warmup
    { duration: '5m', target: 1000 },  // baseline
    { duration: '10m', target: 5000 }, // scale
    { duration: '5m', target: 10000 }, // stress
    { duration: '2m', target: 20000 }, // spike
    { duration: '10m', target: 1000 }, // recovery
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% under 500ms
    http_req_failed: ['rate<0.01'],    // <1% error rate
    errors: ['rate<0.01'],
  },
};

export default function() {
  // Scenario 1: Anonymous health traffic
  let healthRes = http.get('https://baebackend-production.up.railway.app/health');
  errorRate.add(healthRes.status !== 200);

  // Scenario 2: Auth flow
  let nonceRes = http.post('https://baebackend-production.up.railway.app/auth/nonce/0x1234567890123456789012345678901234567890');
  
  // Scenario 3: Authenticated browsing (simulate JWT)
  let headers = { 'Authorization': 'Bearer test-jwt-token' };
  
  // Scenario 4: Discover feed (most expensive)
  let discoverRes = http.get('https://baebackend-production.up.railway.app/matches/discover', { headers });
  errorRate.add(discoverRes.status >= 400);
  check(discoverRes, {
    'discover status 200': (r) => r.status === 200,
    'discover response time < 1s': (r) => r.timings.duration < 1000,
  });

  sleep(1);
}
```

```javascript
// mobile-simulation.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  scenarios: {
    mobile_users: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 500 },
        { duration: '5m', target: 2000 },
        { duration: '10m', target: 5000 },
      ],
    },
    tx_generation: {
      executor: 'constant-vus',
      vus: 100,
      duration: '10m',
    },
  },
};

export default function() {
  // Mobile user session simulation
  let responses = http.batch([
    ['GET', 'https://baebackend-production.up.railway.app/users/me'],
    ['GET', 'https://baebackend-production.up.railway.app/matches/discover'],
    ['GET', 'https://baebackend-production.up.railway.app/pets'],
    ['GET', 'https://baebackend-production.up.railway.app/heroes/leaderboard'],
  ]);
  
  responses.forEach((res, i) => {
    check(res, {
      [`request ${i} status 200`]: (r) => r.status === 200,
      [`request ${i} response time < 500ms`]: (r) => r.timings.duration < 500,
    });
  });
}
```

### Test Commands

```bash
# Basic load test
k6 run load-test.js

# Mobile simulation
k6 run mobile-simulation.js

# Stress test to breaking point
k6 run --vus 50000 --duration 30s stress-test.js

# Endurance test (6 hours)
k6 run --duration 6h endurance-test.js
```

### Pass/Fail Criteria

- ✅ **PASS**: p95 < 500ms, error rate < 1%, DB CPU < 70%
- ❌ **FAIL**: Any endpoint p95 > 1s, error rate > 5%, DB connections > 80%

---

## E. Database Readiness Report

### Top 10 DB Bottlenecks

1. **`matches/discover` query** - O(n²) complexity, no pagination
2. **`pets` with RPC calls** - Synchronous blockchain calls per row
3. **`hero_scores` recomputation** - Full table scan every update
4. **Missing indexes on foreign keys** - Slow joins
5. **No connection pooling limits** - Potential exhaustion
6. **`messages` thread queries** - No pagination, expensive ordering
7. **JSONB `personality_vector` queries** - No GIN index
8. **`rankings_snapshot` generation** - No caching, expensive aggregation
9. **`tournaments` leaderboard** - No materialized view
10. **Cleanup operations** - No cascading deletes

### Required Indexes

```sql
-- Critical missing indexes
CREATE INDEX CONCURRENTLY idx_matches_discover ON matches (created_at DESC, user_a_id, user_b_id) WHERE status = 'pending';
CREATE INDEX CONCURRENTLY idx_pets_owner_listed ON pets (owner_address, listed) WHERE listed = true;
CREATE INDEX CONCURRENTLY idx_hero_scores_weekly ON hero_scores (week_number, year_number, score DESC);
CREATE INDEX CONCURRENTLY idx_messages_thread ON messages (match_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_users_personality ON users USING GIN (personality_vector);
CREATE INDEX CONCURRENTLY idx_tournaments_active ON tournaments (status, end_time) WHERE status = 'active';
```

### Unsafe Queries Needing Pagination

```sql
-- Current (dangerous):
SELECT * FROM matches WHERE user_a_id = $1 OR user_b_id = $1;

-- Fixed (safe):
SELECT * FROM matches 
WHERE user_a_id = $1 OR user_b_id = $1 
ORDER BY created_at DESC 
LIMIT 50 OFFSET $2;
```

### Connection Pool Sizing

```javascript
// Recommended pool settings
const pool = new Pool({
  host: process.env.DB_HOST,
  max: 20,        // Max connections
  min: 5,         // Min connections  
  idle: 10000,    // Idle timeout
  acquire: 30000, // Acquire timeout
});
```

---

## F. Security Findings

### Critical (P0 - Fix Before Beta)

| Severity | Exploit Path | Affected Endpoint/File | Fix | Regression Test |
|----------|--------------|-----------------------|-----|-----------------|
| **CRITICAL** | Replay attack on SIWE | `/auth/siwe` | Add nonce one-time use, timestamp validation | Test replay with old nonce |
| **CRITICAL** | No rate limiting | All endpoints | Add Redis-based rate limiting | Load test with burst |
| **CRITICAL** | SQL injection in discover | `/matches/discover` | Parameterize queries, input validation | SQL injection test suite |
| **HIGH** | JWT secret not rotated | All auth endpoints | Add key rotation mechanism | Test with expired keys |
| **HIGH** | Wallet address normalization | Auth endpoints | Normalize to checksum addresses | Test mixed case addresses |

### High (P1 - Fix Before Launch)

| Severity | Exploit Path | Affected Endpoint/File | Fix | Regression Test |
|----------|--------------|-----------------------|-----|-----------------|
| **HIGH** | Push token abuse | `/users/me/push-token` | Deduplicate tokens, limit per user | Test duplicate tokens |
| **HIGH** | External wallet manipulation | `/actions/tx-data/*` | Validate parameters, sign data | Test malformed parameters |
| **HIGH** | Admin endpoint exposure | `/admin/*` | Add IP whitelisting, auth | Test unauthorized access |
| **MEDIUM** | CORS misconfiguration | All endpoints | Restrict origins to app domains | Test cross-origin requests |

### Security Tests Required

```javascript
// security-test.js
describe('Security Tests', () => {
  test('SIWE replay protection', async () => {
    // Use same nonce twice
    const nonce = await getNonce(address);
    await siweLogin(nonce, signature);
    const response = await siweLogin(nonce, signature);
    expect(response.status).toBe(401);
  });

  test('Rate limiting', async () => {
    // Send 100 requests in 1 second
    const promises = Array(100).fill().map(() => 
      fetch('/auth/nonce/test-address')
    );
    const responses = await Promise.all(promises);
    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(50);
  });

  test('SQL injection', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    const response = await fetch(`/matches/discover?filter=${maliciousInput}`);
    expect(response.status).toBe(400);
  });
});
```

---

## G. Blockchain/RPC Reliability Report

### On-Chain Failure Matrix

| Action | Failure Mode | Current Handling | Required Fix |
|--------|--------------|------------------|--------------|
| `mintProfile` | RPC timeout | ❌ Blocks request | Add retry with exponential backoff |
| `buy` | Insufficient funds | ❌ Crashes | Add balance check, graceful error |
| `lockPet` | Nonce conflict | ❌ Duplicate tx | Add nonce management |
| `claimBonus` | Gas price spike | ❌ Tx stuck | Add dynamic gas pricing |
| `mintCard` | Contract paused | ❌ Fails silently | Add contract state check |

### Retry/Idempotency Strategy

```typescript
// Required retry wrapper
async function retryTransaction<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      
      if (error.message.includes('timeout') || 
          error.message.includes('nonce')) {
        await delay(baseDelay * Math.pow(2, i));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Async Queue Recommendation

```typescript
// Required transaction queue
interface QueuedTransaction {
  id: string;
  userId: string;
  contract: string;
  method: string;
  params: any;
  priority: 'high' | 'medium' | 'low';
  retries: number;
  maxRetries: number;
  createdAt: Date;
  scheduledAt?: Date;
}

// Background worker to process queue
class TransactionWorker {
  async processQueue() {
    const tx = await this.getNextTransaction();
    if (!tx) return;
    
    try {
      const result = await this.executeTransaction(tx);
      await this.markSuccess(tx.id, result);
    } catch (error) {
      await this.handleFailure(tx, error);
    }
  }
}
```

### Endpoints That Must Not Block RPC

- `GET /pets` - Use cached data, background sync
- `GET /cards` - Use cached data, background sync  
- `POST /auth/siwe` - Move wallet creation to queue
- `GET /actions/tx-data/*` - Add caching, rate limiting

---

## H. Mobile Readiness Report

### Mobile Failure Scenarios

| Scenario | Current Behavior | Required Fix | Client Rule |
|----------|------------------|--------------|-------------|
| Bad network | Request timeout | Add retry with exponential backoff | Retry 3x with 1s, 2s, 4s delays |
| Duplicate taps | Duplicate transactions | Add idempotency keys | Include request ID, deduplicate server-side |
| Offline to online | Lost state | Add request queuing | Queue requests, replay on reconnect |
| Expired JWT | Silent failure | Add refresh mechanism | Refresh 5min before expiry |
| App resume | Stale data | Add cache invalidation | Clear cache on resume, re-fetch |
| Slow response | UI freeze | Add timeout handling | Show loading state, timeout after 10s |

### Backend Idempotency Requirements

```typescript
// Required idempotency middleware
app.use((req, res, next) => {
  const idempotencyKey = req.headers['x-idempotency-key'];
  if (!idempotencyKey) return next();
  
  // Check if already processed
  const existing = await redis.get(`idempotent:${idempotencyKey}`);
  if (existing) {
    return res.json(JSON.parse(existing));
  }
  
  // Store result for 24 hours
  res.on('finish', () => {
    redis.setex(`idempotent:${idempotencyKey}`, 86400, JSON.stringify(res.body));
  });
  
  next();
});
```

### API Response Contract Improvements

```typescript
// Required mobile-friendly response format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    retryAfter?: number;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    version: string;
  };
}
```

---

## I. Anti-Abuse Plan

### Attack Vectors and Detection

| Attack | Detection Signals | Mitigation |
|--------|-------------------|------------|
| Fake users | Same IP, similar patterns | Email verification, phone verification |
| Bot swiping | Superhuman swipe rate | Rate limiting, CAPTCHA |
| Message farming | High message frequency | Message rate limits, spam detection |
| Hero score gaming | Unusual score patterns | Anomaly detection, manual review |
| Tournament manipulation | Deck patterns | Deck validation, statistical analysis |
| Card wash trading | Same wallet pair trading | Trading limits, wash detection |
| Sybil wallets | Same funding source | Graph analysis, funding limits |

### Rate Limits by Endpoint

```typescript
const rateLimits = {
  '/auth/nonce': { requests: 5, window: '1m' },
  '/auth/siwe': { requests: 10, window: '1m' },
  '/matches/discover': { requests: 100, window: '1m' },
  '/users/me/push-token': { requests: 5, window: '1h' },
  '/actions/tx-data/*': { requests: 50, window: '1m' },
  '/tournaments/deck': { requests: 10, window: '1h' },
  'default': { requests: 1000, window: '1h' }
};
```

### Fraud Review Dashboard Requirements

- User behavior analytics
- Transaction pattern analysis  
- IP and device fingerprinting
- Manual review queue
- Automated suspicious activity alerts
- Blocking and suspension tools

---

## J. Observability/SRE Plan

### Required Metrics

```typescript
// Metrics to collect
const metrics = {
  // Request metrics
  httpRequestsTotal: 'counter',
  httpRequestDuration: 'histogram',
  httpRequestErrors: 'counter',
  
  // Database metrics
  dbConnectionsActive: 'gauge',
  dbQueryDuration: 'histogram',
  dbSlowQueries: 'counter',
  
  // Redis metrics
  redisConnectionsActive: 'gauge',
  redisCommandDuration: 'histogram',
  redisMemoryUsage: 'gauge',
  
  // RPC metrics
  rpcRequestsTotal: 'counter',
  rpcRequestDuration: 'histogram',
  rpcErrors: 'counter',
  
  // Business metrics
  authSuccessRate: 'gauge',
  transactionSuccessRate: 'gauge',
  activeUsers: 'gauge',
};
```

### Alert Rules

```yaml
alerts:
  - name: high_latency
    condition: p95_latency > 500ms
    duration: 5m
    severity: warning
    
  - name: high_error_rate
    condition: error_rate > 1%
    duration: 2m
    severity: critical
    
  - name: db_exhaustion
    condition: db_connections > 80%
    duration: 1m
    severity: critical
    
  - name: redis_down
    condition: redis_errors > 5%
    duration: 30s
    severity: critical
    
  - name: rpc_failure
    condition: rpc_error_rate > 5%
    duration: 2m
    severity: warning
```

### Dashboard Design

- System overview (CPU, memory, connections)
- Request metrics (RPS, latency, error rate)
- Database performance (queries, connections, slow queries)
- Redis status (memory, connections, commands)
- RPC health (requests, errors, latency)
- Business metrics (active users, transactions)

### Incident Runbook

1. **High Latency**: Check DB queries, add indexes, scale up
2. **High Error Rate**: Check logs, identify failing endpoint, rollback
3. **DB Exhaustion**: Check connection pool, add connections, scale DB
4. **Redis Down**: Fail gracefully, use cache bypass, restart Redis
5. **RPC Failure**: Switch to backup RPC, queue transactions

---

## K. P0/P1/P2 Remediation Roadmap

### P0 (Before Any Mobile Beta)

1. **Add rate limiting to all endpoints** - 2 days
2. **Add pagination to list endpoints** - 3 days  
3. **Fix SQL injection in discover** - 1 day
4. **Add SIWE replay protection** - 2 days
5. **Add structured logging** - 2 days

### P1 (Before Public Launch)

1. **Implement caching layer** - 5 days
2. **Add database indexes** - 2 days
3. **Create transaction queue** - 7 days
4. **Add mobile resilience tests** - 3 days
5. **Implement observability** - 5 days

### P2 (Before Millions of Users)

1. **Add read replicas** - 3 days
2. **Implement CDN** - 2 days
3. **Add fraud detection** - 10 days
4. **Create admin dashboard** - 5 days
5. **Implement auto-scaling** - 3 days

---

## L. Final Production Gate Checklist

### Pass/Fail Checklist

#### Security (P0)
- [ ] Rate limiting implemented on all endpoints
- [ ] SIWE replay protection active
- [ ] SQL injection vulnerabilities fixed
- [ ] JWT secret rotation mechanism
- [ ] Admin endpoints secured

#### Performance (P0)
- [ ] Pagination implemented on list endpoints
- [ ] Database indexes added
- [ ] Connection pooling configured
- [ ] Caching layer implemented
- [ ] Load tests passing (p95 < 500ms)

#### Reliability (P1)
- [ ] Transaction queue implemented
- [ ] RPC retry logic added
- [ ] Error handling comprehensive
- [ ] Health checks comprehensive
- [ ] Monitoring/alerting active

#### Mobile (P1)
- [ ] Idempotency keys implemented
- [ ] Mobile-friendly error responses
- [ ] Offline queue support
- [ ] Push token deduplication
- [ ] Background sync implemented

### Commands to Run

```bash
# Security tests
npm run test:security
npm run test:injection
npm run test:rate-limit

# Performance tests
k6 run load-test.js
k6 run mobile-simulation.js
npm run test:performance

# Database validation
npm run db:analyze
npm run db:migrate
npm run test:db-performance

# Full integration
npm run test:e2e:full
npm run test:mobile:resilience
npm run test:chaos
```

### Exact Metrics Required

- **Latency**: p95 < 500ms, p99 < 1s
- **Error Rate**: < 1% overall, < 0.1% critical endpoints
- **Throughput**: 1000+ RPS sustained
- **Database**: < 70% CPU, < 80% connections
- **Memory**: < 80% usage, no leaks
- **RPC**: < 5% error rate, < 2s timeout
- **Uptime**: 99.9% availability

### Final Gate Decision

**CURRENT STATUS: NOT READY FOR PRODUCTION**

**Required Before Mobile Beta:**
- Complete all P0 items (2 weeks)
- Pass security audit
- Pass load tests (1000 concurrent users)
- Implement monitoring/alerting

**Required Before Public Launch:**
- Complete all P1 items (4 weeks)
- Pass stress tests (5000 concurrent users)
- Complete mobile resilience testing
- Implement fraud detection

**Required Before Million-User Scale:**
- Complete all P2 items (6 weeks)
- Implement read replicas
- Add CDN and auto-scaling
- Complete performance tuning
