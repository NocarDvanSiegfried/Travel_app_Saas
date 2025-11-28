/**
 * Load Test: GET /smart-routes/autocomplete
 * 
 * Нагрузочные тесты для автодополнения городов.
 * 
 * Сценарии:
 * 1. Быстрый поиск: 500 RPS, 5 минут (короткие запросы 1-3 символа)
 * 2. Длинные запросы: 200 RPS, 5 минут (полные названия городов)
 * 
 * Метрики:
 * - RPS (Requests Per Second)
 * - Latency (P50, P95, P99)
 * - Error rate (< 0.1%)
 * - Throughput
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const autocompleteSuccessRate = new Rate('autocomplete_success');
const autocompleteDuration = new Trend('autocomplete_duration');
const autocompleteErrors = new Counter('autocomplete_errors');

// Test queries - realistic city names and partial queries
const cityQueries = [
  // Short queries (1-3 characters)
  'я', 'як', 'мо', 'ми', 'ср', 'ол', 'ле', 'ни', 'ви', 'хр',
  // Medium queries (4-7 characters)
  'якут', 'моск', 'мирн', 'средн', 'олек', 'ленс', 'вилю', 'нижн',
  // Long queries (full names)
  'якутск', 'москва', 'мирный', 'среднеколымск', 'олёкминск', 'ленск',
  'вилюйск', 'нижний бестях', 'хандыга', 'алдан', 'томмот', 'тикси',
  'новосибирск', 'красноярск', 'иркутск', 'хабаровск',
];

// Base URL
const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3000';
const API_VERSION = 'v1';

/**
 * Быстрый поиск: 500 RPS, 5 минут
 */
export const options = {
  stages: [
    { duration: '30s', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 500 },  // Stay at 500 users (500 RPS)
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<100', 'p(99)<200'], // 95% < 100ms, 99% < 200ms
    http_req_failed: ['rate<0.001'],                // Error rate < 0.1%
    autocomplete_success: ['rate>0.999'],          // Success rate > 99.9%
    autocomplete_duration: ['p(95)<100'],          // 95% < 100ms
  },
};

/**
 * Генерирует случайный запрос
 */
function getRandomQuery() {
  return cityQueries[Math.floor(Math.random() * cityQueries.length)];
}

/**
 * Основная функция теста
 */
export default function () {
  const query = getRandomQuery();
  const url = `${BASE_URL}/api/${API_VERSION}/smart-routes/autocomplete?q=${encodeURIComponent(query)}`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: {
      endpoint: 'smart-routes/autocomplete',
      queryLength: query.length,
    },
  };
  
  const startTime = Date.now();
  const res = http.get(url, params);
  const duration = Date.now() - startTime;
  
  // Record metrics
  autocompleteDuration.add(duration);
  
  // Check response
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response has cities array': (r) => {
      try {
        const json = JSON.parse(r.body);
        return Array.isArray(json.cities) || Array.isArray(json);
      } catch {
        return false;
      }
    },
    'response time < 100ms': (r) => r.timings.duration < 100,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  autocompleteSuccessRate.add(success);
  
  if (!success) {
    autocompleteErrors.add(1);
  }
  
  // Very small sleep for high RPS
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
  
  return {
    baseUrl: BASE_URL,
    apiVersion: API_VERSION,
  };
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log(`✅ Autocomplete load test completed for ${data.baseUrl}`);
}





