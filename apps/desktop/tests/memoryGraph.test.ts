import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMemoryGraph } from '../src/lib/memoryGraph.ts';
import { rememberEvent, upsertFact, recordTopic, resetMemory, getMemoryState } from '../src/lib/memory.ts';

function fixture() {
  resetMemory();
  recordTopic('typescript', 5);
  recordTopic('aws', 3);
  upsertFact('user.lang', 'typescript', 0.9);
  upsertFact('project.framework', 'sveltekit', 0.9);
  upsertFact('tool.linter', 'oxlint', 0.9);
  rememberEvent({ kind: 'success', title: 'a', detail: 'typescript notes', tags: ['typescript'], confidence: 1 });
  rememberEvent({ kind: 'lesson', title: 'b', detail: 'aws config', tags: ['aws'], confidence: 1 });
  return getMemoryState();
}

test('buildMemoryGraph produces one tag node per top topic', () => {
  const g = buildMemoryGraph(fixture());
  const tagNodes = g.nodes.filter((n) => n.kind === 'tag');
  assert.equal(tagNodes.length, 2);
});

test('buildMemoryGraph produces fact nodes with kind-correct color', () => {
  const g = buildMemoryGraph(fixture());
  const userFact = g.nodes.find((n) => n.id === 'fact:user.lang');
  const toolFact = g.nodes.find((n) => n.id === 'fact:tool.linter');
  assert.ok(userFact && toolFact);
  assert.equal((userFact!.color || '').toLowerCase(), '#88ccf0');
  assert.equal((toolFact!.color || '').toLowerCase(), '#ffc860');
});

test('buildMemoryGraph emits edges between facts and matching tags', () => {
  const g = buildMemoryGraph(fixture());
  const userLangEdges = g.edges.filter((e) => e.from === 'fact:user.lang');
  assert.ok(userLangEdges.length > 0);
  assert.ok(userLangEdges.some((e) => e.to === 'tag:typescript'));
});

test('buildMemoryGraph keeps all node coordinates within the canvas', () => {
  const g = buildMemoryGraph(fixture(), 400, 300);
  for (const n of g.nodes) {
    assert.ok(n.x >= 0 && n.x <= 400, `node ${n.id} x=${n.x} out of bounds`);
    assert.ok(n.y >= 0 && n.y <= 300, `node ${n.id} y=${n.y} out of bounds`);
  }
});

test('buildMemoryGraph is deterministic for same input', () => {
  const s = fixture();
  const a = buildMemoryGraph(s, 400, 300);
  const b = buildMemoryGraph(s, 400, 300);
  assert.deepEqual(a, b);
});

test('buildMemoryGraph handles empty memory without crashing', () => {
  resetMemory();
  const g = buildMemoryGraph(getMemoryState());
  assert.equal(g.nodes.length, 0);
  assert.equal(g.edges.length, 0);
});

test('buildMemoryGraph returns expected node counts for a known 3-fact state', () => {
  resetMemory();
  upsertFact('user.lang', 'typescript', 0.9);
  upsertFact('project.framework', 'sveltekit', 0.9);
  upsertFact('tool.linter', 'oxlint', 0.9);
  const g = buildMemoryGraph(getMemoryState(), 400, 300);
  const factNodes = g.nodes.filter((n) => n.kind === 'fact');
  assert.equal(factNodes.length, 3);
  assert.ok(g.nodes.length >= 3);
});

test('buildMemoryGraph returns expected edge count for 2 facts sharing 1 tag', () => {
  resetMemory();
  recordTopic('x', 1);
  upsertFact('a.x', '1', 0.9);
  upsertFact('b.x', '2', 0.9);
  rememberEvent({ kind: 'success', title: 'did a and b', detail: '', tags: ['x'], confidence: 1 });
  const g = buildMemoryGraph(getMemoryState(), 400, 300);
  const tagNodes = g.nodes.filter((n) => n.kind === 'tag' && n.label === 'x');
  assert.equal(tagNodes.length, 1);
  const edgesToTag = g.edges.filter((e) => e.to === tagNodes[0].id);
  assert.ok(edgesToTag.length >= 1, `expected >=1 edge to tag:x, got ${edgesToTag.length}`);
});

test('buildMemoryGraph with no topics produces no tag nodes', () => {
  resetMemory();
  upsertFact('user.lang', 'typescript', 0.9);
  const g = buildMemoryGraph(getMemoryState(), 480, 320);
  const tagNodes = g.nodes.filter((n) => n.kind === 'tag');
  assert.equal(tagNodes.length, 0);
  const factNodes = g.nodes.filter((n) => n.kind === 'fact');
  assert.ok(factNodes.length >= 1);
});

test('buildMemoryGraph with large canvas keeps all nodes in bounds', () => {
  resetMemory();
  for (let i = 0; i < 10; i++) {
    upsertFact(`tool.linter${i}`, `eslint-${i}`, 0.9);
  }
  const g = buildMemoryGraph(getMemoryState(), 1200, 800);
  for (const n of g.nodes) {
    assert.ok(n.x >= 0 && n.x <= 1200, `node ${n.id} x=${n.x} out of bounds`);
    assert.ok(n.y >= 0 && n.y <= 800, `node ${n.id} y=${n.y} out of bounds`);
  }
});

test('buildMemoryGraph fact node color matches namespace', () => {
  resetMemory();
  upsertFact('project.framework', 'sveltekit', 0.9);
  const g = buildMemoryGraph(getMemoryState(), 480, 320);
  const fact = g.nodes.find((n) => n.id === 'fact:project.framework');
  assert.ok(fact);
  assert.equal(fact.color, '#90c878');
});

test('buildMemoryGraph episode node color varies by kind', () => {
  resetMemory();
  rememberEvent({ kind: 'error', title: 'err', detail: '', tags: [], confidence: 1 });
  rememberEvent({ kind: 'lesson', title: 'lesson', detail: '', tags: [], confidence: 1 });
  rememberEvent({ kind: 'success', title: 'ok', detail: '', tags: [], confidence: 1 });
  const g = buildMemoryGraph(getMemoryState(), 480, 320);
  const epNodes = g.nodes.filter((n) => n.kind === 'episode');
  const colors = epNodes.map((n) => n.color);
  assert.ok(colors.some((c) => c === '#e85050'), 'should have error-colored episode');
  assert.ok(colors.some((c) => c === '#d8c8f0'), 'should have lesson-colored episode');
  assert.ok(colors.some((c) => c === '#90c878'), 'should have success-colored episode');
});
