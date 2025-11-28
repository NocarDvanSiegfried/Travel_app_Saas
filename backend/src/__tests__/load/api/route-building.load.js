/**
 * Load Test: POST /smart-routes/build
 * 
 * Нагрузочные тесты для построения маршрутов.
 * 
 * Сценарии:
 * 1. Базовая нагрузка: 100 RPS, 5 минут
 * 2. Пиковая нагрузка: 500 RPS, 2 минуты
 * 3. Стресс-тест: 1000 RPS, 1 минута
 * 4. Длительная нагрузка: 200 RPS, 30 минут
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
const routeBuildSuccessRate = new Rate('route_build_success');
const routeBuildDuration = new Trend('route_build_duration');
const routeBuildErrors = new Counter('route_build_errors');

// Test data - realistic city pairs from Yakutia
const cityPairs = [
  { from: 'yakutsk', to: 'moscow' },
  { from: 'yakutsk', to: 'mirny' },
  { from: 'yakutsk', to: 'srednekolymsk' },
  { from: 'mirny', to: 'moscow' },
  { from: 'srednekolymsk', to: 'yakutsk' },
  { from: 'olekminsk', to: 'yakutsk' },
  { from: 'lensk', to: 'yakutsk' },
  { from: 'vilyuisk', to: 'yakutsk' },
  { from: 'yakutsk', to: 'novosibirsk' },
  { from: 'yakutsk', to: 'krasnoyarsk' },
];

// Test dates
const testDates = [
  '2024-07-15', // Summer
  '2024-12-25', // Winter
  '2024-04-15', // Transition
  '2024-10-15', // Transition
];

// Base URL (can be overridden with K6_BASE_URL env var)
const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3000';
const API_VERSION = 'v1';

/**
 * Базовая нагрузка: 100 RPS, 5 минут
 */
export const options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp up to 50 users
    { duration: '5m', target: 100 }, // Stay at 100 users (100 RPS)
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'],                 // Error rate < 1%
    route_build_success: ['rate>0.99'],             // Success rate > 99%
    route_build_duration: ['p(95)<500'],            // 95% of route builds < 500ms
  },
};

/**
 * Генерирует случайную пару городов
 */
function getRandomCityPair() {
  return cityPairs[Math.floor(Math.random() * cityPairs.length)];
}

/**
 * Генерирует случайную дату
 */
function getRandomDate() {
  return testDates[Math.floor(Math.random() * testDates.length)];
}

/**
 * Создаёт тело запроса для построения маршрута
 */
function createBuildRouteRequest() {
  const pair = getRandomCityPair();
  const date = getRandomDate();
  
  // 70% простых маршрутов, 30% сложных (с параметрами)
  const isComplex = Math.random() < 0.3;
  
  const body = {
    from: pair.from,
    to: pair.to,
    date: date,
  };
  
  if (isComplex) {
    const transports = ['airplane', 'train', 'bus', 'ferry'];
    const priorities = ['price', 'time', 'comfort'];
    
    body.preferredTransport = transports[Math.floor(Math.random() * transports.length)];
    body.maxTransfers = Math.floor(Math.random() * 3) + 1; // 1-3 transfers
    body.priority = priorities[Math.floor(Math.random() * priorities.length)];
  }
  
  return body;
}

/**
 * Основная функция теста
 */
export default function () {
  const url = `${BASE_URL}/api/${API_VERSION}/smart-routes/build`;
  const body = createBuildRouteRequest();
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: {
      endpoint: 'smart-routes/build',
      from: body.from,
      to: body.to,
    },
  };
  
  const startTime = Date.now();
  const res = http.post(url, JSON.stringify(body), params);
  const duration = Date.now() - startTime;
  
  // Record metrics
  routeBuildDuration.add(duration);
  
  // Check response
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response has route': (r) => {
      try {
        const json = JSON.parse(r.body);
        return json.success === true && json.route !== undefined;
      } catch {
        return false;
      }
    },
    'response time < 500ms': (r) => r.timings.duration < 500,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  routeBuildSuccessRate.add(success);
  
  if (!success) {
    routeBuildErrors.add(1);
  }
  
  // Small sleep to avoid overwhelming the server
  sleep(0.1);
}

/**
 * Setup function - runs once before all VUs
 */
export function setup() {
  // Check if API is available
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
 * Teardown function - runs once after all VUs
 */
export function teardown(data) {
  console.log(`✅ Load test completed for ${data.baseUrl}`);
}






