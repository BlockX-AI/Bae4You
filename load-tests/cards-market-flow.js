// Cards Market Browse Flow Test - Simulates NFT card marketplace behavior
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
    { duration: '1m', target: 50 },    // Ramp up
    { duration: '5m', target: 300 },   // Main load
    { duration: '2m', target: 500 },   // Peak load
    { duration: '3m', target: 300 },   // Sustained
    { duration: '1m', target: 50 },    // Scale down
    { duration: '1m', target: 0 },     // Cool down
  ],
  thresholds: commonThresholds,
};

export default function () {
  // Phase 1: Browse cards marketplace
  const cardsResponse = http.get(`${BASE_URL}/cards?limit=50`, { 
    headers: getAuthHeaders(),
    tags: { name: 'cards_market_browse' },
  });
  
  checkReadResponse(cardsResponse, 'cards_marketplace', {
    'has card data': (r) => {
      try {
        const body = JSON.parse(r.body);
        const cards = Array.isArray(body.data) ? body.data : body;
        return cards.length >= 0; // Empty is valid
      } catch {
        return false;
      }
    },
    'response size reasonable': (r) => r.body.length < 200000, // < 200KB
  });

  sleep(Math.random() * 2 + 1);

  // Phase 2: View specific card details
  const cardsToView = Math.floor(Math.random() * 5) + 2; // View 2-6 cards
  
  for (let i = 0; i < cardsToView; i++) {
    const cardId = Math.floor(Math.random() * 1000) + 1;
    const cardResponse = http.get(`${BASE_URL}/cards/${cardId}`, { 
      headers: getAuthHeaders(),
      tags: { name: 'card_detail_view' },
    });
    
    check(cardResponse, {
      'card status 200 or 404': (r) => r.status === 200 || r.status === 404,
      'card response time < 500ms': (r) => r.timings.duration < 500,
      'no server errors': (r) => r.status < 500,
    });

    sleep(Math.random() * 1 + 0.5);

    // Phase 3: Get transaction data for card (buy action simulation)
    if (Math.random() > 0.4) { // 60% check buy tx data
      const txDataResponse = http.get(`${BASE_URL}/actions/tx-data/buy/${cardId}`, { 
        headers: getAuthHeaders(),
        tags: { name: 'card_buy_tx_data' },
      });
      
      check(txDataResponse, {
        'tx-data status 200 or 401': (r) => r.status === 200 || r.status === 401,
        'tx-data response time < 1s': (r) => r.timings.duration < 1000,
        'no server errors': (r) => r.status < 500,
      });
    }

    // Phase 4: Get transaction data for lock action
    if (Math.random() > 0.7) { // 30% check lock tx data
      const lockTxResponse = http.get(`${BASE_URL}/actions/tx-data/lock/${cardId}`, { 
        headers: getAuthHeaders(),
        tags: { name: 'card_lock_tx_data' },
      });
      
      check(lockTxResponse, {
        'lock-tx status 200 or 401': (r) => r.status === 200 || r.status === 401,
        'lock-tx response time < 1s': (r) => r.timings.duration < 1000,
        'no server errors': (r) => r.status < 500,
      });
    }

    sleep(Math.random() * 1.5 + 0.5);
  }

  // Phase 5: Browse pets marketplace (related feature)
  if (Math.random() > 0.5) { // 50% browse pets
    const petsResponse = http.get(`${BASE_URL}/pets?limit=30`, { 
      headers: getAuthHeaders(),
      tags: { name: 'pets_market_browse' },
    });
    
    checkReadResponse(petsResponse, 'pets_marketplace', {
      'has pet data': (r) => {
        try {
          const body = JSON.parse(r.body);
          const pets = Array.isArray(body.data) ? body.data : body;
          return pets.length >= 0;
        } catch {
          return false;
        }
      },
    });

    sleep(Math.random() * 1 + 0.5);

    // View pet details
    if (Math.random() > 0.3) { // 70% view pet details
      const petId = Math.floor(Math.random() * 500) + 1;
      const petResponse = http.get(`${BASE_URL}/pets/${petId}`, { 
        headers: getAuthHeaders(),
        tags: { name: 'pet_detail_view' },
      });
      
      check(petResponse, {
        'pet status 200 or 404': (r) => r.status === 200 || r.status === 404,
        'pet response time < 800ms': (r) => r.timings.duration < 800, // Pets might be slower
        'no server errors': (r) => r.status < 500,
      });
    }
  }

  // Phase 6: Check wallet balance (power users)
  if (Math.random() > 0.6) { // 40% check balance
    const walletResponse = http.get(`${BASE_URL}/wallet/balance`, { 
      headers: getAuthHeaders(),
      tags: { name: 'wallet_balance_check' },
    });
    
    checkReadResponse(walletResponse, 'wallet_balance');
  }

  // Phase 7: Check transaction history
  if (Math.random() > 0.8) { // 20% check history
    const historyResponse = http.get(`${BASE_URL}/wallet/transactions?limit=20`, { 
      headers: getAuthHeaders(),
      tags: { name: 'transaction_history' },
    });
    
    check(historyResponse, {
      'history status 200 or 404': (r) => r.status === 200 || r.status === 404,
      'history response time < 500ms': (r) => r.timings.duration < 500,
      'no server errors': (r) => r.status < 500,
    });
  }

  // End of session
  sleep(Math.random() * 3 + 2);
}

export function handleSummary(data) {
  return {
    'cards-market-flow-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
