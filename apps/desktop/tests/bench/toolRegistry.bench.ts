// Benchmark 2: MCP Tool Search
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchTools, selectRelevantTools, getAllToolNames, getToolCount } from '../../src/lib/toolRegistry.ts';
import { runBenchmark, checkBudgets } from './harness.ts';

const queries = [
  'memory recall',
  'goal create',
  'browser navigate',
  'search web',
  'chat budget',
  'theme dark',
  'secondbrain search',
  'chat tokens',
  'export memory',
  'goal list',
];

test('bench: MCP tool search', async () => {
  const results = await runBenchmark({
    name: 'mcp-tool-search',
    fn: () => {
      for (const q of queries) {
        searchTools(q, 10);
      }
    },
    iterations: 5000,
    warmup: 500,
  });
  
  assert.ok(checkBudgets(results), 'Budget exceeded for mcp-tool-search');
});

test('bench: select relevant tools', async () => {
  const results = await runBenchmark({
    name: 'select-relevant-tools',
    fn: () => {
      selectRelevantTools('I need to deploy my app to AWS and run tests', 20);
    },
    iterations: 10000,
    warmup: 1000,
  });
  
  assert.ok(checkBudgets(results), 'Budget exceeded for select-relevant-tools');
});

test('bench: tool registry metadata', async () => {
  const results = await runBenchmark({
    name: 'tool-registry-metadata',
    fn: () => {
      getAllToolNames();
      getToolCount();
    },
    iterations: 100000,
    warmup: 10000,
  });
  
  assert.ok(checkBudgets(results), 'Budget exceeded for tool-registry-metadata');
});