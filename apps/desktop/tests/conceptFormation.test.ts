import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  overlap,
  shouldMerge,
  clusterIntoConcepts,
  formConcepts,
  type FactItem,
} from '../src/lib/conceptFormation.ts';
import { createWorldGraph } from '../src/lib/worldModelGraph.ts';

const fruits: FactItem[] = [
  { id: 'apple', title: 'apple fruit', tags: ['fruit', 'food', 'plant'] },
  { id: 'orange', title: 'orange fruit', tags: ['fruit', 'food', 'plant'] },
  { id: 'mango', title: 'mango fruit', tags: ['fruit', 'food', 'plant'] },
];

const vehicles: FactItem[] = [
  { id: 'car', title: 'car vehicle', tags: ['vehicle', 'transport'] },
  { id: 'bike', title: 'bike vehicle', tags: ['vehicle', 'transport'] },
];

test('overlap is high within cluster, low across', () => {
  assert.ok(overlap(fruits[0], fruits[1]) > 0.3);
  assert.ok(overlap(fruits[0], vehicles[0]) < 0.3);
});

test('shouldMerge respects overlap threshold', () => {
  assert.equal(shouldMerge(fruits[0], fruits[1]), true);
  assert.equal(shouldMerge(fruits[0], vehicles[0]), false);
});

test('shouldMerge rejects contradictory exclusive tags', () => {
  const a: FactItem = { id: 'x', title: 'cat', tags: ['animal'] };
  const b: FactItem = { id: 'y', title: 'tree', tags: ['plant'] };
  assert.equal(shouldMerge(a, b), false);
});

test('clusterIntoConcepts forms fruit + vehicle concepts', () => {
  const concepts = clusterIntoConcepts([...fruits, ...vehicles]);
  assert.equal(concepts.length, 2);
  const fruitConcept = concepts.find((c) => c.members.includes('apple'))!;
  assert.equal(fruitConcept.members.length, 3);
});

test('clusterIntoConcepts ignores singletons', () => {
  const concepts = clusterIntoConcepts([{ id: 'lonely', title: 'unique thing', tags: ['rare'] }]);
  assert.equal(concepts.length, 0);
});

test('formConcepts writes concept entities into world graph', () => {
  const { graph, concepts } = formConcepts(createWorldGraph(), [...fruits, ...vehicles]);
  const conceptNodes = Object.values(graph.entities).filter((e) => e.type === 'concept' && e.id.startsWith('concept-'));
  assert.equal(conceptNodes.length, 2);
  assert.equal(concepts.length, 2);
});

test('formConcepts links concept to members', () => {
  const { graph } = formConcepts(createWorldGraph(), fruits);
  const conceptId = Object.values(graph.entities).find((e) => e.type === 'concept')!.id;
  const owned = graph.edges.filter((e) => e.from === conceptId && e.type === 'owns');
  assert.equal(owned.length, 3);
});
