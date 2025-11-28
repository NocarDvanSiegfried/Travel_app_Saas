/**
 * Peak Load Scenario
 * 
 * Сценарий пиковой нагрузки для всех API endpoints.
 * Симулирует реальный трафик с пиковыми значениями.
 * 
 * Параметры:
 * - RPS: 500 запросов/сек
 * - Длительность: 2 минуты
 * - Тип запросов: Смешанные (простые и сложные)
 * 
 * Ожидаемый результат:
 * - P95 latency < 2s
 * - Error rate < 1%
 * - Система стабильна
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const requestSuccessRate = new Rate('request_success');
const requestDuration = new Trend('request_duration');
const requestErrors = new Counter('request_errors');

// Test data
const cityPairs = [
  { from: 'yakutsk', to: 'moscow' },
  { from: 'yakutsk', to: 'mirny' },
  { from: 'yakutsk', to: 'srednekolymsk' },
  { from: 'mirny', to: 'moscow' },
  { from: 'srednekolymsk', to: 'yakutsk' },
];

const cityQueries = ['я', 'як', 'якут', 'якутск', 'моск', 'москва', 'мирн', 'мирный'];

const testDates = ['2024-07-15', '2024-12-25', '2024-04-15'];

// Base URL
const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3000';
const API_VERSION = 'v1';

/**
 * Пиковая нагрузка: 500 RPS, 2 минуты
 */
export const options = {
  stages: [
    { duration: '30s', target: 200 },  // Ramp up to 200 users
    { duration: '2m', target: 500 },   // Stay at 500 users (500 RPS)
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // 95% < 2s, 99% < 5s
    http_req_failed: ['rate<0.01'],                  // Error rate < 1%
    request_success: ['rate>0.99'],                  // Success rate > 99%
  },
};

/**
 * Выполняет запрос к /smart-routes/build
 */
function buildRoute() {
  const pair = cityPairs[Math.floor(Math.random() * cityPairs.length)];
  const date = testDates[Math.floor(Math.random() * testDates.length)];
  
  const url = `${BASE_URL}/api/${API_VERSION}/smart-routes/build`;
  const body = JSON.stringify({
    from: pair.from,
    to: pair.to,
    date: date,
  });
  
  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'smart-routes/build' },
  };
  
  const startTime = Date.now();
  const res = http.post(url, body, params);
  const duration = Date.now() - startTime;
  
  requestDuration.add(duration);
  
  const success = check(res, {
    'build route status is 200': (r) => r.status === 200,
  });
  
  requestSuccessRate.add(success);
  if (!success) requestErrors.add(1);
  
  return success;
}

/**
 * Выполняет запрос к /smart-routes/autocomplete
 */
function autocomplete() {
  const query = cityQueries[Math.floor(Math.random() * cityQueries.length)];
  const url = `${BASE_URL}/api/${API_VERSION}/smart-routes/autocomplete?q=${encodeURIComponent(query)}`;
  
  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'smart-routes/autocomplete' },
  };
  
  const startTime = Date.now();
  const res = http.get(url, params);
  const duration = Date.now() - startTime;
  
  requestDuration.add(duration);
  
  const success = check(res, {
    'autocomplete status is 200': (r) => r.status === 200,
  });
  
  requestSuccessRate.add(success);
  if (!success) requestErrors.add(1);
  
  return success;
}

/**
 * Основная функция теста
 * Распределение запросов:
 * - 60% build route
 * - 35% autocomplete
 * - 5% connectivity
 */
export default function () {
  const rand = Math.random();
  
  if (rand < 0.6) {
    // 60% - build route
    buildRoute();
  } else if (rand < 0.95) {
    // 35% - autocomplete
    autocomplete();
  } else {
    // 5% - connectivity
    const url = `${BASE_URL}/api/${API_VERSION}/smart-routes/connectivity`;
    const params = {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'smart-routes/connectivity' },
    };
    
    const startTime = Date.now();
    const res = http.get(url, params);
    const duration = Date.now() - startTime;
    
    requestDuration.add(duration);
    
    const success = check(res, {
      'connectivity status is 200': (r) => r.status === 200,
    });
    
    requestSuccessRate.add(success);
    if (!success) requestErrors.add(1);
  }
  
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
  console.log(`✅ Peak load test completed for ${data.baseUrl}`);
}





