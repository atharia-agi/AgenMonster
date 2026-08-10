// Benchmark 6: Memory Semantic Search
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMemoryState, rememberEvent, searchMemory, getMemoriesForPrompt, getTopTopics } from '../../src/lib/memory.ts';
import { runBenchmark, checkBudgets } from './harness.ts';

// Setup test memory
function setupTestMemory() {
  const state = getMemoryState();
  // Clear and repopulate
  const episodes = [
    { kind: 'success' as const, title: 'Fixed TypeScript bug', detail: 'Fixed a complex TypeScript compilation error in the build pipeline', tags: ['typescript', 'bug', 'build'], confidence: 0.9 },
    { kind: 'error' as const, title: 'Deploy failed', detail: 'AWS deployment failed due to missing IAM permissions', tags: ['aws', 'deploy', 'error'], confidence: 0.85 },
    { kind: 'milestone' as const, title: 'Released v1.0', detail: 'Successfully released version 1.0 to production', tags: ['release', 'milestone', 'deploy'], confidence: 1.0 },
    { kind: 'user_note' as const, title: 'Prefers TypeScript', detail: 'User mentioned they prefer TypeScript over JavaScript', tags: ['typescript', 'preference'], confidence: 0.95 },
    { kind: 'lesson' as const, title: 'Always run tests before deploy', detail: 'Learned that skipping tests leads to production issues', tags: ['testing', 'deploy', 'lesson'], confidence: 0.9 },
  ];
  
  // Add episodes
  for (const ep of episodes) {
    rememberEvent(ep);
  }
  
  // Add facts
  const facts = [
    { key: 'user.language', value: 'TypeScript', confidence: 0.9 },
    { key: 'project.framework', value: 'SvelteKit', confidence: 0.95 },
    { key: 'deploy.target', value: 'AWS', confidence: 0.8 },
  ];
  
  for (const fact of facts) {
    const state = getMemoryState();
    state.facts[fact.key] = { key: fact.key, value: fact.value, confidence: fact.confidence, updatedAt: Date.now() };
  }
}

const searchQueries = [
  'typescript bug fix',
  'aws deployment error',
  'version release milestone',
  'user preference typescript',
  'testing lesson deploy',
  'build pipeline error',
  'iam permissions missing',
];

test('bench: memory semantic search', async () => {
  setupTestMemory();
  
  const results = await runBenchmark({
    name: 'memory-semantic-search',
    fn: () => {
      for (const q of searchQueries) {
        searchMemory(q);
      }
    },
    iterations: 5000,
    warmup: 500,
  });
  
  assert.ok(checkBudgets(results), 'Budget exceeded for memory-semantic-search');
});

test('bench: memory prompt retrieval', async () => {
  setupTestMemory();
  
  const results = await runBenchmark({
    name: 'memory-prompt-retrieval',
    fn: () => {
      for (const q of searchQueries) {
        getMemoriesForPrompt(q, 3);
      }
    },
    iterations: 5000,
    warmup: 500,
  });
  
  assert.ok(checkBudgets(results), 'Budget exceeded for memory-prompt-retrieval');
});

test('bench: top topics', async () => {
  setupTestMemory();
  
  const results = await runBenchmark({
    name: 'top-topics',
    fn: () => {
      getTopTopics(10);
    },
    iterations: 20000,
    warmup: 2000,
  });
  
  assert.ok(checkBudgets(results), 'Budget exceeded for top-topics');
});

test('bench: memory graph build', async () => {
  setupTestMemory();
  
  const { buildMemoryGraph } = await import('../../src/lib/memoryGraph.ts');
  
  const results = await runBenchmark({
    name: 'memory-graph-build',
    fn: () => {
      buildMemoryGraph(getMemoryState(), 600, 400);
    },
    iterations: 1000,
    warmup: 100,
  });
  
  assert.ok(checkBudgets(results), 'Budget exceeded for memory-graph-build');
});