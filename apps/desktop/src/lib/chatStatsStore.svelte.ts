// Reactive bridge between ChatPanel and any panel that wants to display
// telemetry (Diagnostics, Settings → About).
//
// Uses a tiny pub/sub so the same module is importable from Node test runs
// (no Svelte runes) AND from .svelte files (where components subscribe on
// mount and store the latest snapshot in their own `$state`).

import { emptyStats, recordCall, msLabel, type ChatStatsState } from './chatStats.ts';

export type { ChatStatsState };

type ByRouteEntry = ChatStatsState['byRoute'][string];

type Listener = (s: ChatStatsState) => void;

let _state: ChatStatsState = emptyStats();
const _listeners = new Set<Listener>();

export function getChatStats(): ChatStatsState {
  return _state;
}

export function subscribeChatStats(fn: Listener): () => void {
  _listeners.add(fn);
  // Push the current snapshot on subscribe so consumers don't need a separate
  // getChatStats() call to render their initial UI.
  fn(_state);
  return () => _listeners.delete(fn);
}

export function pushChatCall(entry: { provider: string; model: string; task: string; ms: number; ok: boolean }) {
  _state = recordCall(_state, entry);
  for (const l of _listeners) l(_state);
  try { persistChatStats(); } catch {}
}

export function resetChatStats() {
  _state = emptyStats();
  for (const l of _listeners) l(_state);
}

const STORAGE_KEY = 'agenmonster_chat_stats';

export function persistChatStats() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch {}
}

export function hydrateChatStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as ChatStatsState;
    if (parsed && typeof parsed.totalCalls === 'number') {
      _state = parsed;
      for (const l of _listeners) l(_state);
    }
  } catch {}
}

export { msLabel };
