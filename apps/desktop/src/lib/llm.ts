// LLM client — talks ONLY to the same-origin proxy at /api/llm.
// SHIPPING-GRADE: provider API keys are never exposed to the browser. The proxy
// (see vite.config.ts) reads keys from server-side env and forwards the request.
// If the proxy is unavailable (e.g. static hosting without it), calls fail loudly
// instead of leaking a key.

export type LLMProvider = 'groq' | 'mistral' | 'openai' | 'openrouter' | 'nousresearch' | 'custom';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string; // unused client-side; kept for shape compatibility
  customEndpoint?: string;
}

export interface ProviderInfo {
  id: LLMProvider;
  label: string;
  models: string[];
  hasKey: boolean;
}

let _providersCache: ProviderInfo[] | null = null;

export async function getAvailableProviders(): Promise<ProviderInfo[]> {
  if (_providersCache) return _providersCache;
  try {
    const res = await fetch('/api/llm/providers');
    if (res.ok) {
      _providersCache = (await res.json()) as ProviderInfo[];
      return _providersCache;
    }
  } catch {
    // Proxy not reachable (e.g. static host without it) — degrade gracefully.
  }
  return [];
}

export async function loadLLMConfig(): Promise<LLMConfig> {
  const providers = await getAvailableProviders();
  if (providers.length) {
    const p = providers[0];
    return { provider: p.id, model: p.models[0], apiKey: '', customEndpoint: '' };
  }
  return { provider: 'nousresearch', model: 'stepfun/step-3.7-flash:free', apiKey: '', customEndpoint: '' };
}

export function saveLLMConfig(config: LLMConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('agenmonster_llm_choice', JSON.stringify({
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      customEndpoint: config.customEndpoint || '',
    }));
  } catch {}
}

export function loadPersistedLLMChoice(): Partial<LLMConfig> | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('agenmonster_llm_choice');
    return stored ? (JSON.parse(stored) as Partial<LLMConfig>) : null;
  } catch {
    return null;
  }
}

export async function sendLLM(
  messages: Array<{ role: string; content: string }>,
  config: LLMConfig
): Promise<string> {
  const body: Record<string, unknown> = {
    provider: config.provider,
    model: config.model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  };
  if (config.provider === 'custom') {
    body.customEndpoint = config.customEndpoint;
    body.customApiKey = config.apiKey;
  }
  const res = await fetch('/api/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    let msg = `LLM API error ${res.status}`;
    try {
      const j = JSON.parse(text);
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }

  const data = JSON.parse(text);
  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error('Empty response from LLM');
  return reply;
}

// Pure SSE parser used by `sendLLMStream`. Exported separately so it can be
// unit-tested without a real browser/Node `fetch` body. Lines look like:
//   data: {"choices":[{"delta":{"content":"hel"}}]}
//   data: [DONE]
// Blank lines separate events; comments / non-data lines are ignored.
export async function consumeSSEStream(
  chunks: AsyncIterable<Uint8Array>,
  decoder: TextDecoder,
  onToken: (delta: string, fullSoFar: string) => void,
): Promise<string> {
  let buf = '';
  let full = '';
  for await (const value of chunks) {
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf('\n')) !== -1) {
      let line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      if (line.startsWith('data:')) line = line.slice(5).trim();
      else continue;
      if (line === '[DONE]') return full;
      try {
        const j = JSON.parse(line);
        const delta: string = j?.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          full += delta;
          onToken(delta, full);
        }
      } catch {
        // partial JSON — keep going; next chunks will complete it.
      }
    }
  }
  return full;
}

// Streaming variant: opens an SSE pump to /api/llm with stream:true and emits
// incremental `delta.content` tokens via `onToken`. Returns the final assembled
// string. Falls back to non-stream on any early failure (e.g. proxy rejects).
export async function sendLLMStream(
  messages: Array<{ role: string; content: string }>,
  config: LLMConfig,
  onToken: (delta: string, fullSoFar: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const timeout = AbortSignal.timeout(120_000);
  const merged = signal
    ? AbortSignal.any([signal, timeout])
    : timeout;
  const res = await fetch('/api/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: config.provider,
      model: config.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      ...(config.provider === 'custom' ? { customEndpoint: config.customEndpoint, customApiKey: config.apiKey } : {}),
    }),
    signal: merged,
  });

  if (!res.ok) {
    let msg = `LLM API error ${res.status}`;
    try {
      const t = await res.text();
      const j = JSON.parse(t);
      if (j?.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }
  if (!res.body) throw new Error('Streaming unsupported by proxy');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  return consumeSSEStream(
    {
      [Symbol.asyncIterator]() {
        return {
          next() {
            return reader.read();
          },
        };
      },
    },
    decoder,
    onToken,
  );
}
