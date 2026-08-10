import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');
const requestCount = new Counter('requests_total');

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      tags: { scenario: 'smoke' },
    },
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 25 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 75 },
        { duration: '30s', target: 100 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      tags: { scenario: 'load' },
    },
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '1m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '1m', target: 0 },
      ],
      tags: { scenario: 'stress' },
    },
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '10s', target: 500 },
        { duration: '30s', target: 10 },
      ],
      tags: { scenario: 'spike' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:1420';

const endpoints = [
  { path: '/', name: 'homepage' },
  { path: '/api/mcp/tools', name: 'mcp-tools' },
  { path: '/api/mcp/resources', name: 'mcp-resources' },
  { path: '/api/sync/peers', name: 'sync-peers' },
];

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'k6-load-test/1.0',
  };
}

export default function () {
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const url = `${BASE_URL}${endpoint.path}`;

  const params = {
    headers: getHeaders(),
    tags: { name: endpoint.name },
    timeout: '30s',
  };

  const startTime = Date.now();
  const res = http.get(url, params);
  const duration = Date.now() - startTime;

  requestDuration.add(duration);
  requestCount.add(1);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
    'has body': (r) => r.body && r.body.length > 0,
  });

  errorRate.add(!success);

  sleep(Math.random() * 2 + 0.5);
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    scenarios: {},
    metrics: {
      http_req_duration: {
        avg: data.metrics.http_req_duration?.values?.avg || 0,
        min: data.metrics.http_req_duration?.values?.min || 0,
        max: data.metrics.http_req_duration?.values?.max || 0,
        p90: data.metrics.http_req_duration?.values?.['p(90)'] || 0,
        p95: data.metrics.http_req_duration?.values?.['p(95)'] || 0,
        p99: data.metrics.http_req_duration?.values?.['p(99)'] || 0,
      },
      http_req_failed: data.metrics.http_req_failed?.values?.rate || 0,
      errors: data.metrics.errors?.values?.rate || 0,
      checks: data.metrics.checks?.values?.rate || 0,
      requests_total: data.metrics.requests_total?.values?.count || 0,
    },
  };

  for (const [name, scenario] of Object.entries(data.scenarios || {})) {
    summary.scenarios[name] = {
      vus: scenario.metrics?.vus?.values?.count || 0,
      iterations: scenario.metrics?.iterations?.values?.count || 0,
      duration: scenario.duration,
    };
  }

  return {
    'stdout': JSON.stringify(summary, null, 2),
    'load-test-results.json': JSON.stringify(summary, null, 2),
  };
}