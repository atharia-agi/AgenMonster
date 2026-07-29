// Token tracker — accumulates approximate token usage per model and provider,
// plus a cost estimate in USD per 1K tokens. Persisted to localStorage so the
// cumulative cost is visible across reloads.
//
// Token count is computed client-side as `ceil(chars / 4)` — the standard
// heuristic. Real token counts vary by model, but this is good enough for
// budgeting and avoidance-surprise alerts.

export interface TokenState {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  byRoute: Record<string, { calls: number; total: number; prompt: number; completion: number; cost: number }>;
  lastCallTokens: number;
  lastCallCost: number;
  totalCost: number;
  lastUpdatedAt: number;
  // Rolling 24h spend log (capped) for budget telemetry. Retains last 500 entries.
  recentSpend: Array<{ ts: number; cost: number; provider: string }>;
}

const STORAGE_KEY = 'agenmonster_tokens';

const MAX_RECENT = 500;

// Approximate USD per 1K tokens. Numbers are conservative (slightly overpay)
// so the user never disagrees with their invoice.
const PRICING_PER_1K: Record<string, { input: number; output: number }> = {
  // Groq
  'llama-3.3-70b-versatile': { input: 0.00059, output: 0.00079 },
  'llama-3.1-8b-instant': { input: 0.00005, output: 0.00008 },
  'mixtral-8x7b-32768': { input: 0.00027, output: 0.00027 },
  'gemma2-9b-it': { input: 0.0002, output: 0.0002 },
  // Mistral
  'mistral-small-latest': { input: 0.0002, output: 0.0006 },
  'mistral-large-latest': { input: 0.002, output: 0.006 },
  'codestral-latest': { input: 0.00025, output: 0.00025 },
  // OpenAI
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  // OpenRouter
  'openrouter/auto': { input: 0.0001, output: 0.0001 },
};

function emptyTokenState(): TokenState {
  return {
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    byRoute: {},
    lastCallTokens: 0,
    lastCallCost: 0,
    totalCost: 0,
    lastUpdatedAt: Date.now(),
    recentSpend: [],
  };
}

let _state: TokenState = emptyTokenState();

export function getTokenState(): TokenState {
  return _state;
}

export function resetTokenState(): TokenState {
  _state = emptyTokenState();
  persist();
  return _state;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch {}
}

export function hydrateTokenState(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as TokenState;
    if (parsed && typeof parsed.totalTokens === 'number') {
      _state = parsed;
    }
  } catch {}
}

export function estimateTokens(text: string): number {
  // 1 token ≈ 4 chars for English; ceil for safety.
  return Math.ceil(text.length / 4);
}

export function recordTokenUsage(args: {
  provider: string;
  model: string;
  task: string;
  promptText: string;
  completionText: string;
}): TokenState {
  const promptTokens = estimateTokens(args.promptText);
  const completionTokens = estimateTokens(args.completionText);
  const total = promptTokens + completionTokens;
  const pricing = PRICING_PER_1K[args.model] || { input: 0.0001, output: 0.0001 };
  const cost = (promptTokens * pricing.input + completionTokens * pricing.output) / 1000;

  const routeKey = `${args.provider}/${args.model}#${args.task}`;
  const r = _state.byRoute[routeKey] || { calls: 0, total: 0, prompt: 0, completion: 0, cost: 0 };

  const recentSpend = [
    ..._state.recentSpend,
    { ts: Date.now(), cost: Math.round(cost * 1e6) / 1e6, provider: args.provider },
  ].slice(-MAX_RECENT);

  _state = {
    ..._state,
    totalTokens: _state.totalTokens + total,
    promptTokens: _state.promptTokens + promptTokens,
    completionTokens: _state.completionTokens + completionTokens,
    lastCallTokens: total,
    lastCallCost: Math.round(cost * 1e6) / 1e6,
    totalCost: Math.round((_state.totalCost + cost) * 1e6) / 1e6,
    byRoute: {
      ..._state.byRoute,
      [routeKey]: {
        calls: r.calls + 1,
        total: r.total + total,
        prompt: r.prompt + promptTokens,
        completion: r.completion + completionTokens,
        cost: Math.round((r.cost + cost) * 1e6) / 1e6,
      },
    },
    lastUpdatedAt: Date.now(),
    recentSpend,
  };
  persist();
  return _state;
}

export function getDailySpend(windowMs = 24 * 60 * 60 * 1000): { total: number; byProvider: Record<string, number> } {
  const cutoff = Date.now() - windowMs;
  const recent = _state.recentSpend.filter((e) => e.ts >= cutoff);
  let total = 0;
  const byProvider: Record<string, number> = {};
  for (const e of recent) {
    total += e.cost;
    byProvider[e.provider] = (byProvider[e.provider] || 0) + e.cost;
  }
  return {
    total: Math.round(total * 1e6) / 1e6,
    byProvider: Object.fromEntries(Object.entries(byProvider).map(([k, v]) => [k, Math.round(v * 1e6) / 1e6])),
  };
}

export function formatCost(usd: number): string {
  if (usd === 0) return '$0';
  if (usd < 0.0001) return '<$0.0001';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

export function formatTokens(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}
