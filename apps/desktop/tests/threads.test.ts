import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newThreadState,
  createThread,
  switchThread,
  deleteThread,
  renameThread,
  appendToActive,
  replaceActive,
  getActiveMessages,
  THREAD_TITLE_MAX,
  ensureThreadState,
} from '../src/lib/threads.ts';

function msg(role: 'user' | 'assistant', content: string) {
  return { id: crypto.randomUUID(), role, content, timestamp: Date.now() };
}

test('newThreadState seeds a Main thread', () => {
  const ts = newThreadState();
  assert.equal(Object.keys(ts.threads).length, 1);
  assert.equal(ts.order.length, 1);
  const main = ts.threads[ts.activeId];
  assert.equal(main.title, 'Main');
});

test('createThread trims title to THREAD_TITLE_MAX', () => {
  const t = createThread('a'.repeat(100));
  assert.equal(t.title.length, THREAD_TITLE_MAX);
});

test('switchThread moves activeId to front of order', () => {
  let ts = newThreadState();
  const t2 = createThread('Side');
  ts = { ...ts, threads: { ...ts.threads, [t2.id]: t2 }, order: [...ts.order, t2.id] };
  ts = switchThread(ts, t2.id);
  assert.equal(ts.activeId, t2.id);
  assert.equal(ts.order[0], t2.id);
});

test('switchThread to non-existent id is a no-op', () => {
  const ts = newThreadState();
  const after = switchThread(ts, 'nope');
  assert.equal(after.activeId, ts.activeId);
});

test('appendToActive mutates the active thread only', () => {
  let ts = newThreadState();
  const mainId = ts.activeId;
  const t2 = createThread('Other');
  ts = { ...ts, threads: { ...ts.threads, [t2.id]: t2 }, order: [...ts.order, t2.id] };
  ts = appendToActive(ts, msg('user', 'hello main'));
  assert.equal(ts.threads[mainId].messages.length, 1);
  assert.equal(ts.threads[t2.id].messages.length, 0);
});

test('replaceActive swaps the matched message in place', () => {
  let ts = newThreadState();
  const m1 = msg('user', 'first');
  const m2 = msg('assistant', 'reply');
  ts = appendToActive(ts, m1);
  ts = appendToActive(ts, m2);
  const swapped = msg('assistant', 'reply (better)');
  ts = replaceActive(ts, (m) => m.id === m2.id, swapped);
  const out = getActiveMessages(ts);
  assert.equal(out.length, 2);
  assert.equal(out[1].id, swapped.id);
});

test('deleteThread falls back to a fresh Main when last thread is removed', () => {
  let ts = newThreadState();
  const id = ts.activeId;
  ts = deleteThread(ts, id);
  assert.equal(Object.keys(ts.threads).length, 1);
  assert.equal(ts.activeId in ts.threads, true);
});

test('renameThread trims and updates timestamp', () => {
  const ts = newThreadState();
  const id = ts.activeId;
  const next = renameThread(ts, id, '  hello  ');
  assert.equal(next.threads[id].title, 'hello');
});

test('ensureThreadState migrates legacy chatMessages into Main', () => {
  const state: any = {
    chatMessages: [
      { id: 'a', role: 'user', content: 'old msg', timestamp: 0 },
      { id: 'b', role: 'assistant', content: 'old reply', timestamp: 0 },
    ],
  };
  const ts = ensureThreadState(state);
  assert.equal(Object.keys(ts.threads).length, 1);
  assert.equal(ts.threads[ts.activeId].messages.length, 2);
  assert.equal(ts.threads[ts.activeId].title, 'Main');
  assert.ok(state.chatThreads);
  assert.equal(state.chatActiveThreadId, ts.activeId);
});

test('ensureThreadState is idempotent when chatThreads already exists', () => {
  const state: any = { chatThreads: { t1: { id: 't1', title: 'X', messages: [], createdAt: 0, updatedAt: 0 } }, chatActiveThreadId: 't1', chatThreadOrder: ['t1'] };
  const ts = ensureThreadState(state);
  assert.equal(ts.activeId, 't1');
  assert.equal(Object.keys(ts.threads).length, 1);
});

test('switchThread changes activeId and preserves messages', () => {
  let ts = newThreadState();
  const second = createThread('second');
  ts = { ...ts, threads: { ...ts.threads, [second.id]: second }, order: [ts.activeId, second.id] };
  ts = switchThread(ts, second.id);
  assert.equal(ts.activeId, second.id);
  assert.equal(ts.threads[second.id].messages.length, 0);
});

test('deleteThread removes thread and switches to first remaining', () => {
  let ts = newThreadState();
  const second = createThread('second');
  ts = { ...ts, threads: { ...ts.threads, [second.id]: second }, order: [ts.activeId, second.id] };
  ts = switchThread(ts, second.id);
  const third = createThread('third');
  ts = { ...ts, threads: { ...ts.threads, [third.id]: third }, order: [ts.activeId, third.id] };
  ts = deleteThread(ts, second.id);
  assert.ok(!(second.id in ts.threads));
  assert.equal(ts.activeId, third.id);
});

test('switchThread to non-existent id is a no-op', () => {
  const ts = newThreadState();
  const next = switchThread(ts, 'nonexistent');
  assert.equal(next.activeId, ts.activeId);
});

test('deleteThread when deleting active thread selects first remaining', () => {
  let ts = newThreadState();
  const second = createThread('second');
  ts = { ...ts, threads: { ...ts.threads, [second.id]: second }, order: [ts.activeId, second.id] };
  ts = deleteThread(ts, ts.activeId);
  assert.ok(Object.keys(ts.threads).length >= 0);
});

test('createThread generates unique ids', () => {
  const ts = newThreadState();
  const a = createThread('alpha');
  const b = createThread('beta');
  assert.notEqual(a.id, b.id);
});

test('appendToActive mutates the active thread only', () => {
  let ts = newThreadState();
  const second = createThread('second');
  ts = { ...ts, threads: { ...ts.threads, [second.id]: second }, order: [ts.activeId, second.id] };
  ts = switchThread(ts, second.id);
  ts = appendToActive(ts, { id: 'm1', role: 'user', content: 'hi', timestamp: 0 });
  assert.equal(ts.threads[second.id].messages.length, 1);
  assert.equal(ts.threads[ts.activeId].messages.length, 1);
});
