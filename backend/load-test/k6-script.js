/**
 * k6 Load Testing Script
 * 
 * Run with: k6 run k6-script.js
 * 
 * Install k6: https://k6.io/docs/getting-started/installation/
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const CITIES = [
  'Москва',
  'Санкт-Петербург',
  'Казань',
  'Новосибирск',
  'Екатеринбург',
];

// Custom metrics
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 1 },   // Warm up
    { duration: '2m', target: 10 },  // Ramp up
    { duration: '5m', target: 10 },  // Sustained load
    { duration: '1m', target: 50 },  // Spike test
    { duration: '1m', target: 5 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.05'],    // Error rate should be less than 5%
    errors: ['rate<0.05'],
  },
};

function getRandomCity() {
  return CITIES[Math.floor(Math.random() * CITIES.length)];
}

export default function () {
  const scenarios = [
    () => testHealthCheck(),
    () => testCities(),
    () => testRouteSearch(),
    () => testRouteBuild(),
    () => testMetrics(),
  ];

  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();

  sleep(1);
}

function testHealthCheck() {
  const res = http.get(`${BASE_URL}/health`);
  const success = check(res, {
    'health check status is 200 or 503': (r) => r.status === 200 || r.status === 503,
  });
  errorRate.add(!success);
}

function testCities() {
  const res = http.get(`${BASE_URL}/api/v1/cities?page=1&limit=10`);
  const success = check(res, {
    'cities status is 200': (r) => r.status === 200,
    'cities has data': (r) => {
      const body = JSON.parse(r.body);
      return body.data && Array.isArray(body.data);
    },
  });
  errorRate.add(!success);
}

function getRandomDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const randomDays = Math.floor(Math.random() * 30) + 1;
  const date = new Date(tomorrow);
  date.setDate(date.getDate() + randomDays);
  return date.toISOString().split('T')[0];
}

function testRouteSearch() {
  const from = getRandomCity();
  let to = getRandomCity();
  while (to === from) {
    to = getRandomCity();
  }
  const date = getRandomDate();

  const res = http.get(`${BASE_URL}/api/v1/routes/search?from=${from}&to=${to}&date=${date}`);
  const success = check(res, {
    'route search status is valid': (r) => [200, 400, 404, 429, 503].includes(r.status),
  });
  errorRate.add(!success);
}

function testRouteBuild() {
  const from = getRandomCity();
  let to = getRandomCity();
  while (to === from) {
    to = getRandomCity();
  }
  const date = getRandomDate();

  const res = http.get(`${BASE_URL}/api/v1/routes/build?from=${from}&to=${to}&date=${date}`);
  const success = check(res, {
    'route build status is valid': (r) => [200, 400, 404, 429, 503].includes(r.status),
  });
  errorRate.add(!success);
}

function testMetrics() {
  const res = http.get(`${BASE_URL}/api/v1/metrics`);
  const success = check(res, {
    'metrics status is 200': (r) => r.status === 200,
    'metrics is prometheus format': (r) => r.body.includes('http_requests_total'),
  });
  errorRate.add(!success);
}

