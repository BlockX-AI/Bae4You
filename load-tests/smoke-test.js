// Smoke Test - Basic functionality validation
import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import {
  BASE_URL,
  commonHeaders,
  getAuthHeaders,
  checkResponse,
  checkAuthResponse,
  checkReadResponse,
  commonThresholds,
  randomEthereumAddress,
} from './k6-config.js';

export let options = {
  vus: 1,
  iterations: 1,
  thresholds: commonThresholds,
};

export default function () {
  console.log('🚀 Starting Smoke Test for Bae4U/Fantasy Bae');
  
  // Test 1: Health Check
  console.log('1. Testing health endpoint...');
  const healthResponse = http.get(`${BASE_URL}/health`, { headers: commonHeaders });
  checkResponse(healthResponse, 'health_check', {
    'status is 200': (r) => r.status === 200,
    'has uptime': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.uptime !== undefined;
      } catch {
        return false;
      }
    },
  });

  // Test 2: Auth Nonce Generation
  console.log('2. Testing nonce generation...');
  const testAddress = randomEthereumAddress();
  const nonceResponse = http.get(`${BASE_URL}/auth/nonce/${testAddress}`, { headers: commonHeaders });
  checkResponse(nonceResponse, 'nonce_generation', {
    'status is 200': (r) => r.status === 200,
    'has nonce': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.nonce && body.nonce.length > 0;
      } catch {
        return false;
      }
    },
  });

  // Test 3: User Profile (if JWT available)
  if (__ENV.JWT_TOKEN) {
    console.log('3. Testing user profile...');
    const profileResponse = http.get(`${BASE_URL}/users/me`, { headers: getAuthHeaders() });
    checkReadResponse(profileResponse, 'user_profile');
  } else {
    console.log('3. Skipping user profile (no JWT_TOKEN)');
  }

  // Test 4: Discover Feed
  console.log('4. Testing discover feed...');
  const discoverResponse = http.get(`${BASE_URL}/matches/discover`, { headers: getAuthHeaders() });
  checkReadResponse(discoverResponse, 'discover_feed');

  // Test 5: Heroes Leaderboard
  console.log('5. Testing heroes leaderboard...');
  const heroesResponse = http.get(`${BASE_URL}/heroes/leaderboard`, { headers: getAuthHeaders() });
  checkReadResponse(heroesResponse, 'heroes_leaderboard');

  // Test 6: Cards Marketplace
  console.log('6. Testing cards marketplace...');
  const cardsResponse = http.get(`${BASE_URL}/cards`, { headers: getAuthHeaders() });
  checkReadResponse(cardsResponse, 'cards_marketplace');

  // Test 7: Tournaments
  console.log('7. Testing tournaments...');
  const tournamentsResponse = http.get(`${BASE_URL}/tournaments/current`, { headers: getAuthHeaders() });
  checkReadResponse(tournamentsResponse, 'tournaments_current');

  // Test 8: Couples (if authenticated)
  if (__ENV.JWT_TOKEN) {
    console.log('8. Testing couples...');
    const couplesResponse = http.get(`${BASE_URL}/couples/my`, { headers: getAuthHeaders() });
    checkReadResponse(couplesResponse, 'couples_my');
  } else {
    console.log('8. Skipping couples (no JWT_TOKEN)');
  }

  // Test 9: Wallet Balance
  if (__ENV.JWT_TOKEN) {
    console.log('9. Testing wallet balance...');
    const walletResponse = http.get(`${BASE_URL}/wallet/balance`, { headers: getAuthHeaders() });
    checkReadResponse(walletResponse, 'wallet_balance');
  } else {
    console.log('9. Skipping wallet balance (no JWT_TOKEN)');
  }

  // Test 10: TX Data Generation (read-only test)
  console.log('10. Testing tx-data generation...');
  const txDataResponse = http.get(`${BASE_URL}/actions/tx-data/buy/1`, { headers: getAuthHeaders() });
  check(txDataResponse, {
    'tx-data status': (r) => r.status === 200 || r.status === 401 || r.status === 404, // Accept auth errors
    'response time < 1s': (r) => r.timings.duration < 1000,
  });

  console.log('✅ Smoke Test Completed');
  sleep(1);
}

export function handleSummary(data) {
  return {
    'smoke-test-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
