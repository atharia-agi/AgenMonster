import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorldGraph, addEntity, link, persistWorldGraph, loadWorldGraph } from '../src/lib/worldModelGraph.ts';

// Minimal localStorage mock so persistence is exercisable under node:test.
class MemStorage {
  store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, v); }
  removeItem(k: string) { this.store.delete(k); }
}
const mem = new MemStorage();
(globalThis as any).localStorage = mem;

test('persist/load world graph round-trips', () => {
  let g = createWorldGraph();
  g = addEntity(g, { id: 'a', type: 'concept', label: 'A' });
  g = addEntity(g, { id: 'b', type: 'concept', label: 'B' });
  g = link(g, 'a', 'b', 'owns');
  persistWorldGraph(g);
  const loaded = loadWorldGraph();
  assert.equal(loaded.entities['a'].label, 'A');
  assert.equal(loaded.edges.length, 1);
});

test('loadWorldGraph returns empty when nothing stored', () => {
  mem.store.clear();
  const g = loadWorldGraph();
  assert.equal(Object.keys(g.entities).length, 0);
});
