import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportMemoryJSON, importMemoryJSON } from '../src/lib/memory.ts';

test('export with includeContext:true includes context fields', () => {
  const json = exportMemoryJSON(true);
  const parsed = JSON.parse(json);
  assert.ok('context' in parsed);
  assert.ok('exportedAt' in parsed.context);
  assert.ok('totalMemories' in parsed.context);
});

test('export with includeContext:false (default) -> backward compat, no context', () => {
  const json = exportMemoryJSON();
  const parsed = JSON.parse(json);
  assert.ok(!('context' in parsed));
  assert.equal(parsed.version, 1);
  assert.ok('exportedAt' in parsed);
});

test('import of enhanced export preserves context fields', () => {
  const enhanced = exportMemoryJSON(true);
  const result = importMemoryJSON(enhanced);
  assert.equal(result.ok, true);
});

test('import of legacy export (no context) still succeeds', () => {
  const legacy = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), state: { episodes: [], facts: {}, topics: [], totalMemories: 0, lastIndexedAt: Date.now() } });
  const result = importMemoryJSON(legacy);
  assert.equal(result.ok, true);
});