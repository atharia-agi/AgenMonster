// Performance Monitor — collects `performance.measure` entries from the
// agent loop and exposes them through a tiny pub/sub so Diagnostics can
// render latency KPIs without importing DOM-heavy APIs in tests.
//
// Measures currently emitted by `agentLoop.ts`:
//   - `agentLoop.turn.{N}`  : full turn latency
//   - `agentLoop.tool.{name}` : per-tool dispatch latency

export interface TurnMeasure {
  turn: number;
  durationMs: number;
  tools: ToolMeasure[];
}

export interface ToolMeasure {
  name: string;
  durationMs: number;
}

export interface PerformanceState {
  totalTurns: number;
  avgTurnMs: number;
  lastTurnMs: number;
  totalTools: number;
  avgToolMs: number;
  lastToolMs: number;
  slowestTool: { name: string; durationMs: number } | null;
  recentTurns: TurnMeasure[];
}

type Listener = (s: PerformanceState) => void;

const EMPTY: PerformanceState = {
  totalTurns: 0,
  avgTurnMs: 0,
  lastTurnMs: 0,
  totalTools: 0,
  avgToolMs: 0,
  lastToolMs: 0,
  slowestTool: null,
  recentTurns: [],
};

let _state = EMPTY;
const _listeners = new Set<Listener>();
const MAX_RECENT = 20;

function recompute() {
  const entries = performance.getEntriesByType('measure') as PerformanceEntry[];
  const turns: TurnMeasure[] = [];
  const tools: ToolMeasure[] = [];
  let currentTurn: TurnMeasure | null = null;
  let turnIndex = 0;

  for (const entry of entries) {
    const name = entry.name;
    if (name.startsWith('agentLoop.turn.')) {
      turnIndex++;
      currentTurn = { turn: turnIndex, durationMs: Math.round(entry.duration), tools: [] };
      turns.push(currentTurn);
    } else if (name.startsWith('agentLoop.tool.') && currentTurn) {
      const toolName = name.replace('agentLoop.tool.', '');
      const tool: ToolMeasure = { name: toolName, durationMs: Math.round(entry.duration) };
      tools.push(tool);
      currentTurn.tools.push(tool);
    }
  }

  const recentTurns = turns.slice(-MAX_RECENT);
  const lastTurn = turns[turns.length - 1];
  const lastTool = tools[tools.length - 1];
  const avgTurnMs = turns.length ? Math.round(turns.reduce((s, t) => s + t.durationMs, 0) / turns.length) : 0;
  const avgToolMs = tools.length ? Math.round(tools.reduce((s, t) => s + t.durationMs, 0) / tools.length) : 0;
  const slowest = tools.length ? tools.reduce((a, b) => (a.durationMs >= b.durationMs ? a : b)) : null;

  _state = {
    totalTurns: turns.length,
    avgTurnMs,
    lastTurnMs: lastTurn?.durationMs || 0,
    totalTools: tools.length,
    avgToolMs,
    lastToolMs: lastTool?.durationMs || 0,
    slowestTool: slowest ? { name: slowest.name, durationMs: slowest.durationMs } : null,
    recentTurns,
  };

  for (const l of _listeners) l(_state);
}

export function getPerformanceState(): PerformanceState {
  recompute();
  return _state;
}

export function subscribePerformance(fn: Listener): () => void {
  recompute();
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function resetPerformance() {
  _state = EMPTY;
  for (const l of _listeners) l(_state);
}

export function msLabel(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms >= 0) return `${ms}ms`;
  return '—';
}
