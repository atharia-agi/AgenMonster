// Zero-dependency production server for the static SvelteKit build.
// Serves the `build/` SPA (with index.html fallback) AND proxies the LLM API
// server-side, so the secure key handling from dev/preview also works in a
// standalone production deployment — no extra npm install required.
//
//   npm run build && npm run start
//
// Provider keys are read ONLY from the repo-root .env (never shipped to the browser).
// The proxy request logic is shared with vite.config.ts via llmProxyCore.ts.

import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile as readFileP, stat as statP } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { availableProviders, prepareUpstreamRequest, readBody } from './llmProxyCore.ts';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..'); // repo root, where .env lives
const BUILD_DIR = resolve(__dirname, 'build');
const PORT = Number(process.env.PORT) || 1420;

async function loadEnv() {
  const env = {};
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return env;
  try {
    const text = await readFileP(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const idx = t.indexOf('=');
      if (idx === -1) continue;
      const k = t.slice(0, idx).trim();
      let v = t.slice(idx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (k) env[k] = v;
    }
  } catch {
    // .env is optional; provider list will simply be empty.
  }
  return env;
}

const ENV = await loadEnv();

// ── External tool bridge (secondbrain.* / browseros.*) ──
// Mirrors the SvelteKit /api/mcp route so the agent loop reaches SecondBrain
// and BrowserOS tools in production as well as in dev.
const OM_MCP = 'K:\\SecondBrain\\.claude\\scripts\\om-mcp.mjs';
const OM_CWD = 'K:\\SecondBrain\\.mcp';
const OM_TIMEOUT = 15000;
const BROWSEROS_URL = 'http://127.0.0.1:9001/mcp';
const BROWSEROS_TIMEOUT = 30000;

async function callBrowserOS(name, params) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BROWSEROS_TIMEOUT);
  try {
    const resp = await fetch(BROWSEROS_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name, arguments: params },
      }),
      signal: controller.signal,
    });
    const data = await resp.json();
    return { content: data?.result?.content ?? [] };
  } finally {
    clearTimeout(timer);
  }
}

function callSecondBrain(name, params) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [OM_MCP], {
      cwd: OM_CWD,
      env: { ...process.env, OBSIDIAN_VAULT: 'K:\\SecondBrain\\Monster_Brain' },
    });
    let collected = '';
    let msgId;
    try {
      msgId = Date.now();
    } catch {
      msgId = 1;
    }
    const msg = JSON.stringify({
      jsonrpc: '2.0',
      id: msgId,
      method: 'tools/call',
      params: { name, arguments: params },
    });
    const timer = setTimeout(() => {
      try { child.kill(); } catch {}
      reject(new Error('secondbrain timeout'));
    }, OM_TIMEOUT);
    child.stdout.on('data', (chunk) => {
      collected += chunk.toString();
      let idx;
      while ((idx = collected.indexOf('\n')) >= 0) {
        const line = collected.slice(0, idx).trim();
        collected = collected.slice(idx + 1);
        if (!line.startsWith('{"jsonrpc"')) continue;
        try {
          const resp = JSON.parse(line);
          if (resp.id === msgId) {
            clearTimeout(timer);
            try { child.kill(); } catch {}
            resolve(resp.result);
            return;
          }
        } catch {}
      }
    });
    child.stderr.on('data', () => {});
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    try {
      child.stdin.write(msg + '\n');
    } catch (e) {
      clearTimeout(timer);
      reject(new Error('secondbrain write failed: ' + (e instanceof Error ? e.message : String(e))));
    }
  });
}

async function routeMcpTool(handleTool, name, params) {
  if (typeof name !== 'string' || !name) return { ok: false, error: 'missing name' };
  const localNames = await import('./mcp.ts').then((m) => m.TOOLS).catch(() => []);
  if (localNames.includes(name)) return handleTool(name, params);
  if (name.startsWith('secondbrain.')) {
    const sbName = name.slice('secondbrain.'.length);
    const result = await callSecondBrain(sbName, params);
    const text = result?.content?.[0]?.text ?? '';
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { text };
    }
    return { ok: true, data };
  }
  if (name.startsWith('browseros.')) {
    const boName = name.slice('browseros.'.length);
    const result = await callBrowserOS(boName, params);
    const text = result?.content?.[0]?.text ?? '';
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { text };
    }
    return { ok: true, data };
  }
  return { ok: false, error: `Unknown tool: ${name}` };
}

const SYNC_MESSAGES = [];
const SYNC_MAX_MESSAGES = 1000;
const SYNC_TTL_MS = 5 * 60 * 1000;
const SYNC_SECRET = ENV.SYNC_SECRET || '';

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 120;
const rateBuckets = new Map();

function checkRateLimit(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + RATE_LIMIT_WINDOW;
  }
  bucket.count++;
  rateBuckets.set(ip, bucket);
  if (bucket.count > RATE_LIMIT_MAX) {
    return false;
  }
  return true;
}

function rateLimitHeaders(res, remaining, resetAt) {
  res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'http://localhost:* http://127.0.0.1:* tauri://localhost file://',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Device-Token',
  'Access-Control-Max-Age': '86400',
};

function setCors(res) {
  res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
}

function corsPreflight(res) {
  res.writeHead(204, CORS_HEADERS);
  res.end();
}

function checkSyncAuth(req) {
  if (!SYNC_SECRET) return true;
  const token = req.headers['x-device-token'] || req.headers['authorization'] || '';
  return token === SYNC_SECRET || token === `Bearer ${SYNC_SECRET}`;
}

function writeJson(res, status, obj) {
  res.writeHead(status, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.webp': 'image/webp',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);
    const pathname = decodeURIComponent(url.pathname);

    // ── CORS preflight ──
    if (req.method === 'OPTIONS') {
      corsPreflight(res);
      return;
    }

    // ── LLM proxy (server-side keys) ──
    if (req.method === 'GET' && pathname === '/api/llm/providers') {
      if (!checkRateLimit(req)) {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
        const bucket = rateBuckets.get(ip) || { resetAt: Date.now() + RATE_LIMIT_WINDOW };
        rateLimitHeaders(res, 0, bucket.resetAt);
        res.writeHead(429, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'rate limit exceeded' }));
        return;
      }
      setCors(res);
      res.end(JSON.stringify(availableProviders(ENV)));
      return;
    }
    // ── MCP-style tool bridge: dispatch `handleTool(name, params)`. Returns
    // JSON. Stateful tools (memory.*, chat.budget.set, chat.theme) mutate
    // server-side modules that are also imported by the SPA bundle on dev.
    // External tools (secondbrain.* / browseros.*) bridge to the SecondBrain
    // om-mcp process and the BrowserOS MCP endpoint, matching the SvelteKit
    // /api/mcp route so chat's agent loop reaches them in production too.
    if (req.method === 'POST' && pathname === '/api/mcp') {
      if (!checkRateLimit(req)) {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
        const bucket = rateBuckets.get(ip) || { resetAt: Date.now() + RATE_LIMIT_WINDOW };
        rateLimitHeaders(res, 0, bucket.resetAt);
        res.writeHead(429, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'rate limit exceeded' }));
        return;
      }
      const raw = (await readBody(req)) || '{}';
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        writeJson(res, 400, { ok: false, error: 'invalid JSON body' });
        return;
      }
      try {
        const { handleTool } = await import('./mcp.ts').catch(() => ({ handleTool: null }));
        if (!handleTool) {
          writeJson(res, 503, { ok: false, error: 'mcp module unavailable' });
          return;
        }
        const name = String(body?.name || '');
        const params = body?.params || {};
        const result = await routeMcpTool(handleTool, name, params);
        writeJson(res, result.ok ? 200 : 400, result);
      } catch (e) {
        writeJson(res, 500, { ok: false, error: e?.message || 'mcp error' });
      }
      return;
    }

    // Sync relay for cross-device sync (server-relay transport fallback).
    if (req.method === 'OPTIONS' && pathname.startsWith('/api/sync')) {
      corsPreflight(res);
      return;
    }
    if (req.method === 'POST' && pathname === '/api/sync/publish') {
      if (!checkSyncAuth(req)) {
        writeJson(res, 401, { ok: false, error: 'unauthorized' });
        return;
      }
      if (!checkRateLimit(req)) {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
        const bucket = rateBuckets.get(ip) || { resetAt: Date.now() + RATE_LIMIT_WINDOW };
        rateLimitHeaders(res, 0, bucket.resetAt);
        res.writeHead(429, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'rate limit exceeded' }));
        return;
      }
      const raw = (await readBody(req)) || '{}';
      if (raw.length > 65536) {
        writeJson(res, 413, { ok: false, error: 'message too large' });
        return;
      }
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        writeJson(res, 400, { ok: false, error: 'invalid JSON body' });
        return;
      }
      if (typeof msg !== 'object' || msg === null || Array.isArray(msg)
        || typeof msg.deviceId !== 'string' || !msg.deviceId || msg.deviceId.length > 100) {
        writeJson(res, 400, { ok: false, error: 'missing or invalid deviceId' });
        return;
      }
      msg._receivedAt = Date.now();
      SYNC_MESSAGES.push(msg);
      if (SYNC_MESSAGES.length > SYNC_MAX_MESSAGES) SYNC_MESSAGES.splice(0, SYNC_MESSAGES.length - SYNC_MAX_MESSAGES);
      setCors(res);
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.method === 'GET' && pathname === '/api/sync/poll') {
      if (!checkSyncAuth(req)) {
        writeJson(res, 401, { ok: false, error: 'unauthorized' });
        return;
      }
      if (!checkRateLimit(req)) {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
        const bucket = rateBuckets.get(ip) || { resetAt: Date.now() + RATE_LIMIT_WINDOW };
        rateLimitHeaders(res, 0, bucket.resetAt);
        res.writeHead(429, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'rate limit exceeded' }));
        return;
      }
      const since = Number(new URL(req.url || '/', `http://localhost:${PORT}`).searchParams.get('since') || 0);
      const now = Date.now();
      const messages = SYNC_MESSAGES.filter((m) => m._receivedAt >= since && now - m._receivedAt < SYNC_TTL_MS);
      setCors(res);
      res.end(JSON.stringify(messages));
      return;
    }
    if (req.method === 'GET' && pathname === '/api/sync/peers') {
      if (!checkSyncAuth(req)) {
        writeJson(res, 401, { ok: false, error: 'unauthorized' });
        return;
      }
      if (!checkRateLimit(req)) {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
        const bucket = rateBuckets.get(ip) || { resetAt: Date.now() + RATE_LIMIT_WINDOW };
        rateLimitHeaders(res, 0, bucket.resetAt);
        res.writeHead(429, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'rate limit exceeded' }));
        return;
      }
      const now = Date.now();
      const peers = new Map();
      for (const m of SYNC_MESSAGES) {
        if (now - m._receivedAt < 15000 && m.deviceId) {
          peers.set(m.deviceId, { deviceId: m.deviceId, lastSeen: Math.max(peers.get(m.deviceId)?.lastSeen || 0, m._receivedAt) });
        }
      }
      setCors(res);
      res.end(JSON.stringify(Array.from(peers.values())));
      return;
    }
    if (req.method === 'POST' && pathname === '/api/llm') {
      if (!checkRateLimit(req)) {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
        const bucket = rateBuckets.get(ip) || { resetAt: Date.now() + RATE_LIMIT_WINDOW };
        rateLimitHeaders(res, 0, bucket.resetAt);
        res.writeHead(429, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'rate limit exceeded' }));
        return;
      }
      const raw = (await readBody(req)) || '{}';
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        writeJson(res, 400, { error: 'invalid JSON body' });
        return;
      }
      let upstream;
      try {
        upstream = prepareUpstreamRequest(ENV, body, body?.stream === true);
      } catch (e) {
        const isClient = e.message === 'unknown provider' || e.message.startsWith('No API key');
        writeJson(res, isClient ? 400 : 500, { error: e.message });
        return;
      }

      // ── Streaming path: pipe upstream SSE straight through.
      if (body?.stream === true) {
        const resp = await fetch(upstream.url, {
          method: 'POST',
          headers: upstream.headers,
          body: JSON.stringify(upstream.payload),
        });
        if (!resp.ok || !resp.body) {
          const text = await resp.text();
          res.writeHead(resp.status || 502, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
          res.end(text || JSON.stringify({ error: 'upstream stream error' }));
          return;
        }
        res.writeHead(200, {
          ...CORS_HEADERS,
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        });
        const reader = resp.body.getReader();
        for (;;) {
          try {
            const { value, done } = await reader.read();
            if (done) break;
            res.write(Buffer.from(value));
          } catch {
            break;
          }
        }
        res.end();
        return;
      }

      // ── Buffered path (default): return the full JSON.
      const resp = await fetch(upstream.url, {
        method: 'POST',
        headers: upstream.headers,
        body: JSON.stringify(upstream.payload),
      });
      const text = await resp.text();
      res.writeHead(resp.status, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
      res.end(text);
      return;
    }

    // ── Static SPA serving with index.html fallback ──
    let filePath = normalize(join(BUILD_DIR, pathname));
    if (!filePath.startsWith(BUILD_DIR)) {
      res.writeHead(403, CORS_HEADERS);
      res.end('Forbidden');
      return;
    }
    let st = null;
    try {
      st = await statP(filePath);
    } catch {
      st = null;
    }
    if (st && st.isDirectory()) filePath = join(filePath, 'index.html');
    if (!st || !st.isFile()) filePath = join(BUILD_DIR, 'index.html');

    try {
      const data = await readFileP(filePath);
      res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404, CORS_HEADERS);
      res.end('Not found');
    }
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e?.message || 'server error' }));
  }
});

server.listen(PORT, () => {
  console.log(`AgenMonster running at http://localhost:${PORT}`);
});
