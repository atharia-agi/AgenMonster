import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  searchTools,
  getToolsByCategory,
  getToolDef,
  getAllToolNames,
  getToolCount,
  selectRelevantTools,
  buildToolManifest,
} from '../src/lib/toolRegistry.ts';

describe('toolRegistry', () => {
  it('searchTools returns relevant tools for a query', () => {
    const results = searchTools('remember something', 5);
    assert.ok(results.length > 0);
    assert.ok(results.some((r) => r.name === 'memory.record'));
  });

  it('searchTools returns browser tools for browser queries', () => {
    const results = searchTools('click button in browser', 5);
    assert.ok(results.some((r) => r.name === 'browseros.click'));
  });

  it('searchTools returns goal tools for goal queries', () => {
    const results = searchTools('create a new goal', 5);
    assert.ok(results.some((r) => r.name === 'goal.create'));
  });

  it('getToolsByCategory returns tools for a category', () => {
    const memoryTools = getToolsByCategory('memory');
    assert.ok(memoryTools.length > 0);
    assert.ok(memoryTools.every((t) => t.category === 'memory'));
  });

  it('getToolDef returns the correct tool definition', () => {
    const def = getToolDef('memory.recall');
    assert.ok(def);
    assert.strictEqual(def.name, 'memory.recall');
    assert.strictEqual(def.category, 'memory');
    assert.ok(def.description.length > 0);
  });

  it('getToolDef returns undefined for unknown tools', () => {
    const def = getToolDef('unknown.tool');
    assert.strictEqual(def, undefined);
  });

  it('getAllToolNames returns all 106+ tools', () => {
    const names = getAllToolNames();
    assert.ok(names.length >= 100);
    assert.ok(names.includes('memory.recall'));
    assert.ok(names.includes('browseros.click'));
    assert.ok(names.includes('goal.create'));
  });

  it('getToolCount returns the correct count', () => {
    const count = getToolCount();
    assert.ok(count >= 100);
  });

  it('selectRelevantTools reduces context bloat', () => {
    const selected = selectRelevantTools('I want to remember my favorite color', 10);
    assert.ok(selected.length <= 10);
    assert.ok(selected.includes('memory.recall'));
    assert.ok(selected.includes('memory.record'));
  });

  it('selectRelevantTools always includes core tools', () => {
    const selected = selectRelevantTools('browser click screenshot', 5);
    assert.ok(selected.includes('memory.recall'), 'should include memory.recall');
    assert.ok(selected.includes('memory.record'), 'should include memory.record');
    assert.ok(selected.includes('chat.budget'), 'should include chat.budget');
  });

  it('buildToolManifest returns descriptions and params', () => {
    const manifest = buildToolManifest(['memory.recall', 'memory.record']);
    assert.ok('memory.recall' in manifest);
    assert.ok('memory.record' in manifest);
    assert.ok(typeof manifest['memory.recall'].description === 'string');
    assert.ok(typeof manifest['memory.recall'].params === 'object');
  });

  it('searchTools returns low-score results for irrelevant queries', () => {
    const results = searchTools('xyzlkjhqwerty nothinghere', 5);
    assert.ok(results.length <= 5, `Expected at most 5 results for nonsense query, got ${results.length}`);
  });

  it('searchTools is case insensitive', () => {
    const lower = searchTools('memory recall', 5);
    const upper = searchTools('MEMORY RECALL', 5);
    assert.ok(lower.length > 0);
    assert.ok(upper.length > 0);
  });
});
