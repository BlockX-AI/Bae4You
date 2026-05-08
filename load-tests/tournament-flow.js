// Tournament Flow Test - Simulates tournament participation and viewing
import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  BASE_URL,
  commonHeaders,
  getAuthHeaders,
  checkResponse,
  checkReadResponse,
  commonThresholds,
} from './k6-config.js';

export let options = {
  stages: [
    { duration: '1m', target: 100 },   // Ramp up
    { duration: '4m', target: 400 },   // Main load
    { duration: '2m', target: 600 },   // Peak load
    { duration: '3m', target: 400 },   // Sustained
    { duration: '1m', target: 100 },   // Scale down
    { duration: '1m', target: 0 },     // Cool down
  ],
  thresholds: commonThresholds,
};

export default function () {
  // Phase 1: Check current tournaments
  const tournamentsResponse = http.get(`${BASE_URL}/tournaments/current`, { 
    headers: getAuthHeaders(),
    tags: { name: 'tournaments_current' },
  });
  
  checkReadResponse(tournamentsResponse, 'tournaments_current', {
    'has tournament data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.data) || Array.isArray(body);
      } catch {
        return false;
      }
    },
  });

  sleep(Math.random() * 2 + 1);

  // Phase 2: View tournament leaderboard
  const leaderboardResponse = http.get(`${BASE_URL}/tournaments/leaderboard?limit=100`, { 
    headers: getAuthHeaders(),
    tags: { name: 'tournaments_leaderboard' },
  });
  
  checkReadResponse(leaderboardResponse, 'tournaments_leaderboard', {
    'has leaderboard data': (r) => {
      try {
        const body = JSON.parse(r.body);
        const leaderboard = Array.isArray(body.data) ? body.data : body;
        return leaderboard.length >= 0;
      } catch {
        return false;
      }
    },
  });

  sleep(Math.random() * 1.5 + 0.5);

  // Phase 3: Check tournament history
  const historyResponse = http.get(`${BASE_URL}/tournaments/history?limit=20`, { 
    headers: getAuthHeaders(),
    tags: { name: 'tournaments_history' },
  });
  
  check(historyResponse, {
    'history status 200 or 404': (r) => r.status === 200 || r.status === 404,
    'history response time < 400ms': (r) => r.timings.duration < 400,
    'no server errors': (r) => r.status < 500,
  });

  sleep(Math.random() * 1 + 0.5);

  // Phase 4: View user's tournament deck (if authenticated)
  if (__ENV.JWT_TOKEN && Math.random() > 0.3) { // 70% check deck
    const deckResponse = http.get(`${BASE_URL}/tournaments/deck`, { 
      headers: getAuthHeaders(),
      tags: { name: 'tournaments_deck' },
    });
    
    check(deckResponse, {
      'deck status 200 or 404': (r) => r.status === 200 || r.status === 404,
      'deck response time < 500ms': (r) => r.timings.duration < 500,
      'no server errors': (r) => r.status < 500,
    });

    sleep(Math.random() * 1 + 0.5);

    // Phase 5: Submit tournament deck (write operation)
    if (Math.random() > 0.8) { // 20% submit deck
      const deckPayload = JSON.stringify({
        cardIds: Array.from({ length: 5 }, (_, i) => Math.floor(Math.random() * 100) + 1),
        tournamentId: Math.floor(Math.random() * 10) + 1,
      });

      const submitResponse = http.post(`${BASE_URL}/tournaments/deck`, deckPayload, {
        headers: getAuthHeaders(),
        tags: { name: 'tournaments_deck_submit' },
      });
      
      check(submitResponse, {
        'deck submit status 200 or 401': (r) => r.status === 200 || r.status === 401,
        'deck submit response time < 1s': (r) => r.timings.duration < 1000,
        'no server errors': (r) => r.status < 500,
      });
    }
  }

  // Phase 6: Check specific tournament details
  if (Math.random() > 0.4) { // 60% check specific tournament
    const tournamentId = Math.floor(Math.random() * 20) + 1;
    const tournamentDetailResponse = http.get(`${BASE_URL}/tournaments/${tournamentId}`, { 
      headers: getAuthHeaders(),
      tags: { name: 'tournament_detail' },
    });
    
    check(tournamentDetailResponse, {
      'tournament detail status 200 or 404': (r) => r.status === 200 || r.status === 404,
      'tournament detail response time < 300ms': (r) => r.timings.duration < 300,
      'no server errors': (r) => r.status < 500,
    });
  }

  // Phase 7: Refresh leaderboard (active users)
  if (Math.random() > 0.5) { // 50% refresh leaderboard
    const refreshResponse = http.get(`${BASE_URL}/tournaments/leaderboard?limit=50`, { 
      headers: getAuthHeaders(),
      tags: { name: 'tournaments_leaderboard_refresh' },
    });
    
    checkReadResponse(refreshResponse, 'tournaments_leaderboard_refresh');
  }

  // Phase 8: Check couples (tournament related feature)
  if (Math.random() > 0.7) { // 30% check couples
    const couplesResponse = http.get(`${BASE_URL}/couples/my`, { 
      headers: getAuthHeaders(),
      tags: { name: 'couples_tournament_check' },
    });
    
    check(couplesResponse, {
      'couples status 200 or 404': (r) => r.status === 200 || r.status === 404,
      'couples response time < 300ms': (r) => r.timings.duration < 300,
      'no server errors': (r) => r.status < 500,
    });
  }

  // End of session
  sleep(Math.random() * 3 + 2);
}

export function handleSummary(data) {
  return {
    'tournament-flow-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
