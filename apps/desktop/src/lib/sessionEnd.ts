// Session-end reflection — compress the current session into a single
// `milestone` episode so future-you (or the agent) can recall what was
// happening today. Pure logic: takes a snapshot of recent chat messages,
// recent memory activity, and the top topics, and returns a summary
// string + suggested tags.
//
// The hook lives in `sessionEndHook.ts` (DOM-bound). This module is
// pure and testable.

export interface SessionSnapshot {
  topTopics: Array<{ topic: string; count: number }>;
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>;
  startedAt: number;
  endedAt: number;
}

export interface SessionSummary {
  title: string;
  detail: string;
  tags: string[];
  messageCount: number;
  durationMin: number;
}

export function buildSessionSummary(snap: SessionSnapshot): SessionSummary {
  const duration = Math.max(0, snap.endedAt - snap.startedAt);
  const durationMin = Math.round(duration / 60000);
  const msgCount = snap.recentMessages.length;
  const lastFew = snap.recentMessages.slice(-4);
  const lastSamples = lastFew
    .filter((m) => m.content && m.content.trim().length > 0)
    .map((m) => `${m.role === 'user' ? 'U' : 'A'}:${m.content.slice(0, 80).replace(/\s+/g, ' ')}`)
    .join(' | ');

  const topicLine =
    snap.topTopics.length > 0
      ? `Topics: ${snap.topTopics.slice(0, 5).map((t) => `${t.topic}(${t.count})`).join(', ')}.`
      : '';

  const title = `Session: ${msgCount} msgs · ${durationMin}m`;
  const detail =
    `Closed automatically. ` +
    topicLine +
    (lastSamples ? ` Last: ${lastSamples}` : '');
  const tags = ['session', 'auto', ...snap.topTopics.slice(0, 3).map((t) => t.topic)].slice(0, 6);

  return { title, detail, tags, messageCount: msgCount, durationMin };
}

export interface HookOptions {
  snapshot: SessionSnapshot;
  persist: (title: string, detail: string, tags: string[]) => void;
  onFire?: (s: SessionSummary) => void;
  dailyRecap?: (messageCount: number, goalsCompleted: number) => void;
}

// Build a hook that compresses the session once when triggered.
// Returns a `disposer()` to remove listeners and timers.
export function installSessionEndHook(opts: HookOptions): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => {};

  let fired = false;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  const IDLE_MS = 30 * 60 * 1000;

  const fire = () => {
    if (fired) return;
    fired = true;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
    const summary = buildSessionSummary(opts.snapshot);
    opts.persist(summary.title, summary.detail, summary.tags);
    opts.dailyRecap?.(summary.messageCount, 0);
    opts.onFire?.(summary);
  };

  const resetIdle = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(fire, IDLE_MS);
  };

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') fire();
    else resetIdle();
  };

  const onPageHide = () => fire();

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);

  // Bootstrap idle timer.
  resetIdle();

  return () => {
    if (idleTimer) clearTimeout(idleTimer);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
  };
}
