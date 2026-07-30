// Memory system — the agent's long-term brain.
// Three layers:
//   1. EpisodicMemory  — timestamped moments ("user fixed a bug", "user got frustrated at YAML parsers")
//   2. FactMemory       — key/value facts with confidence ("user.language = TS", "project.framework = sveltekit")
//   3. TopicAffinity    — lightweight interest counts per topic (TS, Python, AWS, ...) for routing priority
//
// All layers are persisted to localStorage under `agenmonster_memory`.
// The system prompt builder in ChatPanel consumes `getMemoriesForPrompt()` to
// inject the top-3 most relevant memories into every LLM call.

import { getFactImportance, importanceDecay, type FactImportance } from './importance.ts';

// ---------- types ----------

export interface Episode {
  id: string;
  ts: number;
  kind: 'success' | 'error' | 'milestone' | 'user_note' | 'preference' | 'lesson';
  title: string;
  detail: string;
  tags: string[];
  confidence: number; // 0-1
}

export interface Fact {
  key: string;
  value: string;
  confidence: number;
  updatedAt: number;
}

export interface TopicCount {
  topic: string;
  count: number;
  lastSeen: number;
}

export interface MemoryState {
  episodes: Episode[];
  facts: Record<string, Fact>;
  topics: TopicCount[];
  totalMemories: number;
  lastIndexedAt: number;
}

// ---------- keywords for auto-tagging ----------

const CODE_HINTS = /\b(function|bug|fix|error|compile|refactor|debug|typescript|javascript|python|rust|go|sql|regex|class|api|react|svelte|next|docker|aws|deploy|test|git|merge|conflict)\b/i;
const PREFERENCE_HINTS = /\b(prefer|instead|don't|always|never|skip|use|avoid|like|hate|wish|want|need)\b/i;

// ---------- defaults ----------

const STORAGE_KEY = 'agenmonster_memory';
const MAX_EPISODES = 200;
const MAX_FACTS = 60;
const MAX_TOPICS = 40;

function emptyState(): MemoryState {
  return {
    episodes: [],
    facts: {},
    topics: [],
    totalMemories: 0,
    lastIndexedAt: Date.now(),
  };
}

let _state: MemoryState = emptyState();
const _listeners = new Set<(s: MemoryState) => void>();
let _hydrated = false;

// ---------- persistence ----------

function load(): void {
  if (_hydrated) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) _state = JSON.parse(raw) as MemoryState;
  } catch {}
  _hydrated = true;
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch {}
}

let _persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist(): void {
  if (_persistTimer) return;
  _persistTimer = setTimeout(() => {
    _persistTimer = null;
    persist();
  }, 0);
}

let _notifyTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleNotify(): void {
  if (_notifyTimer) return;
  _notifyTimer = setTimeout(() => {
    _notifyTimer = null;
    const snapshot = _state;
    for (const fn of _listeners) fn(snapshot);
  }, 0);
}

// Flush any scheduled persist immediately. Call on beforeunload / visibilitychange
// so deferred writes are never lost when the tab closes or reloads.
export function flushMemoryNow(): void {
  if (_persistTimer) {
    clearTimeout(_persistTimer);
    _persistTimer = null;
    persist();
  }
  if (_notifyTimer) {
    clearTimeout(_notifyTimer);
    _notifyTimer = null;
    const snapshot = _state;
    for (const fn of _listeners) fn(snapshot);
  }
}

// ---------- public API ----------

export function getMemoryState(): MemoryState {
  load();
  return _state;
}

export function subscribeMemory(fn: (s: MemoryState) => void): () => void {
  load();
  fn(_state);
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function rememberEvent(partial: Omit<Episode, 'id' | 'ts'>): Episode {
  load();
  const text = [partial.title, partial.detail, ...partial.tags].join(' ').toLowerCase();
  const tags = partial.tags.length
    ? partial.tags
    : extractTags(partial.title + ' ' + partial.detail);
  const episode: Episode = {
    ...partial,
    id: crypto.randomUUID(),
    ts: Date.now(),
    tags,
  };
  _state.episodes = [episode, ..._state.episodes].slice(0, MAX_EPISODES);
  _state.totalMemories++;
  _state.lastIndexedAt = Date.now();
  bumpTopics(episode.tags);
  schedulePersist();
  scheduleNotify();
  return episode;
}

export function upsertFact(key: string, value: string, confidence = 0.9): void {
  // Legacy path: any key accepted. For schema-validated writes use
  // `upsertTypedFact` instead.
  load();
  const existing = _state.facts[key];
  const updatedAt = Date.now();
  _state.facts[key] = {
    key,
    value,
    confidence: existing ? Math.max(existing.confidence, confidence) : confidence,
    updatedAt,
  };
  _state.totalMemories++;
  _state.lastIndexedAt = updatedAt;
  schedulePersist();
  scheduleNotify();
}

// Typed variant: validates the key prefix + value shape via memoryOntology.
import { validateFact as _validateFact } from './memoryOntology.ts';

export function upsertTypedFact(key: string, value: string, confidence = 0.9): { ok: boolean; error?: string } {
  load();
  const result = _validateFact(key, value);
  if (!result.ok) return result;
  const existing = _state.facts[key];
  const updatedAt = Date.now();
  _state.facts[key] = {
    key,
    value: result.value!,
    confidence: existing ? Math.max(existing.confidence, confidence) : confidence,
    updatedAt,
  };
  _state.totalMemories++;
  _state.lastIndexedAt = updatedAt;
  schedulePersist();
  scheduleNotify();
  return { ok: true };
}

export function getFact(key: string): string | undefined {
  load();
  return _state.facts[key]?.value;
}

// Explicit fact reconsolidation: opt-in; each call bumps confidence +0.04
// (capped) and refreshes updatedAt. Consumers (e.g. system-prompt injection)
// call this when the fact is actually being used.
export function bumpFact(key: string): void {
  load();
  const f = _state.facts[key];
  if (!f) return;
  const imp = getFactImportance(key);
  f.confidence = Math.min(1, f.confidence + 0.04 * (imp.importance / 3));
  f.updatedAt = Date.now();
  schedulePersist();
  scheduleNotify();
}

export function exportMemoryJSON(includeContext = false): string {
  load();
  const base = {
    version: 1,
    exportedAt: new Date().toISOString(),
    state: _state,
  };
  if (includeContext) {
    return JSON.stringify({
      ...base,
      context: {
        exportedAt: new Date().toISOString(),
        totalMemories: _state.totalMemories,
        lastIndexedAt: _state.lastIndexedAt,
      },
    }, null, 2);
  }
  return JSON.stringify(base, null, 2);
}

export function importMemoryJSON(json: string): { ok: boolean; reason?: string } {
  load();
  try {
    const parsed = JSON.parse(json);
    if (parsed?.version !== 1) return { ok: false, reason: 'unsupported version' };
    const incoming = parsed?.state;
    if (!incoming || typeof incoming !== 'object') return { ok: false, reason: 'no state bag' };
    const episodes = Array.isArray(incoming.episodes) ? incoming.episodes : [];
    const facts = (incoming.facts && typeof incoming.facts === 'object') ? incoming.facts : {};
    const topics = Array.isArray(incoming.topics) ? incoming.topics : [];
    const maxEpisodes = 200;
    const maxTopics = 40;
    const maxFacts = 60;
    _state.episodes = episodes.slice(0, maxEpisodes);
    _state.facts = facts;
    _state.topics = topics.slice(0, maxTopics);
  _state.lastIndexedAt = Date.now();
  _state.totalMemories = _state.episodes.length + Object.keys(_state.facts).length;
  void maxFacts;
  schedulePersist();
  scheduleNotify();
  return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: e?.message || 'parse error' };
  }
}

export function forgetFact(key: string): void {
  load();
  delete _state.facts[key];
  schedulePersist();
  scheduleNotify();
}

export function forgetEpisode(id: string): boolean {
  load();
  const before = _state.episodes.length;
  _state.episodes = _state.episodes.filter((ep) => ep.id !== id);
  if (_state.episodes.length === before) return false;
  schedulePersist();
  scheduleNotify();
  return true;
}

export function searchMemory(query: string): { episodes: Episode[]; facts: Fact[] } {
  load();
  const lowered = query.toLowerCase();
  const episodes = _state.episodes.filter(
    (ep) =>
      ep.title.toLowerCase().includes(lowered) ||
      ep.detail.toLowerCase().includes(lowered) ||
      ep.tags.some((t) => t.toLowerCase().includes(lowered))
  );
  const facts = Object.values(_state.facts).filter(
    (f) => f.key.toLowerCase().includes(lowered) || f.value.toLowerCase().includes(lowered)
  );
  return { episodes, facts };
}

export function recordTopic(topic: string, count = 1): void {
  load();
  const existing = _state.topics.find((t) => t.topic === topic);
  if (existing) {
    existing.count += count;
    existing.lastSeen = Date.now();
  } else {
    _state.topics.push({ topic, count, lastSeen: Date.now() });
  }
  _state.topics.sort((a, b) => b.count - a.count);
  _state.topics = _state.topics.slice(0, MAX_TOPICS);
  schedulePersist();
  scheduleNotify();
}

export function getTopTopics(n = 8): TopicCount[] {
  load();
  return _state.topics.slice(0, n);
}

export function resetMemory(): void {
  _state = emptyState();
  persist();
  notify();
}

export function serializeMemoryMarkdown(): string {
  load();
  const lines: string[] = [];
  lines.push('# AgenMonster Memory Export');
  lines.push('');
  lines.push(`- Total memories: ${_state.totalMemories}`);
  lines.push(`- Episodes: ${_state.episodes.length}`);
  lines.push(`- Facts: ${Object.keys(_state.facts).length}`);
  lines.push(`- Last indexed: ${new Date(_state.lastIndexedAt).toISOString()}`);
  lines.push('');

  if (_state.topics.length) {
    lines.push('## Top Topics');
    for (const t of _state.topics.slice(0, 20)) {
      lines.push(`- ${t.topic}: ${t.count}`);
    }
    lines.push('');
  }

  if (Object.keys(_state.facts).length) {
    lines.push('## Facts');
    for (const f of Object.values(_state.facts)) {
      lines.push(`- **${f.key}** = ${f.value} (confidence ${(f.confidence * 100).toFixed(0)}%)`);
    }
    lines.push('');
  }

  if (_state.episodes.length) {
    lines.push('## Episodes');
    for (const ep of _state.episodes) {
      lines.push(`- [${ep.kind}] ${ep.title}: ${ep.detail} (${new Date(ep.ts).toISOString()})`);
    }
  }

  return lines.join('\n');
}

export function downloadMemoryMarkdown(filename = `agenmonster-memory-${Date.now()}.md`): void {
  if (typeof window === 'undefined') return;
  const md = serializeMemoryMarkdown();
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- retrieval for system prompt ----------

export function getMemoriesForPrompt(text: string, limit = 3): string[] {
  load();
  if (!_state.episodes.length) return [];
  const lowered = text.toLowerCase();
  const keywords = lowered.split(/[\s,;.!?]+/).filter((w) => w.length > 3);
  const now = Date.now();
  const scored = _state.episodes.map((ep) => {
    let score = 0;
    for (const kw of keywords) {
      if (ep.title.toLowerCase().includes(kw)) score += 2;
      if (ep.detail.toLowerCase().includes(kw)) score += 1;
      if (ep.tags.some((t) => t.toLowerCase().includes(kw))) score += 3;
    }
    const ageDays = (now - ep.ts) / (1000 * 60 * 60 * 24);
    const decay = ageDays > 30 ? 0.25 : ageDays > 7 ? 0.5 : 1.0;
    score *= ep.confidence * decay;
    return { ep, score };
  });
  const top = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  if (top.length === 0) return [];

  const ids = new Set(top.map(({ ep }) => ep.id));
  for (const ep of top) {
    const idx = _state.episodes.findIndex((e) => e.id === ep.ep.id);
    if (idx >= 0) {
      _state.episodes[idx] = { ..._state.episodes[idx], confidence: Math.min(1, _state.episodes[idx].confidence + 0.06) };
    }
  }
  _state.lastIndexedAt = Date.now();
  schedulePersist();
  scheduleNotify();

  return top.map(({ ep }) => `[${ep.kind}] ${ep.title}: ${ep.detail}`);
}

export function recallTopEpisodes(limit = 6): Episode[] {
  load();
  return _state.episodes.slice(0, limit);
}

export function forgetStaleEpisodes(maxAgeMs = 60 * 24 * 60 * 60 * 1000): number {
  load();
  const cutoff = Date.now() - maxAgeMs;
  const before = _state.episodes.length;
  _state.episodes = _state.episodes.filter((ep) => ep.ts >= cutoff);
  const removed = before - _state.episodes.length;
  if (removed > 0) {
    schedulePersist();
    scheduleNotify();
  }
  return removed;
}

// ---------- persona ----------

const PERSONA_KEY = '__persona';
const PERSONA_STORAGE = 'agenmonster_persona';

export function setPersona(text: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (text && text.trim()) localStorage.setItem(PERSONA_STORAGE, text);
    else localStorage.removeItem(PERSONA_STORAGE);
  } catch {}
  if (_state.facts[PERSONA_KEY]) {
    delete _state.facts[PERSONA_KEY];
    scheduleNotify();
  }
}

export function getPersona(): string {
  if (typeof localStorage === 'undefined') return _state.facts[PERSONA_KEY]?.value || '';
  try {
    const saved = localStorage.getItem(PERSONA_STORAGE);
    if (saved) return saved;
    return _state.facts[PERSONA_KEY]?.value || '';
  } catch {
    return '';
  }
}

export const PERSONA_PRESETS: Record<string, string> = {
  terse: 'Be terse. One sentence max. No filler words.',
  helpful: 'Be helpful. Explain step by step. Be thorough and friendly.',
  sarcastic: 'Be witty and dry. Mild sarcasm allowed. Stay clever.',
  indonesian: 'Always reply in Indonesian.',
  pirate: 'Talk like a cheerful pirate. Arr!',
};

export type PersonaPreset = keyof typeof PERSONA_PRESETS;

export function setPersonaPreset(preset: PersonaPreset | string): void {
  const text = PERSONA_PRESETS[preset];
  if (typeof text === 'undefined') return setPersona(preset);
  setPersona(text);
}

export function iterateDecay(): void {
  load();
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const WEEK = 7 * DAY;
  _state.episodes = _state.episodes.filter((ep) => {
    const age = now - ep.ts;
    if (age > WEEK && ep.confidence <= 0.3) return false;
    if (age > 30 * DAY && ep.kind !== 'milestone' && ep.kind !== 'lesson') return false;
    return true;
  });
  const facts = Object.values(_state.facts);
  for (const f of facts) {
    const age = f.updatedAt ? now - f.updatedAt : 0;
    if (age > 0) {
      const imp = getFactImportance(f.key);
      const decayRate = importanceDecay(0.05, imp.importance);
      f.confidence = Math.max(imp.minConfidence, f.confidence - decayRate);
    }
    if (f.confidence <= 0.1) delete _state.facts[f.key];
  }
  _state.lastIndexedAt = now;
  schedulePersist();
  scheduleNotify();
}

export { MAX_EPISODES, MAX_FACTS, MAX_TOPICS };

// ---------- helpers ----------

function extractTags(text: string): string[] {
  const tags: string[] = [];
  const lower = text.toLowerCase();
  const candidates = ['python', 'typescript', 'javascript', 'rust', 'go', 'sql',
    'react', 'svelte', 'next', 'docker', 'aws', 'deploy', 'test', 'git',
    'bug', 'debug', 'refactor', 'api', 'cli', 'mcp', 'stream', 'cache',
    'perf', 'auth', 'database', 'frontend', 'backend', 'ci', 'cd'];
  for (const c of candidates) {
    if (lower.includes(c)) tags.push(c);
  }
  if (PREFERENCE_HINTS.test(text)) tags.push('preference');
  if (CODE_HINTS.test(text)) tags.push('code');
  return tags.slice(0, 6);
}

function bumpTopics(tags: string[]): void {
  for (const t of tags) recordTopic(t, 1);
}

function notify(): void {
  for (const fn of _listeners) fn(_state);
}
