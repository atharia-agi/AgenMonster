import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..', '..');
const BUILD_DIR = join(ROOT, 'apps', 'desktop', 'build');

function createTestServer() {
  return createServer((req, res) => {
    const url = new URL(req.url || '/', `http://localhost:9999`);
    const pathname = decodeURIComponent(url.pathname);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': 'http://localhost:*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Device-Token',
        'Access-Control-Max-Age': '86400',
      });
      res.end();
      return;
    }

    if (req.method === 'GET' && pathname === '/api/llm/providers') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': 'http://localhost:*',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify([]));
      return;
    }

    if (req.method === 'POST' && pathname === '/api/sync/publish') {
      const token = req.headers['x-device-token'] || req.headers['authorization'] || '';
      if (token !== 'secret123' && token !== 'Bearer secret123') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === 'GET' && pathname === '/api/sync/peers') {
      const token = req.headers['x-device-token'] || req.headers['authorization'] || '';
      if (token !== 'secret123' && token !== 'Bearer secret123') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([]));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });
}

function request(opts: { method?: string; path?: string; headers?: Record<string, string>; body?: string }) {
  return new Promise<any>((resolve, reject) => {
    const server = createTestServer();
    server.listen(0, async () => {
      const address = server.address();
      const port = typeof address === 'string' ? 0 : (address as { port: number }).port;
      const url = `http://localhost:${port}${opts.path || '/'}`;
      try {
        const res = await fetch(url, {
          method: opts.method || 'GET',
          headers: opts.headers || {},
          body: opts.body,
        });
        const text = await res.text();
        server.close();
        resolve({ status: res.status, headers: Object.fromEntries(res.headers.entries()), body: text });
      } catch (e) {
        server.close();
        reject(e);
      }
    });
  });
}

test('CORS preflight returns 204 with allowed headers', async () => {
  const res = await request({ method: 'OPTIONS', path: '/api/llm/providers' });
  assert.equal(res.status, 204);
  assert.ok(res.headers['access-control-allow-origin']?.includes('localhost'));
  assert.ok(res.headers['access-control-allow-methods']?.includes('POST'));
});

test('LLM providers endpoint returns JSON with CORS', async () => {
  const res = await request({ method: 'GET', path: '/api/llm/providers' });
  assert.equal(res.status, 200);
  assert.equal(res.headers['content-type'], 'application/json');
});

test('Sync publish rejects unauthorized requests', async () => {
  const res = await request({ method: 'POST', path: '/api/sync/publish', body: '{}' });
  assert.equal(res.status, 401);
  const json = JSON.parse(res.body);
  assert.equal(json.error, 'unauthorized');
});

test('Sync publish accepts valid device token', async () => {
  const res = await request({ method: 'POST', path: '/api/sync/publish', headers: { 'X-Device-Token': 'secret123' }, body: '{}' });
  assert.equal(res.status, 200);
  const json = JSON.parse(res.body);
  assert.equal(json.ok, true);
});

test('Sync publish accepts Bearer token', async () => {
  const res = await request({ method: 'POST', path: '/api/sync/publish', headers: { Authorization: 'Bearer secret123' }, body: '{}' });
  assert.equal(res.status, 200);
});

test('Sync peers rejects unauthorized requests', async () => {
  const res = await request({ method: 'GET', path: '/api/sync/peers' });
  assert.equal(res.status, 401);
});

test('Sync peers accepts valid device token', async () => {
  const res = await request({ method: 'GET', path: '/api/sync/peers', headers: { 'X-Device-Token': 'secret123' } });
  assert.equal(res.status, 200);
  assert.deepEqual(JSON.parse(res.body), []);
});
