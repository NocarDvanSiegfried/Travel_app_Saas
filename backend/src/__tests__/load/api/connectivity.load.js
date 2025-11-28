/**
 * Load Test: GET /smart-routes/connectivity
 * 
 * Нагрузочные тесты для проверки связности графа.
 * 
 * Сценарий:
 * - Проверка связности: 10 RPS, 5 минут
 * 
 * Метрики:
 * - RPS (Requests Per Second)
 * - Latency (P50, P95, P99)
 * - Error rate (< 1%)
 * - Throughput
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const connectivitySuccessRate = new Rate('connectivity_success');
const connectivityDuration = new Trend('connectivity_duration');
const connectivityErrors = new Counter('connectivity_errors');

// Base URL
const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3000';
const API_VERSION = 'v1';

/**
 * Проверка связности: 10 RPS, 5 минут
 */
export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Ramp up to 5 users
    { duration: '5m', target: 10 },    // Stay at 10 users (10 RPS)
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000', 'p(99)<10000'], // 95% < 5s, 99% < 10s
    http_req_failed: ['rate<0.01'],                     // Error rate < 1%
    connectivity_success: ['rate>0.99'],               // Success rate > 99%
    connectivity_duration: ['p(95)<5000'],             // 95% < 5s
  },
};

/**
 * Основная функция теста
 */
export default function () {
  const url = `${BASE_URL}/api/${API_VERSION}/smart-routes/connectivity`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: {
      endpoint: 'smart-routes/connectivity',
    },
  };
  
  const startTime = Date.now();
  const res = http.get(url, params);
  const duration = Date.now() - startTime;
  
  // Record metrics
  connectivityDuration.add(duration);
  
  // Check response
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response has connectivity data': (r) => {
      try {
        const json = JSON.parse(r.body);
        return json.isConnected !== undefined || json.components !== undefined;
      } catch {
        return false;
      }
    },
    'response time < 5s': (r) => r.timings.duration < 5000,
    'response time < 10s': (r) => r.timings.duration < 10000,
  });
  
  connectivitySuccessRate.add(success);
  
  if (!success) {
    connectivityErrors.add(1);
  }
  
  // Sleep to maintain 10 RPS
  sleep(0.1);
}

/**
 * Setup function
 */
export function setup() {
  const healthUrl = `${BASE_URL}/api/${API_VERSION}/health`;
  const healthRes = http.get(healthUrl);
  
  if (healthRes.status !== 200) {
    throw new Error(`API is not available at ${BASE_URL}`);
  }
  
  console.log(`✅ API is available at ${BASE_URL}`);
  
  return {
    baseUrl: BASE_URL,
    apiVersion: API_VERSION,
  };
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log(`✅ Connectivity load test completed for ${data.baseUrl}`);
}





