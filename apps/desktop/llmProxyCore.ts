// Framework-agnostic LLM proxy core.
// Shared by: the dev/preview middleware (vite.config.ts), the standalone
// production server (server.mjs), and the unit tests (tests/llmProxyCore.test.ts).
// Holds no HTTP-framework specifics so it can be unit-tested in isolation.

export interface ProviderConfig {
  url: string;
  def: string;
  models: string[];
  keys: string[];
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  groq: {
    url: 'https://api.groq.com/openai/v1',
    def: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    keys: ['GROQ_API_KEY', 'GROQ_API_KEY_1', 'VITE_GROQ_API_KEY'],
  },
  mistral: {
    url: 'https://api.mistral.ai/v1',
    def: 'mistral-small-latest',
    models: ['mistral-small-latest', 'mistral-large-latest', 'codestral-latest'],
    keys: ['MISTRAL_API_KEY_1', 'MISTRAL_API_KEY', 'VITE_MISTRAL_API_KEY'],
  },
  openai: {
    url: 'https://api.openai.com/v1',
    def: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o'],
    keys: ['OPENAI_API_KEY', 'VITE_OPENAI_API_KEY'],
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1',
    def: 'openrouter/auto',
    models: ['openrouter/auto'],
    keys: ['OPENROUTER_API_KEY', 'VITE_OPENROUTER_API_KEY'],
  },
};

export function resolveKey(env: Record<string, string>, provider: string): string {
  const p = PROVIDERS[provider];
  if (!p) return '';
  for (const k of p.keys) if (env[k]?.trim()) return env[k].trim();
  return '';
}

export function availableProviders(env: Record<string, string>) {
  return Object.entries(PROVIDERS)
    .map(([id, p]) => ({
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      models: p.models,
      hasKey: p.keys.some((k) => !!env[k]?.trim()),
    }))
    .filter((p) => p.hasKey);
}

// Validate the incoming body and build the upstream request. Throws a clean
// Error (message only) on unknown provider or missing key so hosts can map it
// to a 400 without leaking internals.
// `stream` flags SSE streaming so the host can pipe chunks back to the client.
export function prepareUpstreamRequest(env: Record<string, string>, body: any, stream = false) {
  const provider = body?.provider;
  if (!provider || !PROVIDERS[provider]) throw new Error('unknown provider');
  const key = resolveKey(env, provider);
  if (!key) throw new Error(`No API key configured for ${provider}`);
  const p = PROVIDERS[provider];
  return {
    url: `${p.url}/chat/completions`,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    payload: {
      model: body.model || p.def,
      messages: body.messages,
      stream,
      max_tokens: body.max_tokens || 1024,
      temperature: body.temperature ?? 0.7,
    },
  };
}

// Read a Node IncomingMessage body into a string (used by both hosts, which
// receive a Node-style request object).
export function readBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c: any) => {
      data += c;
      if (data.length > 5e6) req.destroy();
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
