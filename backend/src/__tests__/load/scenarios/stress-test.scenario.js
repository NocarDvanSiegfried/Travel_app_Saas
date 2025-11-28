/**
 * Stress Test Scenario
 * 
 * Стресс-тест для проверки пределов системы.
 * 
 * Параметры:
 * - RPS: 1000 запросов/сек
 * - Длительность: 1 минута
 * - Тип запросов: Сложные маршруты (через хабы)
 * 
 * Ожидаемый результат:
 * - Система не падает
 * - Error rate < 5%
 * - Восстановление после нагрузки
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const requestSuccessRate = new Rate('request_success');
const requestDuration = new Trend('request_duration');
const requestErrors = new Counter('request_errors');

// Test data - complex routes
const complexRoutes = [
  { from: 'srednekolymsk', to: 'moscow', maxTransfers: 3 },
  { from: 'chokurdakh', to: 'moscow', maxTransfers: 3 },
  { from: 'verkhoyansk', to: 'moscow', maxTransfers: 3 },
  { from: 'batagay', to: 'moscow', maxTransfers: 3 },
  { from: 'tiksi', to: 'moscow', maxTransfers: 3 },
];

const testDates = ['2024-07-15', '2024-12-25'];

// Base URL
const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3000';
const API_VERSION = 'v1';

/**
 * Стресс-тест: 1000 RPS, 1 минута
 */
export const options = {
  stages: [
    { duration: '10s', target: 500 },   // Ramp up to 500 users
    { duration: '10s', target: 1000 },  // Ramp up to 1000 users (1000 RPS)
    { duration: '1m', target: 1000 },   // Stay at 1000 users
    { duration: '10s', target: 500 },   // Ramp down to 500
    { duration: '10s', target: 0 },     // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000', 'p(99)<10000'], // 95% < 5s, 99% < 10s
    http_req_failed: ['rate<0.05'],                   // Error rate < 5%
    request_success: ['rate>0.95'],                   // Success rate > 95%
  },
};

/**
 * Создаёт сложный запрос на построение маршрута
 */
function createComplexRouteRequest() {
  const route = complexRoutes[Math.floor(Math.random() * complexRoutes.length)];
  const date = testDates[Math.floor(Math.random() * testDates.length)];
  
  return {
    from: route.from,
    to: route.to,
    date: date,
    maxTransfers: route.maxTransfers,
    priority: 'time', // Optimize for time in stress test
  };
}

/**
 * Основная функция теста
 */
export default function () {
  const url = `${BASE_URL}/api/${API_VERSION}/smart-routes/build`;
  const body = createComplexRouteRequest();
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: {
      endpoint: 'smart-routes/build',
      from: body.from,
      to: body.to,
      stressTest: true,
    },
  };
  
  const startTime = Date.now();
  const res = http.post(url, JSON.stringify(body), params);
  const duration = Date.now() - startTime;
  
  // Record metrics
  requestDuration.add(duration);
  
  // Check response (more lenient for stress test)
  const success = check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429, // 429 = rate limit
    'response time < 10s': (r) => r.timings.duration < 10000,
  });
  
  requestSuccessRate.add(success);
  
  if (!success && res.status !== 429) {
    requestErrors.add(1);
  }
  
  // Minimal sleep for maximum load
  sleep(0.01);
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
  console.log(`⚠️  Starting stress test - 1000 RPS for 1 minute`);
  
  return {
    baseUrl: BASE_URL,
    apiVersion: API_VERSION,
  };
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log(`✅ Stress test completed for ${data.baseUrl}`);
  console.log(`⚠️  Check system recovery and error logs`);
}






