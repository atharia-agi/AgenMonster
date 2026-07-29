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

    // ── LLM proxy (server-side keys) ──
    if (req.method === 'GET' && pathname === '/api/llm/providers') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(availableProviders(ENV)));
      return;
    }
    // ── MCP-style tool bridge: dispatch `handleTool(name, params)`. Returns
    // JSON. Stateful tools (memory.*, chat.budget.set, chat.theme) mutate
    // server-side modules that are also imported by the SPA bundle on dev.
    if (req.method === 'POST' && pathname === '/api/mcp') {
      const raw = (await readBody(req)) || '{}';
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'invalid JSON body' }));
        return;
      }
      try {
        const { handleTool } = await import('./mcp.ts').catch(() => ({ handleTool: null }));
        if (!handleTool) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'mcp module unavailable' }));
          return;
        }
        const name = String(body?.name || '');
        const params = body?.params || {};
        const result = handleTool(name, params);
        res.writeHead(result.ok ? 200 : 400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e?.message || 'mcp error' }));
      }
      return;
    }
    if (req.method === 'POST' && pathname === '/api/llm') {
      const raw = (await readBody(req)) || '{}';
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid JSON body' }));
        return;
      }
      let upstream;
      try {
        upstream = prepareUpstreamRequest(ENV, body, body?.stream === true);
      } catch (e) {
        const isClient = e.message === 'unknown provider' || e.message.startsWith('No API key');
        res.writeHead(isClient ? 400 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
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
          res.writeHead(resp.status || 502, { 'Content-Type': 'application/json' });
          res.end(text || JSON.stringify({ error: 'upstream stream error' }));
          return;
        }
        res.writeHead(200, {
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
      res.writeHead(resp.status, { 'Content-Type': 'application/json' });
      res.end(text);
      return;
    }

    // ── Static SPA serving with index.html fallback ──
    let filePath = normalize(join(BUILD_DIR, pathname));
    if (!filePath.startsWith(BUILD_DIR)) {
      res.writeHead(403);
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
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404);
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
