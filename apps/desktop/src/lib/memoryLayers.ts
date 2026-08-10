// memoryLayers — layered memory architecture for the companion brain.
//
// Instead of a single "2D vector space", memory is organised as TOWERING,
// recursively-consolidated LAYERS — mirroring how human memory stores the same
// fact isomorphically at multiple depths:
//
//   working   (0)  current turn / active scratchpad (ephemeral, highest salience)
//   shortTerm (1)  recent episodes + memories (localStorage, fresh, low cost)
//   semantic  (2)  entity graph + spreading-activation retrieval (memoryGraph)
//   episodic  (3)  causal chains (causalMemory) — why things happened
//   vault     (4)  SecondBrain permanent store (secondbrain.remember/graduate)
//
// Retrieval walks shallow→deep and fuses hits with per-layer salience + decay.
// Consolidation pushes crystallized facts DOWN the towers (short→semantic→
// episodic→vault) so "graduate" actually promotes a memory to a durable layer.
//
// Pure + testable: retrieval reads from injected resolvers; the vault bridge is
// an injectable async callback so it never blocks the UI and is easy to mock.

export type MemoryLayerName = 'working' | 'shortTerm' | 'semantic' | 'episodic' | 'vault';

export interface MemoryHit {
  layer: MemoryLayerName;
  text: string;
  /** Pre-ranked relevance 0-1 from the source layer. */
  relevance: number;
  /** Decayed salience after applying cross-layer decay. */
  score: number;
  ts?: number;
  meta?: Record<string, unknown>;
}

export interface LayerResolver {
  working?: (query: string) => MemoryHit[];
  shortTerm?: (query: string) => MemoryHit[];
  semantic?: (query: string) => MemoryHit[];
  episodic?: (query: string) => MemoryHit[];
  vault?: (query: string) => Promise<MemoryHit[]>;
}

export interface LayerConfig {
  topicalWeight: number;
  decayMs: number;
  floor: number;
  order: number;
  weight: number;
}

export const LAYER_CONFIG: Record<MemoryLayerName, LayerConfig> = {
  working: { topicalWeight: 1.0, decayMs: 1000 * 60 * 10, floor: 0.9, order: 0, weight: 0.9 },
  shortTerm: { topicalWeight: 0.9, decayMs: 1000 * 60 * 60 * 48, floor: 0.15, order: 1, weight: 0.7 },
  semantic: { topicalWeight: 0.8, decayMs: 1000 * 60 * 60 * 24 * 30, floor: 0.1, order: 2, weight: 0.8 },
  episodic: { topicalWeight: 0.85, decayMs: 1000 * 60 * 60 * 24 * 90, floor: 0.1, order: 3, weight: 0.85 },
  vault: { topicalWeight: 0.75, decayMs: 1000 * 60 * 60 * 24 * 365, floor: 0.05, order: 4, weight: 0.95 },
};

export type LayerWeightsOption = Partial<Record<MemoryLayerName, Partial<LayerConfig>>>;

const LAYER_ORDER: MemoryLayerName[] = ['working', 'shortTerm', 'semantic', 'episodic', 'vault'];

function now(): number {
  return Date.now();
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function textSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const inter = ta.filter((t) => tb.includes(t)).length;
  return inter / Math.max(1, Math.sqrt(ta.length * tb.length));
}

const STOP = new Set(['the','a','an','to','of','in','on','for','with','is','and','or','it','this','that','was','were','i','you','me','my']);
function tokens(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w));
}

function effectiveConfig(opt?: LayerWeightsOption): Record<MemoryLayerName, LayerConfig> {
  const base = { ...LAYER_CONFIG };
  if (opt) {
    for (const layer of Object.keys(opt) as MemoryLayerName[]) {
      const o = opt[layer];
      if (o) base[layer] = { ...base[layer], ...o };
    }
  }
  return base;
}

/**
 * Fuse hits from many layers into one ranked, de-duplicated list.
 */
export function fuseLayers(
  hitsByLayer: Record<MemoryLayerName, MemoryHit[]>,
  overrides?: LayerWeightsOption,
): MemoryHit[] {
  const cfg = effectiveConfig(overrides);
  const nowTs = now();
  const ranked: MemoryHit[] = [];

  for (const layer of LAYER_ORDER) {
    const c = cfg[layer];
    for (const raw of hitsByLayer[layer] ?? []) {
      const ageMs = Math.max(0, nowTs - (raw.ts ?? nowTs));
      const survival = c.decayMs === 0 ? 1 : Math.exp(-ageMs / c.decayMs);
      const topical = clamp01(raw.relevance) * c.topicalWeight;
      const floorShare = topical > 0 ? clamp01(raw.relevance) * c.floor : 0;
      const score = clamp01((topical + floorShare) * c.weight * survival);
      ranked.push({ layer, text: raw.text, relevance: clamp01(raw.relevance), score, ts: raw.ts, meta: raw.meta });
    }
  }

  const seen = new Set<string>();
  const out: MemoryHit[] = [];
  for (const hit of ranked.sort((a, b) => b.score - a.score)) {
    const key = hit.text.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
  }
  return out;
}

/**
 * Rank plain-text items by topical overlap with the query, for layers that
 * can't rank internally.
 */
export function scoreBySimilarity(query: string, items: string[], layer: MemoryLayerName): MemoryHit[] {
  const ts = now();
  return items
    .map((text, i) => ({ layer, text, relevance: textSimilarity(query, text), score: 0, ts: ts - i * 1000 }))
    .filter((h) => h.relevance > 0);
}

/**
 * Core entry point — run the whole tower retrieval for a query.
 */
export async function retrieveLayered(
  query: string,
  resolvers: LayerResolver,
  overrides?: LayerWeightsOption,
): Promise<MemoryHit[]> {
  const byLayer: Record<MemoryLayerName, MemoryHit[]> = {
    working: [], shortTerm: [], semantic: [], episodic: [], vault: [],
  };

  if (resolvers.working) byLayer.working = resolvers.working(query);
  if (resolvers.shortTerm) byLayer.shortTerm = resolvers.shortTerm(query);
  if (resolvers.semantic) byLayer.semantic = resolvers.semantic(query);
  if (resolvers.episodic) byLayer.episodic = resolvers.episodic(query);
  if (resolvers.vault) {
    try {
      byLayer.vault = await resolvers.vault(query);
    } catch {
      byLayer.vault = [];
    }
  }

  return fuseLayers(byLayer, overrides);
}

export { fuseLayers as __fuseLayers };