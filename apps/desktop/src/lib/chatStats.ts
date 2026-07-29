// ChatStats: tiny, pure, dependency-free runtime telemetry for the LLM loop.
// Records every request's outcome (ms, route, ok/error) and rolls a moving
// average over the most recent N entries so the UI can show "last call took
// 1.2s, rolling avg 950ms" without storing anything heavy.

export type Route = { provider: string; model: string; task: string };
export type StatEntry = { ts: number; provider: string; model: string; task: string; ms: number; ok: boolean };

export interface ChatStatsState {
  entries: StatEntry[];
  byRoute: Record<string, { calls: number; successes: number; failures: number; msAvg: number; msLast: number }>;
  totalCalls: number;
  totalSuccess: number;
  totalFail: number;
  lastMs: number;
  lastOk: boolean;
  rollingMsAvg: number;
}

export function emptyStats(): ChatStatsState {
  return {
    entries: [],
    byRoute: {},
    totalCalls: 0,
    totalSuccess: 0,
    totalFail: 0,
    lastMs: 0,
    lastOk: false,
    rollingMsAvg: 0,
  };
}

export function recordCall(state: ChatStatsState, e: Omit<StatEntry, 'ts'>): ChatStatsState {
  const entry: StatEntry = { ...e, ts: Date.now() };
  const byRoute = { ...state.byRoute };
  const key = `${entry.provider}/${entry.model}#${entry.task}`;
  const prev = byRoute[key] ?? { calls: 0, successes: 0, failures: 0, msAvg: 0, msLast: 0 };
  const calls = prev.calls + 1;
  // Exponential moving average with alpha=0.3 so a single spike does not
  // dominate, but recent slowness is reflected within ~5 calls.
  const msAvg = prev.calls === 0 ? entry.ms : prev.msAvg * 0.7 + entry.ms * 0.3;
  byRoute[key] = {
    calls,
    successes: prev.successes + (entry.ok ? 1 : 0),
    failures: prev.failures + (entry.ok ? 0 : 1),
    msAvg: Math.round(msAvg * 10) / 10,
    msLast: Math.round(entry.ms * 10) / 10,
  };
  const entries = [entry, ...state.entries].slice(0, 50);
  // 20-call rolling mean of the entries we actually kept (last 50 covers most).
  const sample = entries.slice(0, 20);
  const rollingMsAvg = sample.length === 0 ? 0 : Math.round((sample.reduce((a, b) => a + b.ms, 0) / sample.length) * 10) / 10;
  return {
    entries,
    byRoute,
    totalCalls: state.totalCalls + 1,
    totalSuccess: state.totalSuccess + (entry.ok ? 1 : 0),
    totalFail: state.totalFail + (entry.ok ? 0 : 1),
    lastMs: Math.round(entry.ms * 10) / 10,
    lastOk: entry.ok,
    rollingMsAvg,
  };
}

export function routeKey(r: { provider: string; model: string; task: string }): string {
  return `${r.provider}/${r.model}#${r.task}`;
}

export function msLabel(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
