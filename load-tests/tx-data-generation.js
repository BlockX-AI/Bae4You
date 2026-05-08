// TX Data Generation Flow Test - Simulates blockchain transaction data requests
import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  BASE_URL,
  commonHeaders,
  getAuthHeaders,
  checkResponse,
  rpcThresholds,
} from './k6-config.js';

export let options = {
  stages: [
    { duration: '1m', target: 50 },    // Ramp up
    { duration: '4m', target: 200 },   // Main load (tx-data is RPC intensive)
    { duration: '2m', target: 300 },   // Peak load
    { duration: '3m', target: 200 },   // Sustained
    { duration: '1m', target: 50 },    // Scale down
    { duration: '1m', target: 0 },     // Cool down
  ],
  thresholds: rpcThresholds,
};

export default function () {
  // Phase 1: Generate buy transaction data
  const tokenId = Math.floor(Math.random() * 1000) + 1;
  const buyTxResponse = http.get(`${BASE_URL}/actions/tx-data/buy/${tokenId}`, { 
    headers: getAuthHeaders(),
    tags: { name: 'tx_data_buy' },
  });
  
  checkResponse(buyTxResponse, 'tx_data_buy', {
    'tx-data status 200 or 401': (r) => r.status === 200 || r.status === 401,
    'tx-data response time < 2s': (r) => r.timings.duration < 2000,
    'has transaction steps': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.steps || body.data || body.transaction;
      } catch {
        return false;
      }
    },
  });

  sleep(Math.random() * 1 + 0.5);

  // Phase 2: Generate lock transaction data
  const lockTxResponse = http.get(`${BASE_URL}/actions/tx-data/lock/${tokenId}`, { 
    headers: getAuthHeaders(),
    tags: { name: 'tx_data_lock' },
  });
  
  checkResponse(lockTxResponse, 'tx_data_lock', {
    'tx-data status 200 or 401': (r) => r.status === 200 || r.status === 401,
    'tx-data response time < 2s': (r) => r.timings.duration < 2000,
    'has lock transaction data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.steps || body.data || body.transaction;
      } catch {
        return false;
      }
    },
  });

  sleep(Math.random() * 1 + 0.5);

  // Phase 3: Generate gift transaction data
  const giftTxResponse = http.get(`${BASE_URL}/actions/tx-data/gift/${tokenId}`, { 
    headers: getAuthHeaders(),
    tags: { name: 'tx_data_gift' },
  });
  
  checkResponse(giftTxResponse, 'tx_data_gift', {
    'tx-data status 200 or 401': (r) => r.status === 200 || r.status === 401,
    'tx-data response time < 2s': (r) => r.timings.duration < 2000,
    'has gift transaction data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.steps || body.data || body.transaction;
      } catch {
        return false;
      }
    },
  });

  sleep(Math.random() * 1 + 0.5);

  // Phase 4: Generate bonus claim transaction data
  if (Math.random() > 0.5) { // 50% request bonus claim
    const bonusTxResponse = http.get(`${BASE_URL}/actions/tx-data/claim-bonus`, { 
      headers: getAuthHeaders(),
      tags: { name: 'tx_data_claim_bonus' },
    });
    
    checkResponse(bonusTxResponse, 'tx_data_claim_bonus', {
      'tx-data status 200 or 401': (r) => r.status === 200 || r.status === 401,
      'tx-data response time < 2s': (r) => r.timings.duration < 2000,
      'has bonus claim data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.steps || body.data || body.transaction;
        } catch {
          return false;
        }
      },
    });

    sleep(Math.random() * 1 + 0.5);
  }

  // Phase 5: Generate badge claim transaction data
  if (Math.random() > 0.7) { // 30% request badge claim
    const badgeTxResponse = http.get(`${BASE_URL}/actions/tx-data/claim-badge`, { 
      headers: getAuthHeaders(),
      tags: { name: 'tx_data_claim_badge' },
    });
    
    checkResponse(badgeTxResponse, 'tx_data_claim_badge', {
      'tx-data status 200 or 401': (r) => r.status === 200 || r.status === 401,
      'tx-data response time < 2s': (r) => r.timings.duration < 2000,
      'has badge claim data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.steps || body.data || body.transaction;
        } catch {
          return false;
        }
      },
    });

    sleep(Math.random() * 1 + 0.5);
  }

  // Phase 6: Generate couple proof transaction data
  if (Math.random() > 0.8) { // 20% request couple proof
    const coupleTxResponse = http.get(`${BASE_URL}/actions/tx-data/couple-proof`, { 
      headers: getAuthHeaders(),
      tags: { name: 'tx_data_couple_proof' },
    });
    
    checkResponse(coupleTxResponse, 'tx_data_couple_proof', {
      'tx-data status 200 or 401': (r) => r.status === 200 || r.status === 401,
      'tx-data response time < 2s': (r) => r.timings.duration < 2000,
      'has couple proof data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.steps || body.data || body.transaction;
        } catch {
          return false;
        }
      },
    });

    sleep(Math.random() * 1 + 0.5);
  }

  // Phase 7: Stress test with multiple concurrent requests
  if (Math.random() > 0.9) { // 10% stress test
    const concurrentRequests = [];
    const tokenIds = Array.from({ length: 5 }, () => Math.floor(Math.random() * 100) + 1);
    
    for (const id of tokenIds) {
      concurrentRequests.push(
        http.asyncRequest('GET', `${BASE_URL}/actions/tx-data/buy/${id}`, { headers: getAuthHeaders() })
      );
    }

    // Wait for all concurrent requests
    const results = Promise.all(concurrentRequests);
    check(results, {
      'concurrent requests completed': (r) => r.every(response => response.status < 500),
    });
  }

  // End of session
  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  return {
    'tx-data-generation-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
