// Spike Test - Instant traffic spike to test system resilience
import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  BASE_URL,
  commonHeaders,
  getAuthHeaders,
  checkResponse,
  checkReadResponse,
  commonThresholds,
  randomEthereumAddress,
} from './k6-config.js';

export let options = {
  stages: [
    { duration: '30s', target: 100 },   // Baseline
    { duration: '10s', target: 5000 },  // SPIKE: Instant jump to 5000 users
    { duration: '30s', target: 5000 },  // Hold spike
    { duration: '20s', target: 1000 },  // Scale down
    { duration: '2m', target: 100 },    // Recovery
    { duration: '1m', target: 0 },      // Cool down
  ],
  thresholds: {
    ...commonThresholds,
    // More lenient thresholds during spike
    http_req_duration: ['p(95)<1000', 'p(99)<3000'], // Allow slower during spike
    http_req_failed: ['rate<0.05'], // Allow 5% error rate during spike
  },
};

export default function () {
  // Core endpoints that will be hit during spike
  
  // 1. Health check (lightweight)
  const healthResponse = http.get(`${BASE_URL}/health`, { 
    headers: commonHeaders,
    tags: { name: 'spike_health' },
  });
  
  check(healthResponse, {
    'health status 200': (r) => r.status === 200,
    'health response time < 200ms': (r) => r.timings.duration < 200,
  });

  // 2. Auth nonce (medium load)
  const testAddress = randomEthereumAddress();
  const nonceResponse = http.get(`${BASE_URL}/auth/nonce/${testAddress}`, { 
    headers: commonHeaders,
    tags: { name: 'spike_nonce' },
  });
  
  check(nonceResponse, {
    'nonce status 200': (r) => r.status === 200,
    'nonce response time < 500ms': (r) => r.timings.duration < 500,
  });

  // 3. Discover feed (heavy load - most critical)
  const discoverResponse = http.get(`${BASE_URL}/matches/discover?limit=20`, { 
    headers: getAuthHeaders(),
    tags: { name: 'spike_discover' },
  });
  
  checkReadResponse(discoverResponse, 'spike_discover', {
    'discover response time < 1s': (r) => r.timings.duration < 1000, // More lenient
  });

  // 4. Heroes leaderboard (medium load)
  const heroesResponse = http.get(`${BASE_URL}/heroes/leaderboard?limit=50`, { 
    headers: getAuthHeaders(),
    tags: { name: 'spike_heroes' },
  });
  
  checkReadResponse(heroesResponse, 'spike_heroes', {
    'heroes response time < 800ms': (r) => r.timings.duration < 800,
  });

  // 5. Cards marketplace (medium load)
  const cardsResponse = http.get(`${BASE_URL}/cards?limit=20`, { 
    headers: getAuthHeaders(),
    tags: { name: 'spike_cards' },
  });
  
  checkReadResponse(cardsResponse, 'spike_cards', {
    'cards response time < 800ms': (r) => r.timings.duration < 800,
  });

  // 6. TX data generation (RPC intensive - test during spike)
  if (Math.random() > 0.5) { // 50% during spike
    const txResponse = http.get(`${BASE_URL}/actions/tx-data/buy/1`, { 
      headers: getAuthHeaders(),
      tags: { name: 'spike_tx_data' },
    });
    
    check(txResponse, {
      'tx-data status 200 or 401': (r) => r.status === 200 || r.status === 401,
      'tx-data response time < 3s': (r) => r.timings.duration < 3000, // Very lenient for RPC
    });
  }

  // 7. User profile (if authenticated)
  if (__ENV.JWT_TOKEN && Math.random() > 0.3) { // 70% check profile
    const profileResponse = http.get(`${BASE_URL}/users/me`, { 
      headers: getAuthHeaders(),
      tags: { name: 'spike_profile' },
    });
    
    checkReadResponse(profileResponse, 'spike_profile', {
      'profile response time < 600ms': (r) => r.timings.duration < 600,
    });
  }

  // Minimal sleep during spike to maximize load
  sleep(Math.random() * 0.5 + 0.1); // 0.1-0.6s
}

export function handleSummary(data) {
  return {
    'spike-test-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
