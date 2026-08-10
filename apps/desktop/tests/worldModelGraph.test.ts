import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorldGraph,
  addEntity,
  link,
  getNeighbors,
  mergeDuplicate,
  shortestPath,
} from '../src/lib/worldModelGraph.ts';

test('addEntity then link creates graph', () => {
  let g = createWorldGraph();
  g = addEntity(g, { id: 'p1', type: 'person', label: 'Budi' });
  g = addEntity(g, { id: 'pr1', type: 'project', label: 'PRL' });
  g = link(g, 'p1', 'pr1', 'works_on');
  assert.equal(Object.keys(g.entities).length, 2);
  assert.equal(g.edges.length, 1);
});

test('getNeighbors returns linked entities', () => {
  let g = createWorldGraph();
  g = addEntity(g, { id: 'p1', type: 'person', label: 'Budi' });
  g = addEntity(g, { id: 'pr1', type: 'project', label: 'PRL' });
  g = link(g, 'p1', 'pr1', 'works_on');
  const n = getNeighbors(g, 'p1', 'works_on');
  assert.equal(n.length, 1);
  assert.equal(n[0].id, 'pr1');
});

test('link dedupes identical edges keeping max weight', () => {
  let g = createWorldGraph();
  g = addEntity(g, { id: 'a', type: 'concept', label: 'A' });
  g = addEntity(g, { id: 'b', type: 'concept', label: 'B' });
  g = link(g, 'a', 'b', 'depends_on', 1);
  g = link(g, 'a', 'b', 'depends_on', 3);
  assert.equal(g.edges.length, 1);
  assert.equal(g.edges[0].weight, 3);
});

test('mergeDuplicate folds relations into kept entity', () => {
  let g = createWorldGraph();
  g = addEntity(g, { id: 'a', type: 'concept', label: 'A' });
  g = addEntity(g, { id: 'a2', type: 'concept', label: 'A also' });
  g = addEntity(g, { id: 'b', type: 'project', label: 'B' });
  g = link(g, 'a', 'b', 'owns');
  g = link(g, 'a2', 'b', 'owns');
  g = mergeDuplicate(g, 'a', 'a2');
  assert.ok(!g.entities['a2']);
  // 'a' now has 2 edges to 'b' (deduped to 1)
  assert.equal(g.edges.filter((e) => e.from === 'a' && e.to === 'b').length, 1);
});

test('shortestPath finds relation route', () => {
  let g = createWorldGraph();
  g = addEntity(g, { id: 'a', type: 'concept', label: 'A' });
  g = addEntity(g, { id: 'b', type: 'concept', label: 'B' });
  g = addEntity(g, { id: 'c', type: 'concept', label: 'C' });
  g = link(g, 'a', 'b', 'depends_on');
  g = link(g, 'b', 'c', 'causes');
  const path = shortestPath(g, 'a', 'c');
  assert.deepEqual(path, ['a', 'b', 'c']);
});

test('shortestPath returns null when disconnected', () => {
  let g = createWorldGraph();
  g = addEntity(g, { id: 'a', type: 'concept', label: 'A' });
  g = addEntity(g, { id: 'z', type: 'concept', label: 'Z' });
  assert.equal(shortestPath(g, 'a', 'z'), null);
});
