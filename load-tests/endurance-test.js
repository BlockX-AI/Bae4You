// Endurance Test - Long-running stability test (6 hours)
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
    { duration: '10m', target: 100 },   // Warm up
    { duration: '2h', target: 500 },    // Sustained load
    { duration: '30m', target: 800 },   // Mid-test spike
    { duration: '2h', target: 500 },    // Back to sustained
    { duration: '30m', target: 200 },   // Scale down
    { duration: '1h', target: 100 },    // Low load
    { duration: '30m', target: 0 },     // Cool down
  ],
  thresholds: commonThresholds,
};

export default function () {
  // Simulate realistic user session with varied behavior
  
  // 1. Start with user profile
  const profileResponse = http.get(`${BASE_URL}/users/me`, { 
    headers: getAuthHeaders(),
    tags: { name: 'endurance_profile' },
  });
  
  checkReadResponse(profileResponse, 'endurance_profile');
  sleep(Math.random() * 3 + 2);

  // 2. Browse discover feed (primary activity)
  const discoverResponse = http.get(`${BASE_URL}/matches/discover?limit=30`, { 
    headers: getAuthHeaders(),
    tags: { name: 'endurance_discover' },
  });
  
  checkReadResponse(discoverResponse, 'endurance_discover');
  sleep(Math.random() * 4 + 2);

  // 3. View some profiles (secondary activity)
  const profilesToView = Math.floor(Math.random() * 3) + 1;
  for (let i = 0; i < profilesToView; i++) {
    const profileId = Math.floor(Math.random() * 5000) + 1;
    const profileDetailResponse = http.get(`${BASE_URL}/users/${profileId}`, { 
      headers: getAuthHeaders(),
      tags: { name: 'endurance_profile_detail' },
    });
    
    check(profileDetailResponse, {
      'profile detail status 200 or 404': (r) => r.status === 200 || r.status === 404,
      'profile detail response time < 1s': (r) => r.timings.duration < 1000,
    });
    sleep(Math.random() * 2 + 1);
  }

  // 4. Check heroes leaderboard (periodic activity)
  if (Math.random() > 0.4) { // 60% chance
    const heroesResponse = http.get(`${BASE_URL}/heroes/leaderboard?limit=100`, { 
      headers: getAuthHeaders(),
      tags: { name: 'endurance_heroes' },
    });
    
    checkReadResponse(heroesResponse, 'endurance_heroes');
    sleep(Math.random() * 3 + 2);
  }

  // 5. Browse cards (occasional activity)
  if (Math.random() > 0.6) { // 40% chance
    const cardsResponse = http.get(`${BASE_URL}/cards?limit=25`, { 
      headers: getAuthHeaders(),
      tags: { name: 'endurance_cards' },
    });
    
    checkReadResponse(cardsResponse, 'endurance_cards');
    sleep(Math.random() * 2 + 1);
  }

  // 6. Check tournaments (occasional activity)
  if (Math.random() > 0.7) { // 30% chance
    const tournamentsResponse = http.get(`${BASE_URL}/tournaments/current`, { 
      headers: getAuthHeaders(),
      tags: { name: 'endurance_tournaments' },
    });
    
    checkReadResponse(tournamentsResponse, 'endurance_tournaments');
    sleep(Math.random() * 2 + 1);
  }

  // 7. Check matches (periodic activity)
  if (Math.random() > 0.5) { // 50% chance
    const matchesResponse = http.get(`${BASE_URL}/matches`, { 
      headers: getAuthHeaders(),
      tags: { name: 'endurance_matches' },
    });
    
    checkReadResponse(matchesResponse, 'endurance_matches');
    sleep(Math.random() * 2 + 1);
  }

  // 8. TX data generation (light RPC activity)
  if (Math.random() > 0.8) { // 20% chance
    const tokenId = Math.floor(Math.random() * 100) + 1;
    const txResponse = http.get(`${BASE_URL}/actions/tx-data/buy/${tokenId}`, { 
      headers: getAuthHeaders(),
      tags: { name: 'endurance_tx_data' },
    });
    
    check(txResponse, {
      'tx-data status 200 or 401': (r) => r.status === 200 || r.status === 401,
      'tx-data response time < 2s': (r) => r.timings.duration < 2000,
    });
    sleep(Math.random() * 1 + 0.5);
  }

  // 9. Health check (system monitoring)
  const healthResponse = http.get(`${BASE_URL}/health`, { 
    headers: commonHeaders,
    tags: { name: 'endurance_health' },
  });
  
  check(healthResponse, {
    'health status 200': (r) => r.status === 200,
    'health response time < 300ms': (r) => r.timings.duration < 300,
  });

  // 10. Variable session end delay
  sleep(Math.random() * 10 + 5); // 5-15s between sessions
}

export function handleSummary(data) {
  return {
    'endurance-test-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
