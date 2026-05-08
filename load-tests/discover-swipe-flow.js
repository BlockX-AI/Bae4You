// Discover/Swipe Flow Test - Simulates dating app core behavior
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
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '8m', target: 800 },   // Main load (discover is core feature)
    { duration: '3m', target: 1500 },  // Peak load
    { duration: '5m', target: 800 },   // Sustained
    { duration: '2m', target: 100 },   // Scale down
    { duration: '1m', target: 0 },     // Cool down
  ],
  thresholds: commonThresholds,
};

export default function () {
  // Phase 1: Load discover feed
  const discoverResponse = http.get(`${BASE_URL}/matches/discover?limit=50`, { 
    headers: getAuthHeaders(),
    tags: { name: 'discover_feed_load' },
  });
  
  checkReadResponse(discoverResponse, 'discover_feed', {
    'has user profiles': (r) => {
      try {
        const body = JSON.parse(r.body);
        const profiles = Array.isArray(body.data) ? body.data : body;
        return profiles.length > 0;
      } catch {
        return false;
      }
    },
    'response size reasonable': (r) => r.body.length < 100000, // < 100KB
  });

  sleep(Math.random() * 2 + 1); // 1-3s browsing time

  // Phase 2: View detailed profiles (most common action)
  const profilesToView = Math.floor(Math.random() * 5) + 3; // View 3-7 profiles
  
  for (let i = 0; i < profilesToView; i++) {
    // Simulate viewing a profile detail
    const profileId = Math.floor(Math.random() * 10000) + 1;
    const profileResponse = http.get(`${BASE_URL}/users/${profileId}`, { 
      headers: getAuthHeaders(),
      tags: { name: 'profile_detail_view' },
    });
    
    check(profileResponse, {
      'profile status 200 or 404': (r) => r.status === 200 || r.status === 404,
      'profile response time < 500ms': (r) => r.timings.duration < 500,
      'no server errors': (r) => r.status < 500,
    });

    // Simulate swipe decision (like/pass)
    if (Math.random() > 0.1) { // 90% of profiles get swiped
      const action = Math.random() > 0.5 ? 'like' : 'pass';
      const swipeResponse = http.post(`${BASE_URL}/matches/swipe`, 
        JSON.stringify({ targetUserId: profileId, action: action }), 
        { headers: getAuthHeaders(), tags: { name: 'swipe_action' } }
      );
      
      check(swipeResponse, {
        'swipe status 200 or 401': (r) => r.status === 200 || r.status === 401,
        'swipe response time < 300ms': (r) => r.timings.duration < 300,
        'no server errors': (r) => r.status < 500,
      });
    }

    sleep(Math.random() * 1.5 + 0.5); // 0.5-2s between profile views
  }

  // Phase 3: Check matches (after swiping)
  if (Math.random() > 0.3) { // 70% check matches
    const matchesResponse = http.get(`${BASE_URL}/matches`, { 
      headers: getAuthHeaders(),
      tags: { name: 'matches_check' },
    });
    
    checkReadResponse(matchesResponse, 'matches_list', {
      'has match data': (r) => {
        try {
          const body = JSON.parse(r.body);
          const matches = Array.isArray(body.data) ? body.data : body;
          return true; // Even empty array is valid
        } catch {
          return false;
        }
      },
    });

    sleep(Math.random() * 1 + 0.5);
  }

  // Phase 4: Check messages (if has matches)
  if (Math.random() > 0.5) { // 50% check messages
    const messagesResponse = http.get(`${BASE_URL}/messages`, { 
      headers: getAuthHeaders(),
      tags: { name: 'messages_check' },
    });
    
    check(messagesResponse, {
      'messages status 200 or 404': (r) => r.status === 200 || r.status === 404,
      'messages response time < 400ms': (r) => r.timings.duration < 400,
      'no server errors': (r) => r.status < 500,
    });
  }

  // Phase 5: Refresh discover feed
  const discoverRefreshResponse = http.get(`${BASE_URL}/matches/discover?limit=50`, { 
    headers: getAuthHeaders(),
    tags: { name: 'discover_feed_refresh' },
  });
  
  checkReadResponse(discoverRefreshResponse, 'discover_feed_refresh');

  // End of session pause
  sleep(Math.random() * 3 + 2);
}

export function handleSummary(data) {
  return {
    'discover-swipe-flow-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
