// Causal Memory — episodic causal chains (trigger → goal → approach → outcome → lesson).
//
// Records *why* things happened, not just *what* happened. Each chain captures the
// causal arc of a completed episode so the agent can (a) predict outcomes from
// triggers, (b) reuse proven approaches, and (c) retrieve lessons by outcome.
//
// Pure + testable. Persists to localStorage under `agenmonster_causal_memory`.
// Causal chains can be built from the agent's goal/tool logs and from DreamCycle
// consolidation output.

export interface CausalChain {
  id: string;
  trigger: string;          // the initiating condition / user request
  goal: string;             // what was intended
  approach: string[];       // steps taken
  outcome: 'success' | 'partial' | 'fail';
  lesson: string;           // crystallized takeaway
  tags: string[];
  confidence: number;       // 0-1
  ts: number;
  occurrences: number;      // how many times this arc recurred
  lastSeen: number;
}

export interface CausalMemoryState {
  chains: CausalChain[];
}

export interface CausalChainInput {
  trigger: string;
  goal: string;
  approach: string[];
  outcome: CausalChain['outcome'];
  lesson?: string;
  tags?: string[];
  confidence?: number;
  ts?: number;
}

const STORAGE_KEY = 'agenmonster_causal_memory';
const MAX_CHAINS = 120;

const SIMILARITY_STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with',
  'fix', 'error', 'bug', 'about', 'this', 'that', 'was', 'were', 'using',
]);

export function createCausalMemoryState(): CausalMemoryState {
  return { chains: [] };
}

// ---------- similarity / matching ----------

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !SIMILARITY_STOP_WORDS.has(w));
}

function cosineSimilarity(a: string, b: string): number {
  const wa = tokenize(a);
  const wb = tokenize(b);
  if (wa.length === 0 || wb.length === 0) return 0;
  const set = new Set([...wa, ...wb]);
  let inter = 0;
  for (const w of wa) if (wb.includes(w)) inter++;
  const norm = Math.sqrt(wa.length * wb.length);
  return inter / Math.max(norm, 0.0001);
}

// ---------- record / merge ----------

// Record a causal chain. Chains that are causally similar (same trigger+outcome)
// are merged (occurrences incremented, approach merged, confidence blended).
export function recordCausalChain(state: CausalMemoryState, input: CausalChainInput, now = Date.now()): CausalChain {
  const confidence = Math.max(0, Math.min(1, input.confidence ?? 0.7));

  // Try to merge with an existing chain that shares the arc.
  const merge = findMergeCandidate(state, input, now);
  if (merge) {
    const mergedApproach = [...new Set([...merge.approach, ...input.approach])].slice(0, 12);
    const merged: CausalChain = {
      ...merge,
      approach: mergedApproach,
      lesson: input.lesson || merge.lesson,
      confidence: Math.min(1, (merge.confidence * merge.occurrences + confidence) / (merge.occurrences + 1)),
      occurrences: merge.occurrences + 1,
      lastSeen: now,
      ts: merge.ts,
    };
    const idx = state.chains.findIndex((c) => c.id === merge.id);
    if (idx >= 0) state.chains[idx] = merged;
    return merged;
  }

  const chain: CausalChain = {
    id: `causal-${now}-${Math.random().toString(36).slice(2, 8)}`,
    trigger: input.trigger,
    goal: input.goal,
    approach: input.approach.slice(0, 12),
    outcome: input.outcome,
    lesson: input.lesson ?? '',
    tags: input.tags ?? [],
    confidence,
    ts: now,
    occurrences: 1,
    lastSeen: now,
  };
  state.chains.push(chain);

  // Cap memory size (drop oldest/weakest).
  if (state.chains.length > MAX_CHAINS) {
    state.chains.sort((a, b) => a.lastSeen - b.lastSeen || a.confidence - b.confidence);
    state.chains = state.chains.slice(-MAX_CHAINS);
  }
  return chain;
}

function findMergeCandidate(state: CausalMemoryState, input: CausalChainInput, now: number): CausalChain | undefined {
  for (const chain of state.chains) {
    const triggerSim = cosineSimilarity(chain.trigger, input.trigger);
    const goalSim = cosineSimilarity(chain.goal, input.goal);
    if (chain.outcome === input.outcome && triggerSim >= 0.5 && goalSim >= 0.3) {
      return chain;
    }
  }
  return undefined;
}

// ---------- retrieval ----------

export function findChainsByTrigger(state: CausalMemoryState, trigger: string, limit = 5): CausalChain[] {
  return state.chains
    .map((c) => ({ c, score: cosineSimilarity(c.trigger, trigger) }))
    .filter((x) => x.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.c);
}

// Retrieve chains whose *outcome* matches — used to predict risk before acting.
export function findChainsByOutcome(state: CausalMemoryState, outcome: CausalChain['outcome'], limit = 10): CausalChain[] {
  return state.chains
    .filter((c) => c.outcome === outcome)
    .sort((a, b) => b.confidence - a.confidence || b.occurrences - a.occurrences)
    .slice(0, limit);
}

export function getLessonsForQuery(state: CausalMemoryState, query: string, limit = 5): CausalChain[] {
  return state.chains
    .filter((c) => c.lesson)
    .map((c) => ({ c, score: cosineSimilarity(c.lesson, query) + cosineSimilarity(c.trigger, query) }))
    .filter((x) => x.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.c);
}

// Predict the likely outcome for a trigger by looking at past causal arcs.
export function predictOutcome(state: CausalMemoryState, trigger: string): { outcome: CausalChain['outcome']; confidence: number } | null {
  const matches = state.chains
    .map((c) => ({ c, score: cosineSimilarity(c.trigger, trigger) }))
    .filter((x) => x.score >= 0.4)
    .sort((a, b) => b.score - a.score);

  if (matches.length === 0) return null;

  const weights = { success: 0, partial: 0, fail: 0 };
  for (const { c, score } of matches) {
    weights[c.outcome] += score * c.confidence;
  }
  const total = weights.success + weights.partial + weights.fail;
  if (total <= 0) return null;

  let bestOutcome: CausalChain['outcome'] = 'success';
  let bestWeight = 0;
  for (const [outcome, weight] of Object.entries(weights) as [CausalChain['outcome'], number][]) {
    if (weight > bestWeight) {
      bestWeight = weight;
      bestOutcome = outcome;
    }
  }
  return { outcome: bestOutcome, confidence: bestWeight / total };
}

// Compose a human-readable narrative for the causal memory.
export function formatCausalChain(chain: CausalChain): string {
  const approach = chain.approach.length ? chain.approach.map((s, i) => `${i + 1}. ${s}`).join('\n') : '(no steps recorded)';
  const lesson = chain.lesson ? `\nLesson: ${chain.lesson}` : '';
  return `Trigger: ${chain.trigger}\nGoal: ${chain.goal}\nOutcome: ${chain.outcome}\nApproach:\n${approach}${lesson}`;
}

export function serializeCausalMemory(state: CausalMemoryState): string {
  return JSON.stringify(state);
}

// ---------- persistence ----------

export function persistCausalMemory(state: CausalMemoryState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — skip
  }
}

export function loadCausalMemory(): CausalMemoryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CausalMemoryState;
      if (parsed && Array.isArray(parsed.chains)) return parsed;
    }
  } catch {
    // fall through to fresh state
  }
  return createCausalMemoryState();
}

export function clearCausalMemory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
