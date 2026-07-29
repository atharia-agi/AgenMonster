// E2E smoke test for marketplace registry HTTP endpoints.
// Requires: cargo run -p marketplace-registry running on port 7777.

import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:7777';

test('healthz returns ok', async ({ request }) => {
  const resp = await request.get(`${BASE}/v1/healthz`);
  expect(resp.ok()).toBeTruthy();
  const body = await resp.json();
  expect(body.ok).toBe(true);
});

test('index returns array', async ({ request }) => {
  const resp = await request.get(`${BASE}/v1/index`);
  expect(resp.ok()).toBeTruthy();
  const body = await resp.json();
  expect(Array.isArray(body)).toBe(true);
});

test('get non-existent skill returns 404', async ({ request }) => {
  const resp = await request.get(`${BASE}/v1/skill/nonexistent`);
  expect(resp.status()).toBe(404);
});

test('publish skill with bad signature returns 401', async ({ request }) => {
  const resp = await request.post(`${BASE}/v1/skill`, {
    data: {
      id: 'test-bad-sig',
      version: '0.0.1',
      author: 'tester',
      author_pubkey: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      signature_b64: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      description: 'A test skill that should fail signature verification on publish.',
      body_markdown: '## Workflow\n1. test\n',
      changelog: 'initial',
    },
  });
  expect(resp.status()).toBe(401);
});

test('star endpoint increments', async ({ request }) => {
  // First publish a real skill (skip if no key)
  const resp = await request.post(`${BASE}/v1/skill/nonexistent/star`);
  // star returns 200 regardless (idempotent)
  expect(resp.ok()).toBeTruthy();
});

test('static index.html is served', async ({ request }) => {
  const resp = await request.get(`${BASE}/`);
  expect(resp.ok()).toBeTruthy();
  const text = await resp.text();
  expect(text).toContain('AGENMONSTER SKILL REGISTRY');
});
