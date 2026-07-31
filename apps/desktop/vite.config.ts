import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { loadEnv } from 'vite';
import { availableProviders, prepareUpstreamRequest, readBody } from './llmProxyCore.ts';

// ── LLM proxy ──────────────────────────────────────────────
// SHIPPING-GRADE: provider API keys live ONLY on the server (loaded from .env).
// The browser never sees a key and never talks to provider APIs directly — it
// calls this same-origin proxy. This closes the client-key-exposure / CORS hole.
// Works in `vite dev` and `vite preview` with zero extra dependencies.
// The proxy logic lives in llmProxyCore.ts so it is shared with server.mjs and
// covered by unit tests.

function llmProxy() {
  let envCache: Record<string, string> | null = null;
  const getEnv = () => {
    if (!envCache) {
      envCache = loadEnv(process.env.NODE_ENV || 'development', '../../', [
        'VITE_', 'GROQ_', 'MISTRAL_', 'TAVILY_', 'BRAVE_', 'OPENAI_', 'OPENROUTER_', 'NOUS_',
      ]);
    }
    return envCache;
  };

  const handle = async (req: any, res: any, next: () => void) => {
    const url = (req.url || '').split('?')[0];

    if (req.method === 'GET' && url === '/api/llm/providers') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(availableProviders(getEnv())));
      return;
    }

    if (req.method === 'POST' && url === '/api/llm') {
      try {
        const raw = (await readBody(req)) || '{}';
        let body: any;
        try {
          body = JSON.parse(raw);
        } catch {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'invalid JSON body' }));
          return;
        }

        const wantStream = body?.stream === true;
        const upstream = prepareUpstreamRequest(getEnv(), body, wantStream);

        // ── Streaming path: pipe upstream SSE straight to the client.
        // The proxy stays a dumb pipe; the browser parses `data:` lines.
        if (wantStream) {
          const resp = await fetch(upstream.url, {
            method: 'POST',
            headers: upstream.headers,
            body: JSON.stringify(upstream.payload),
          });
          if (!resp.ok || !resp.body) {
            const text = await resp.text();
            res.statusCode = resp.status || 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(text || JSON.stringify({ error: 'upstream stream error' }));
            return;
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache, no-transform');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Accel-Buffering', 'no');
          res.flushHeaders?.();
          const reader = (resp.body as any).getReader();
          const pump = async () => {
            try {
              for (;;) {
                const { value, done } = await reader.read();
                if (done) break;
                res.write(Buffer.from(value));
              }
            } catch (e) {
              // Client/upstream disconnect — best-effort end.
            }
            res.end();
          };
          pump();
          return;
        }

        // ── Buffered path (default, also used by tests): return the full JSON.
        const resp = await fetch(upstream.url, {
          method: 'POST',
          headers: upstream.headers,
          body: JSON.stringify(upstream.payload),
        });
        const text = await resp.text();
        res.statusCode = resp.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(text);
      } catch (e: any) {
        // unknown provider / missing key -> 400; anything else -> 500
        const isClient = e?.message === 'unknown provider' || (e?.message || '').startsWith('No API key');
        res.statusCode = isClient ? 400 : 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e?.message || 'proxy error' }));
      }
      return;
    }

    next();
  };

  return {
    name: 'agenmonster-llm-proxy',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => handle(req, res, next));
    },
    configurePreviewServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => handle(req, res, next));
    },
  };
}

export default {
  plugins: [sveltekit(), llmProxy()],
  kit: {
    adapter: adapter(),
  },
  envDir: '../../',
  envPrefix: ['VITE_', 'GROQ_', 'MISTRAL_', 'TAVILY_', 'BRAVE_'],
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
    target: 'esnext',
    minify: 'esbuild',
  },
  css: {
    transformer: 'esbuild',
  },
};
