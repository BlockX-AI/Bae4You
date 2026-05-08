// Leaderboard Hot-Read Test - Intensive leaderboard access
import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  BASE_URL,
  commonHeaders,
  getAuthHeaders,
  checkReadResponse,
  readThresholds,
} from './k6-config.js';

export let options = {
  stages: [
    { duration: '1m', target: 200 },   // Ramp up
    { duration: '5m', target: 1000 },  // High load on leaderboards
    { duration: '3m', target: 2000 },  // Peak load
    { duration: '5m', target: 1000 },  // Sustained load
    { duration: '2m', target: 200 },   // Scale down
    { duration: '1m', target: 0 },     // Cool down
  ],
  thresholds: readThresholds,
};

export default function () {
  // Test 1: Heroes Leaderboard (most accessed)
  const heroesResponse = http.get(`${BASE_URL}/heroes/leaderboard?limit=100`, { 
    headers: getAuthHeaders(),
    tags: { name: 'heroes_leaderboard' },
  });
  
  checkReadResponse(heroesResponse, 'heroes_leaderboard_read', {
    'has pagination data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.pagination !== undefined;
      } catch {
        return false;
      }
    },
    'response size reasonable': (r) => r.body.length < 50000, // < 50KB
  });

  sleep(Math.random() * 1 + 0.5); // 0.5-1.5s between requests

  // Test 2: Heroes Leaderboard with pagination
  const page = Math.floor(Math.random() * 5); // Random page 0-4
  const heroesPaginatedResponse = http.get(`${BASE_URL}/heroes/leaderboard?limit=20&offset=${page * 20}`, { 
    headers: getAuthHeaders(),
    tags: { name: 'heroes_leaderboard_paginated' },
  });
  
  checkReadResponse(heroesPaginatedResponse, 'heroes_leaderboard_paginated_read');

  sleep(Math.random() * 1 + 0.5);

  // Test 3: Tournaments Leaderboard
  const tournamentsResponse = http.get(`${BASE_URL}/tournaments/leaderboard?limit=50`, { 
    headers: getAuthHeaders(),
    tags: { name: 'tournaments_leaderboard' },
  });
  
  checkReadResponse(tournamentsResponse, 'tournaments_leaderboard_read');

  sleep(Math.random() * 1 + 0.5);

  // Test 4: Global Rankings (if available)
  const rankingsResponse = http.get(`${BASE_URL}/rankings/global?limit=100`, { 
    headers: getAuthHeaders(),
    tags: { name: 'global_rankings' },
  });
  
  check(rankingsResponse, {
    'rankings status 200 or 404': (r) => r.status === 200 || r.status === 404,
    'rankings response time < 300ms': (r) => r.timings.duration < 300,
    'no server errors': (r) => r.status < 500,
  });

  sleep(Math.random() * 1 + 0.5);

  // Test 5: User's personal hero score
  if (__ENV.JWT_TOKEN) {
    const myScoreResponse = http.get(`${BASE_URL}/heroes/me`, { 
      headers: getAuthHeaders(),
      tags: { name: 'my_hero_score' },
    });
    
    check(myScoreResponse, {
      'my score status 200 or 404': (r) => r.status === 200 || r.status === 404,
      'my score response time < 200ms': (r) => r.timings.duration < 200,
      'no server errors': (r) => r.status < 500,
    });
  }

  // Test 6: Tournament history (additional read load)
  const tournamentHistoryResponse = http.get(`${BASE_URL}/tournaments/history?limit=20`, { 
    headers: getAuthHeaders(),
    tags: { name: 'tournament_history' },
  });
  
  check(tournamentHistoryResponse, {
    'tournament history status 200 or 404': (r) => r.status === 200 || r.status === 404,
    'tournament history response time < 300ms': (r) => r.timings.duration < 300,
    'no server errors': (r) => r.status < 500,
  });

  // Brief pause before next iteration
  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  return {
    'leaderboard-hot-read-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
