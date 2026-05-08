// Login Burst Test - Simulates sudden login spikes
import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  BASE_URL,
  commonHeaders,
  checkResponse,
  authThresholds,
  randomEthereumAddress,
  randomEmail,
} from './k6-config.js';

export let options = {
  stages: [
    { duration: '30s', target: 0 },    // Warmup
    { duration: '10s', target: 500 },  // Rapid ramp up - login burst
    { duration: '2m', target: 500 },   // Sustain burst
    { duration: '30s', target: 100 },  // Scale down
    { duration: '2m', target: 100 },   // Normal load
    { duration: '30s', target: 0 },    // Cool down
  ],
  thresholds: authThresholds,
};

export default function () {
  // Test 1: Generate nonce (first step of login flow)
  const testAddress = randomEthereumAddress();
  const nonceResponse = http.get(`${BASE_URL}/auth/nonce/${testAddress}`, { 
    headers: commonHeaders,
    tags: { name: 'auth_nonce' },
  });
  
  check(nonceResponse, {
    'nonce status 200': (r) => r.status === 200,
    'nonce response time < 500ms': (r) => r.timings.duration < 500,
    'has nonce value': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.nonce && body.nonce.length > 0;
      } catch {
        return false;
      }
    },
  });

  // Small delay to simulate user thinking time
  sleep(Math.random() * 2 + 1);

  // Test 2: Attempt SIWE login (will fail without signature but tests endpoint)
  const loginPayload = JSON.stringify({
    nonce: 'test-nonce-' + Math.random().toString(36).substr(2, 9),
    signature: '0x' + '0'.repeat(130), // Invalid signature for testing
    domain: 'bae4u.com',
    uri: BASE_URL,
    version: '1',
    chainId: '84532',
    address: testAddress,
  });

  const loginResponse = http.post(`${BASE_URL}/auth/siwe`, loginPayload, {
    headers: commonHeaders,
    tags: { name: 'auth_siwe' },
  });

  check(loginResponse, {
    'siwe handles request': (r) => r.status === 200 || r.status === 401, // Accept auth failures
    'siwe response time < 1s': (r) => r.timings.duration < 1000,
    'no server errors': (r) => r.status < 500,
  });

  // Test 3: Register push token (post-login action)
  if (Math.random() > 0.5) { // 50% of users register push token
    const pushTokenPayload = JSON.stringify({
      token: 'ExponentPushToken[' + Math.random().toString(36).substr(2, 20) + ']',
      platform: 'ios',
    });

    const pushResponse = http.post(`${BASE_URL}/users/me/push-token`, pushTokenPayload, {
      headers: commonHeaders,
      tags: { name: 'push_token_register' },
    });

    check(pushResponse, {
      'push token handles request': (r) => r.status === 200 || r.status === 401 || r.status === 204,
      'push token response time < 500ms': (r) => r.timings.duration < 500,
      'no server errors': (r) => r.status < 500,
    });
  }

  // Simulate user pause between actions
  sleep(Math.random() * 3 + 2);
}

export function handleSummary(data) {
  return {
    'login-burst-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
