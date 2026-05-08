// Average Mobile Session Simulation
// Simulates typical user behavior: open app, browse, swipe, check profiles
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
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 500 },   // Ramp up to 500 users
    { duration: '10m', target: 1000 }, // Stay at 1000 users
    { duration: '5m', target: 500 },   // Scale down to 500
    { duration: '2m', target: 0 },     // Scale down to 0
  ],
  thresholds: commonThresholds,
};

export default function () {
  // Session Start: Get user profile
  const profileResponse = http.get(`${BASE_URL}/users/me`, { headers: getAuthHeaders() });
  checkReadResponse(profileResponse, 'mobile_profile_load');
  sleep(Math.random() * 2 + 1); // 1-3s thinking time

  // Browse discover feed (most common action)
  for (let i = 0; i < 3; i++) {
    const discoverResponse = http.get(`${BASE_URL}/matches/discover?limit=20`, { headers: getAuthHeaders() });
    checkReadResponse(discoverResponse, 'mobile_discover_browse');
    sleep(Math.random() * 3 + 2); // 2-5s browsing time
    
    // Simulate swipe action (check profile details)
    if (Math.random() > 0.3) { // 70% chance to view profile
      const profileId = Math.floor(Math.random() * 1000) + 1;
      const profileDetailResponse = http.get(`${BASE_URL}/users/${profileId}`, { headers: getAuthHeaders() });
      checkResponse(profileDetailResponse, 'mobile_profile_detail', {
        'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      });
      sleep(Math.random() * 2 + 1); // 1-3s viewing time
    }
  }

  // Check heroes leaderboard (gaming feature)
  if (Math.random() > 0.5) { // 50% chance to check heroes
    const heroesResponse = http.get(`${BASE_URL}/heroes/leaderboard?limit=50`, { headers: getAuthHeaders() });
    checkReadResponse(heroesResponse, 'mobile_heroes_leaderboard');
    sleep(Math.random() * 3 + 2); // 2-5s browsing time
  }

  // Browse cards marketplace
  if (Math.random() > 0.6) { // 40% chance to browse cards
    const cardsResponse = http.get(`${BASE_URL}/cards?limit=20`, { headers: getAuthHeaders() });
    checkReadResponse(cardsResponse, 'mobile_cards_browse');
    sleep(Math.random() * 2 + 1); // 1-3s browsing time
    
    // Check specific card details
    if (Math.random() > 0.5) { // 50% chance to view card
      const cardId = Math.floor(Math.random() * 100) + 1;
      const cardDetailResponse = http.get(`${BASE_URL}/cards/${cardId}`, { headers: getAuthHeaders() });
      checkResponse(cardDetailResponse, 'mobile_card_detail', {
        'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      });
      sleep(Math.random() * 2 + 1); // 1-3s viewing time
    }
  }

  // Check tournaments
  if (Math.random() > 0.7) { // 30% chance to check tournaments
    const tournamentsResponse = http.get(`${BASE_URL}/tournaments/current`, { headers: getAuthHeaders() });
    checkReadResponse(tournamentsResponse, 'mobile_tournaments_check');
    sleep(Math.random() * 2 + 1); // 1-3s browsing time
  }

  // Check wallet balance (power users)
  if (Math.random() > 0.8) { // 20% chance to check wallet
    const walletResponse = http.get(`${BASE_URL}/wallet/balance`, { headers: getAuthHeaders() });
    checkReadResponse(walletResponse, 'mobile_wallet_check');
    sleep(Math.random() * 1 + 1); // 1-2s viewing time
  }

  // Check couples (engaged users)
  if (Math.random() > 0.9) { // 10% chance to check couples
    const couplesResponse = http.get(`${BASE_URL}/couples/my`, { headers: getAuthHeaders() });
    checkReadResponse(couplesResponse, 'mobile_couples_check');
    sleep(Math.random() * 1 + 1); // 1-2s viewing time
  }

  // Session end: Small delay before next iteration
  sleep(Math.random() * 5 + 3); // 3-8s session end delay
}

export function handleSummary(data) {
  return {
    'mobile-session-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
