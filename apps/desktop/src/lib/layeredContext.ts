// layeredContext — bridge between the tower memory architecture and the app.
//
// Provides real resolvers for each memory layer (working / shortTerm /
// semantic / episodic / vault) backed by the in-app engines, plus a
// consolidation function that PROMOTES a crystallized fact down the towers
// into the SecondBrain vault via the /api/mcp bridge. This makes SecondBrain
// a genuine permanent memory layer rather than a disconnected tool set.
//
// Pure where possible; vault calls are async and failure-isolated.

import { retrieveLayered, scoreBySimilarity, type MemoryHit, type MemoryLayerName } from './memoryLayers.ts';
import { getMemoryState, getTopTopics } from './memory.ts';
import { retrieveBySpreadingActivation } from './memoryGraph.ts';
import { loadCausalMemory, getLessonsForQuery } from './causalMemory.ts';

export interface LayeredContext {
  query: string;
  hits: MemoryHit[];
  /** Layers that actually contributed. */
  contributed: MemoryLayerName[];
  /** Flat text for prompt injection. */
  text: string;
}

/** Keep the persisted last conversation to seed the working layer. */
const WORKING_KEY = 'agenmonster_working_mem';
export function setWorkingMemory(text: string): void {
  try {
    const arr: string[] = JSON.parse(localStorage.getItem(WORKING_KEY) || '[]');
    arr.push(text.slice(0, 200));
    localStorage.setItem(WORKING_KEY, JSON.stringify(arr.slice(-12)));
  } catch {}
}
export function getWorkingMemory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(WORKING_KEY) || '[]');
  } catch {
    return [];
  }
}

/** SecondBrain vault bridge — async, isolated; returns [] on any failure. */
async function vaultSearch(query: string): Promise<MemoryHit[]> {
  try {
    const resp = await fetch('/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'secondbrain.recall', params: { query } }),
    });
    if (!resp.ok) return [];
    const json = await resp.json();
    if (!json.ok || json.data == null) return [];
    const texts: string[] = [];
    const data = json.data;
    if (typeof data === 'string') texts.push(data);
    else if (Array.isArray(data)) {
      for (const item of data) {
        const s = typeof item === 'string' ? item : item?.text ?? item?.title ?? item?.content;
        if (typeof s === 'string' && s.trim()) texts.push(s);
      }
    } else if (typeof data === 'object') {
      for (const v of Object.values(data)) {
        if (typeof v === 'string' && v.trim()) texts.push(v);
      }
    }
    return scoreBySimilarity(query, texts.slice(0, 8), 'vault');
  } catch {
    return [];
  }
}

/** Promote a crystallized fact into the permanent vault layer. */
export async function consolidateToVault(fact: string, tags: string[] = []): Promise<boolean> {
  try {
    const resp = await fetch('/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'secondbrain.remember',
        params: { text: fact, tags },
      }),
    });
    if (!resp.ok) return false;
    const json = await resp.json();
    return !!json?.ok;
  } catch {
    return false;
  }
}

/**
 * Run the whole memory tower for a query using real in-app engines.
 * `includeVault` gates the slow external bridge (default on in browser).
 */
export async function buildLayeredContext(query: string, includeVault = true): Promise<LayeredContext> {
  const hits = await retrieveLayered(query, {
    working: () => scoreBySimilarity(query, getWorkingMemory(), 'working'),
    shortTerm: () => {
      const mem = getMemoryState();
      const items = [
        ...getTopTopics(5).map((t) => `${t.topic}: ${t.count} mentions`),
        ...mem.episodes.slice(-5).map((e) => `[episode] ${e.title}: ${e.detail}`),
      ];
      return scoreBySimilarity(query, items, 'shortTerm');
    },
    semantic: () => {
      const r = retrieveBySpreadingActivation(query, { topK: 4 });
      const items: string[] = [];
      for (const ep of r.episodes) items.push(`[episode] ${ep.title}: ${ep.detail}`);
      for (const f of r.facts) items.push(`[fact] ${f.key}: ${f.value}`);
      return scoreBySimilarity(query, items, 'semantic');
    },
    episodic: () => {
      const causal = loadCausalMemory();
      const chains = getLessonsForQuery(causal, query, 4);
      return chains.map((c) => ({
        layer: 'episodic' as MemoryLayerName,
        text: `[lesson] ${c.lesson}`,
        relevance: 0.9,
        score: 0,
        ts: c.lastSeen,
        meta: { outcome: c.outcome, occurrences: c.occurrences },
      }));
    },
    vault: includeVault ? vaultSearch : undefined,
  });

  const contributed = [...new Set(hits.map((h) => h.layer))];
  const text = hits
    .slice(0, 8)
    .map((h) => `[${h.layer}] ${h.text}`)
    .join('\n');

  return { query, hits, contributed, text };
}

export type { MemoryHit };
