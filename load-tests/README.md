# Bae4U/Fantasy Bae - Production Load Tests

Production-grade k6 load tests for the Bae4U dating platform and Fantasy Bae gamification layer.

## 🎯 Test Overview

This suite validates system performance under various load conditions from casual usage to extreme spikes. All tests are designed to simulate real user behavior and measure critical performance metrics.

## 📁 Test Structure

```
load-tests/
├── k6-config.js              # Shared configuration and utilities
├── smoke-test.js              # Basic functionality validation
├── mobile-session.js          # Average user behavior simulation
├── login-burst.js             # Authentication stress test
├── leaderboard-hot-read.js    # Leaderboard performance test
├── discover-swipe-flow.js     # Core dating app flow
├── cards-market-flow.js       # NFT marketplace browsing
├── tournament-flow.js         # Tournament participation flow
├── tx-data-generation.js      # Blockchain transaction data requests
├── spike-test.js              # Instant traffic spike test
├── endurance-test.js          # 6-hour stability test
├── package.json               # NPM scripts and dependencies
└── README.md                  # This file
```

## 🚀 Quick Start

### Prerequisites
- Install k6: `brew install k6` (macOS) or visit https://k6.io/docs/getting-started/installation/
- Node.js 16+ (for package scripts)

### Environment Variables
```bash
export BASE_URL="https://baebackend-production.up.railway.app"
export TEST_WALLET_PRIVATE_KEY="your_test_wallet_private_key"
export JWT_TOKEN="your_test_jwt_token"  # Optional, for authenticated tests
```

### Basic Usage
```bash
# Install dependencies
npm install

# Run smoke test (quick validation)
npm run test:smoke

# Run mobile session simulation
npm run test:mobile

# Run all critical tests
npm run test:critical
```

## 📊 Test Descriptions

### 1. Smoke Test (`smoke-test.js`)
**Purpose**: Basic functionality validation
**Load**: 1 VU, 1 iteration
**Duration**: ~30 seconds
**Use**: Quick health check before deployments

```bash
npm run test:smoke
```

### 2. Average Mobile Session (`mobile-session.js`)
**Purpose**: Simulates typical user behavior
**Load**: Up to 1000 concurrent users
**Duration**: 20 minutes (ramp up/down)
**Use**: Validate normal usage patterns

```bash
npm run test:mobile
```

### 3. Login Burst (`login-burst.js`)
**Purpose**: Tests authentication system under sudden load
**Load**: 500 concurrent users (burst)
**Duration**: 4 minutes
**Use**: Validate auth system resilience

```bash
npm run test:login-burst
```

### 4. Leaderboard Hot-Read (`leaderboard-hot-read.js`)
**Purpose**: Intensive leaderboard access patterns
**Load**: Up to 2000 concurrent users
**Duration**: 12 minutes
**Use**: Test caching and read performance

```bash
npm run test:leaderboard
```

### 5. Discover/Swipe Flow (`discover-swipe-flow.js`)
**Purpose**: Core dating app behavior
**Load**: Up to 1500 concurrent users
**Duration**: 20 minutes
**Use**: Most critical user flow validation

```bash
npm run test:discover
```

### 6. Cards Market Flow (`cards-market-flow.js`)
**Purpose**: NFT marketplace browsing behavior
**Load**: Up to 500 concurrent users
**Duration**: 13 minutes
**Use**: Test marketplace performance

```bash
npm run test:cards
```

### 7. Tournament Flow (`tournament-flow.js`)
**Purpose**: Tournament participation and viewing
**Load**: Up to 600 concurrent users
**Duration**: 12 minutes
**Use**: Validate gaming feature performance

```bash
npm run test:tournament
```

### 8. TX Data Generation (`tx-data-generation.js`)
**Purpose**: Blockchain transaction data requests
**Load**: Up to 300 concurrent users
**Duration**: 12 minutes
**Use**: Test RPC endpoint performance

```bash
npm run test:tx-data
```

### 9. Spike Test (`spike-test.js`)
**Purpose**: Instant traffic spike resilience
**Load**: 5000 concurrent users (instant spike)
**Duration**: 4 minutes
**Use**: Test system breaking point

```bash
npm run test:spike
```

### 10. Endurance Test (`endurance-test.js`)
**Purpose**: Long-running stability test
**Load**: Variable (100-800 users)
**Duration**: 6 hours
**Use**: Memory leaks, stability over time

```bash
npm run test:endurance
```

## 🎯 NPM Scripts

### Individual Tests
```bash
npm run test:smoke          # Smoke test
npm run test:mobile         # Mobile session
npm run test:login-burst    # Login burst
npm run test:leaderboard    # Leaderboard hot-read
npm run test:discover       # Discover/swipe flow
npm run test:cards          # Cards market flow
npm run test:tournament     # Tournament flow
npm run test:tx-data        # TX data generation
npm run test:spike          # Spike test
npm run test:endurance      # Endurance test
```

### Combined Tests
```bash
npm run test:all            # All major tests
npm run test:critical       # Critical path tests
npm run test:stress         # Stress tests only
npm run test:production     # Production-ready tests
npm run test:full           # Complete test suite
```

### Quick Tests
```bash
npm run test:quick          # Quick smoke test (10 VUs, 30s)
npm run test:dev            # Dev environment test (50 VUs, 5m)
```

### Environment-Specific
```bash
npm run test:staging        # Run against staging
npm run test:prod           # Run against production
```

### Reports
```bash
npm run report:smoke        # Generate smoke test report
npm run report:mobile       # Generate mobile test report
npm run report:all          # Generate all reports
```

### Cloud Tests (k6 Cloud)
```bash
npm run cloud:smoke         # Run smoke test in k6 Cloud
npm run cloud:mobile        # Run mobile test in k6 Cloud
npm run cloud:spike         # Run spike test in k6 Cloud
```

## 📈 Performance Thresholds

### Common Thresholds
- **Error Rate**: < 1% (0.5% for reads)
- **p95 Latency**: < 500ms (reads), < 1000ms (auth/writes)
- **p99 Latency**: < 2000ms
- **5xx Errors**: < 0.5%

### Test-Specific Thresholds
- **Smoke Test**: p95 < 300ms, 0% errors
- **Mobile Session**: p95 < 500ms, < 1% errors
- **Login Burst**: p95 < 1000ms, < 1% auth errors
- **Leaderboard**: p95 < 300ms, < 0.5% errors
- **Discover Flow**: p95 < 500ms, < 1% errors
- **Spike Test**: p95 < 1000ms, < 5% errors (lenient)
- **Endurance**: p95 < 500ms, < 1% errors (stable over 6h)

## 🔍 Interpreting Results

### Success Indicators
✅ **All thresholds passed** - System is performing well
✅ **p95 < 500ms** - Good user experience
✅ **Error rate < 1%** - System reliability
✅ **No memory leaks** - Stable over time

### Warning Signs
⚠️ **p95 > 500ms** - Users experiencing slowness
⚠️ **Error rate 1-5%** - Some users affected
⚠️ **High variance** - Inconsistent performance
⚠️ **Gradual slowdown** - Possible resource exhaustion

### Critical Issues
❌ **p95 > 1000ms** - Poor user experience
❌ **Error rate > 5%** - System instability
❌ **5xx errors > 1%** - Backend issues
❌ **Memory leaks** - System will crash over time

### Key Metrics to Monitor

#### Response Times
- `http_req_duration` - Overall request time
- `http_req_waiting` - Server processing time
- `http_req_connecting` - Connection setup time

#### Error Rates
- `http_req_failed` - Overall error rate
- `auth_errors` - Authentication failures
- `api_errors` - API endpoint errors
- `rpc_errors` - Blockchain RPC errors

#### Throughput
- `http_reqs/s` - Requests per second
- `vus_active` - Active virtual users
- `iteration_duration` - Full iteration time

#### System Resources
- Memory usage trends
- CPU utilization (if available)
- Database connection pool status
- Redis performance metrics

## 🛠️ Customization

### Adding New Tests
1. Copy existing test template
2. Modify load stages and scenarios
3. Update package.json scripts
4. Add to README documentation

### Modifying Load Patterns
```javascript
export let options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 500 },   // Sustain
    { duration: '2m', target: 0 },     // Ramp down
  ],
};
```

### Custom Thresholds
```javascript
export const customThresholds = {
  http_req_duration: ['p(95)<300'],  // Custom p95
  http_req_failed: ['rate<0.005'],   // Custom error rate
};
```

## 🚨 CI/CD Integration

### GitHub Actions Example
```yaml
name: Load Tests
on: [push, pull_request]
jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      - name: Run smoke test
        run: k6 run smoke-test.js
        env:
          BASE_URL: ${{ secrets.BASE_URL }}
          JWT_TOKEN: ${{ secrets.JWT_TOKEN }}
```

## 📊 Reporting

### JSON Reports
```bash
k6 run smoke-test.js --out json=results.json
```

### HTML Reports
```bash
k6 run smoke-test.js --out html=report.html
```

### Cloud Reports
```bash
k6 login cloud --token YOUR_K6_CLOUD_TOKEN
k6 cloud run smoke-test.js
```

## 🆘 Troubleshooting

### Common Issues

#### "connection refused"
- Check BASE_URL is correct
- Verify server is running
- Check network connectivity

#### "401 Unauthorized"
- Verify JWT_TOKEN is valid
- Check token expiration
- Ensure auth endpoints are accessible

#### High Memory Usage
- Check for memory leaks in endurance test
- Monitor VU count vs available memory
- Reduce concurrent users if needed

#### Slow Response Times
- Check database query performance
- Verify Redis caching is working
- Monitor RPC provider latency

#### RPC Failures
- Check blockchain RPC provider status
- Verify rate limits on RPC calls
- Consider adding RPC failover

### Debug Mode
```bash
# Enable verbose logging
DEBUG=* k6 run smoke-test.js

# Run with single VU for debugging
k6 run smoke-test.js --vus 1 --duration 60s
```

## 📞 Support

- **Performance Issues**: Contact SRE team
- **Test Failures**: Check logs and environment variables
- **k6 Issues**: https://k6.io/docs/
- **Bae4U Backend**: Check Railway dashboard

## 📝 Best Practices

1. **Always run smoke test first** - Validate basic functionality
2. **Monitor system resources** - Don't overload your machine
3. **Use environment-specific URLs** - Don't test against production accidentally
4. **Review results before deployment** - Check thresholds and error rates
5. **Run tests regularly** - Catch performance regressions early
6. **Document findings** - Track performance trends over time
7. **Coordinate with team** - Avoid running large tests during peak hours

---

**Remember**: These tests generate real load on your system. Always coordinate with your team and run them during appropriate maintenance windows.
