// K6 Configuration for Bae4U/Fantasy Bae Load Tests
import { check } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');
export let authErrors = new Rate('auth_errors');
export let apiErrors = new Rate('api_errors');
export let rpcErrors = new Rate('rpc_errors');

// Response time trends
export let authLatency = new Trend('auth_latency');
export let apiLatency = new Trend('api_latency');
export let rpcLatency = new Trend('rpc_latency');

// Common thresholds for all tests
export const commonThresholds = {
  http_req_failed: ['rate<0.01'], // < 1% error rate
  http_req_duration: ['p(95)<500', 'p(99)<2000'], // p95 < 500ms, p99 < 2s
  errors: ['rate<0.01'],
};

// Auth-specific thresholds (more lenient for write operations)
export const authThresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<1000', 'p(99)<3000'], // p95 < 1s for auth
  auth_errors: ['rate<0.005'], // < 0.5% auth errors
};

// Read-specific thresholds (stricter for reads)
export const readThresholds = {
  http_req_failed: ['rate<0.005'], // < 0.5% error rate for reads
  http_req_duration: ['p(95)<300', 'p(99)<1000'], // p95 < 300ms for reads
  api_errors: ['rate<0.005'],
};

// RPC-specific thresholds
export const rpcThresholds = {
  http_req_failed: ['rate<0.02'], // < 2% error rate for RPC
  http_req_duration: ['p(95)<2000', 'p(99)<5000'], // p95 < 2s for RPC
  rpc_errors: ['rate<0.01'],
};

// Environment variables
export const BASE_URL = __ENV.BASE_URL || 'https://baebackend-production.up.railway.app';
export const TEST_WALLET_PRIVATE_KEY = __ENV.TEST_WALLET_PRIVATE_KEY;
export const JWT_TOKEN = __ENV.JWT_TOKEN;

// Common headers
export const commonHeaders = {
  'Content-Type': 'application/json',
  'User-Agent': 'k6-load-test/1.0',
};

// Auth headers
export function getAuthHeaders() {
  return JWT_TOKEN ? {
    ...commonHeaders,
    'Authorization': `Bearer ${JWT_TOKEN}`,
  } : commonHeaders;
}

// Common check functions
export function checkResponse(response, checkName, additionalChecks = {}) {
  const defaultChecks = {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'no server errors': (r) => r.status < 500,
  };

  const allChecks = { ...defaultChecks, ...additionalChecks };
  
  const result = check(response, allChecks, {
    [checkName]: true,
  });

  // Update error metrics
  if (response.status >= 400) {
    errorRate.add(1);
    if (response.status >= 500) {
      apiErrors.add(1);
    }
  }

  return result;
}

// Auth check function
export function checkAuthResponse(response, checkName) {
  return checkResponse(response, checkName, {
    'auth success': (r) => r.status === 200 || r.status === 201,
    'has token or data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.token || body.data || body.jwt;
      } catch {
        return false;
      }
    },
  });
}

// Read check function
export function checkReadResponse(response, checkName) {
  return checkResponse(response, checkName, {
    'read success': (r) => r.status === 200,
    'has data array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.data) || Array.isArray(body);
      } catch {
        return false;
      }
    },
  });
}

// RPC check function
export function checkRpcResponse(response, checkName) {
  return checkResponse(response, checkName, {
    'rpc success': (r) => r.status === 200,
    'has tx data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.steps || body.data || body.transactionHash;
      } catch {
        return false;
      }
    },
  });
}

// Random data generators
export function randomString(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function randomEmail() {
  return `test-${randomString(12)}@bae4u.com`;
}

export function randomEthereumAddress() {
  return '0x' + randomString(40);
}

// Sleep helper
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
