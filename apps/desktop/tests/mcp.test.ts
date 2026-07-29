import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleTool, TOOLS } from '../src/lib/mcp.ts';
import { resetMemory, upsertFact, rememberEvent, recordTopic } from '../src/lib/memory.ts';

test('TOOLS is a non-empty array of valid identifiers', () => {
  assert.ok(TOOLS.length > 0);
  for (const t of TOOLS) {
    assert.match(t, /^[a-z]+\.[a-z.]+$/);
  }
});

test('handleTool returns error for unknown tools', () => {
  const r = handleTool('unknown.tool', {});
  assert.equal(r.ok, false);
  assert.match(r.error || '', /Unknown tool/);
});

test('memory.recall returns recalled lines for a matching query', () => {
  resetMemory();
  rememberEvent({ kind: 'success', title: 'typescript', detail: 'notes', tags: ['typescript'], confidence: 1 });
  const r = handleTool('memory.recall', { query: 'typescript', limit: 3 });
  assert.equal(r.ok, true);
  assert.ok(Array.isArray((r as any).data.recalled));
});

test('memory.record validates typed keys and stores on success', () => {
  resetMemory();
  const ok = handleTool('memory.record', { key: 'user.lang', value: 'typescript' });
  assert.equal(ok.ok, true);
  const bad = handleTool('memory.record', { key: 'foo.lang', value: 'typescript' });
  assert.equal(bad.ok, false);
});

test('memory.topics returns top topics ordered by count', () => {
  resetMemory();
  recordTopic('typescript', 10);
  recordTopic('aws', 5);
  const r = handleTool('memory.topics', {});
  assert.equal(r.ok, true);
  const topics = (r as any).data.topics;
  assert.equal(topics[0].topic, 'typescript');
});

test('chat.theme reads the active theme (graceful under no localStorage)', () => {
  const r1 = handleTool('chat.theme', {});
  assert.equal(r1.ok, true);
  assert.match((r1 as any).data.theme, /gb|gb-night|gb-dawn/);
  const r2 = handleTool('chat.theme', { theme: 'gb-night' });
  assert.equal(r2.ok, true);
  assert.ok((r2 as any).data.label);
});

test('memory.export returns the v1 JSON envelope', () => {
  resetMemory();
  rememberEvent({ kind: 'success', title: 'a', detail: 'b', tags: [], confidence: 1 });
  const r = handleTool('memory.export', {});
  assert.equal(r.ok, true);
  const parsed = JSON.parse((r as any).data.json);
  assert.equal(parsed.version, 1);
});
