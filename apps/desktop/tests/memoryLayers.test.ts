// memoryLayers — tests for the layered (towering) memory architecture.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fuseLayers,
  retrieveLayered,
  scoreBySimilarity,
  textSimilarity,
  LAYER_CONFIG,
  type MemoryHit,
  type MemoryLayerName,
} from '../src/lib/memoryLayers.ts';

function hits(layer: MemoryLayerName, texts: string[], relevance = 0.8): MemoryHit[] {
  return texts.map((text, i) => ({ layer, text, relevance, score: 0, ts: Date.now() - i * 1000 }));
}

test('fuseLayers ranks deep durable layers higher on a topical match', () => {
  const fused = fuseLayers({
    working: [],
    shortTerm: hits('shortTerm', ['working note about goals'], 0.9),
    semantic: [],
    episodic: [],
    vault: hits('vault', ['permanent lesson about goals'], 0.9),
  });
  assert.ok(fused.length >= 1);
  const vaultHit = fused.find((h) => h.layer === 'vault');
  const shortHit = fused.find((h) => h.layer === 'shortTerm');
  assert.ok(vaultHit && shortHit, 'both layers surfaced');
  // vault weight (0.95) > shortTerm weight (0.7) → higher score
  assert.ok(vaultHit.score > shortHit.score);
});

test('fuseLayers de-duplicates the same memory at many depths', () => {
  const text = 'user prefers dark mode';
  const fused = fuseLayers({
    working: hits('working', [text]),
    shortTerm: [],
    semantic: hits('semantic', [text]),
    episodic: [],
    vault: hits('vault', [text]),
  });
  assert.equal(fused.length, 1, 'same text counted once regardless of layer');
});

test('fuseLayers applies decay so old hits fade', () => {
  const old = [{ layer: 'shortTerm' as MemoryLayerName, text: 'old fact', relevance: 0.9, score: 0, ts: Date.now() - 1000 * 60 * 60 * 96 }];
  const fresh = [{ layer: 'shortTerm' as MemoryLayerName, text: 'fresh fact', relevance: 0.9, score: 0, ts: Date.now() }];
  const fused = fuseLayers({ working: [], shortTerm: [...old, ...fresh], semantic: [], episodic: [], vault: [] });
  const freshHit = fused.find((h) => h.text === 'fresh fact');
  const oldHit = fused.find((h) => h.text === 'old fact');
  assert.ok(freshHit && oldHit);
  assert.ok(freshHit.score > oldHit.score, 'fresh outranks decayed');
});

test('scoreBySimilarity ranks plain text by topical overlap', () => {
  const ranked = scoreBySimilarity('build the rust server', ['how to deploy rust services', 'cooking pasta recipe'], 'shortTerm');
  assert.ok(ranked.length === 1);
  assert.equal(ranked[0].layer, 'shortTerm');
});

test('retrieveLayered walks the full tower including async vault', async () => {
  const resolved: MemoryHit[] = [];
  const out = await retrieveLayered('memory graph query', {
    working: (q) => hits('working', [`working: ${q}`]),
    shortTerm: (q) => hits('shortTerm', [`short: ${q}`]),
    semantic: (q) => hits('semantic', [`semantic: ${q}`]),
    episodic: (q) => hits('episodic', [`episodic: ${q}`]),
    vault: async (q) => {
      resolved.push(hits('vault', [`vault: ${q}`])[0]);
      return ['vault: memory graph query'].map((text) => ({ layer: 'vault' as MemoryLayerName, text, relevance: 1, score: 0 }));
    },
  });
  assert.ok(out.length >= 5, 'all five layers contributed');
  assert.ok(resolved.length === 1, 'async vault resolver awaited once');
  const layers = new Set(out.map((h) => h.layer));
  assert.deepEqual([...layers].sort(), ['episodic', 'semantic', 'shortTerm', 'vault', 'working']);
});

test('textSimilarity: exact keywords give higher overlap than unrelated', () => {
  assert.ok(textSimilarity('project alpha deploy', 'project alpha deploy fix') >
    textSimilarity('project alpha deploy', 'cooking breakfast routine'));
});

test('LAYER_CONFIG as-total order: vault is the deepest layer', () => {
  assert.equal(LAYER_CONFIG.vault.order, 4);
  assert.ok(LAYER_CONFIG.vault.decayMs > LAYER_CONFIG.shortTerm.decayMs);
});