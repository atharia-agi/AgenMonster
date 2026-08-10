import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMemoryGraph,
  retrieveBySpreadingActivation,
  type MemoryGraph,
} from '../src/lib/memoryGraph.ts';
import { rememberEvent, upsertFact, resetMemory, type Episode, type TopicCount } from '../src/lib/memory.ts';

function seedGraph(): MemoryGraph {
  resetMemory();
  rememberEvent({ kind: 'success', title: 'Rin deployed to cloud_server', detail: 'Rin uses cloud_server', tags: ['aws'], confidence: 0.9 });
  rememberEvent({ kind: 'success', title: 'Vee fixed the Svelte bug', detail: 'Vee uses Svelte', tags: ['bug', 'svelte'], confidence: 0.8 });
  rememberEvent({ kind: 'user_note', title: 'user prefers dark mode', detail: 'user prefers dark mode over light', tags: ['preference'], confidence: 0.95 });
  rememberEvent({ kind: 'lesson', title: 'AgenMonster uses TypeScript', detail: 'Rin uses TypeScript for the loop', tags: ['ts'], confidence: 0.85 });
  upsertFact('framework', 'Svelte', 0.9);
  upsertFact('language', 'TypeScript', 0.9);
  return buildMemoryGraph({
    facts: {},
    episodes: [] as Episode[],
    topics: [] as TopicCount[],
    totalMemories: 0,
    lastIndexedAt: Date.now(),
  });
}

describe('memoryGraph', () => {
  it('buildMemoryGraph returns nodes and edges', () => {
    const graph = seedGraph();
    assert.ok(Array.isArray(graph.nodes));
    assert.ok(Array.isArray(graph.edges));
    assert.equal(typeof graph.width, 'number');
    assert.equal(typeof graph.height, 'number');
  });

  it('retrieveBySpreadingActivation returns episodes and facts', () => {
    seedGraph();
    const result = retrieveBySpreadingActivation('rin svelte deployment', { topK: 3 });
    assert.ok(Array.isArray(result.episodes));
    assert.ok(Array.isArray(result.facts));
  });

  it('retrieveBySpreadingActivation returns empty for no match', () => {
    seedGraph();
    const result = retrieveBySpreadingActivation('zzzzunknownzzzz');
    assert.equal(result.episodes.length, 0);
    assert.equal(result.facts.length, 0);
  });

  it('retrieveBySpreadingActivation ranks direct matches above distant ones', () => {
    seedGraph();
    const result = retrieveBySpreadingActivation('svelte');
    const episodes = result.episodes;
    assert.ok(episodes.length > 0);
  });

  it('retrieveBySpreadingActivation respects topK limit', () => {
    seedGraph();
    const result = retrieveBySpreadingActivation('rin cloud_server svelte bug', { topK: 2 });
    assert.ok(result.episodes.length <= 2);
    assert.ok(result.facts.length <= 2);
  });
});
