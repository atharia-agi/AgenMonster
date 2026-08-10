import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decompose, topologicalOrder, totalEstimate, replanOnFailure } from '../src/lib/executivePlanner.ts';

test('decompose builds task nodes with deps', () => {
  const tasks = decompose('ship PRL', [
    { title: 'smart contract', estimateDays: 5 },
    { title: 'website', dependsOn: ['t1'], estimateDays: 3 },
    { title: 'whitepaper', dependsOn: ['t1'], estimateDays: 2 },
  ]);
  assert.equal(tasks.length, 3);
  assert.deepEqual(tasks[1].dependsOn, ['t1']);
});

test('topologicalOrder respects dependencies', () => {
  const tasks = decompose('proj', [
    { title: 'A' },
    { title: 'B', dependsOn: ['t1'] },
    { title: 'C', dependsOn: ['t2'] },
  ]);
  const order = topologicalOrder(tasks);
  assert.ok(order.indexOf('t1') < order.indexOf('t2'));
  assert.ok(order.indexOf('t2') < order.indexOf('t3'));
});

test('totalEstimate sums along chain', () => {
  const tasks = decompose('proj', [
    { title: 'A', estimateDays: 2 },
    { title: 'B', dependsOn: ['t1'], estimateDays: 3 },
    { title: 'C', dependsOn: ['t2'], estimateDays: 1 },
  ]);
  assert.equal(totalEstimate(tasks), 6); // 2+3+1
});

test('replanOnFailure marks failed + delays dependents', () => {
  const tasks = decompose('proj', [
    { title: 'A' },
    { title: 'B', dependsOn: ['t1'] },
    { title: 'C', dependsOn: ['t2'] },
  ]);
  const { tasks: updated, order } = replanOnFailure(tasks, 't1');
  assert.equal(updated.find((t) => t.id === 't1')!.status, 'failed');
  // t2 (depends on t1) and t3 (depends on t2) should be delayed to the back.
  assert.ok(order.indexOf('t1') < order.indexOf('t2'));
  assert.ok(order.indexOf('t2') < order.indexOf('t3'));
});
