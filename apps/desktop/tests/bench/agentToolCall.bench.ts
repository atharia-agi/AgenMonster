// Benchmark 1: Agent Tool Call Parsing
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAgentToolCall } from '../../src/lib/agentToolCall.ts';
import { runBenchmark, checkBudgets } from './harness.ts';

const testReplies = [
  'Here is the answer. __AGENT_MCP__:memory.recall|{"query":"typescript","limit":3}',
  '__AGENT_MCP__:goal.create|{"title":"Deploy app","steps":"build|test|deploy"}',
  'Some text\n__AGENT_MCP__:chat.theme|{"theme":"gb-night"}',
  'Multiple calls:\n__AGENT_MCP__:memory.recall|{"q":"a"}\n__AGENT_MCP__:memory.search|{"q":"b"}',
  'No tool call here, just plain text response.',
  '__AGENT_MCP__:secondbrain.search|{"query":"test","limit":10}',
  '__AGENT_MCP__:browseros.click|{"element":42,"page":1}',
  'Complex: __AGENT_MCP__:goal.create|{"title":"Complex goal","steps":"step1|step2|step3|step4|step5"}',
];

test('bench: agent tool call parsing', async () => {
  const results = await runBenchmark({
    name: 'agent-tool-call-parsing',
    fn: () => {
      for (const reply of testReplies) {
        parseAgentToolCall(reply);
      }
    },
    iterations: 10000,
    warmup: 1000,
  });
  
  assert.ok(checkBudgets(results), 'Budget exceeded for agent-tool-call-parsing');
});

test('bench: agent tool call parsing (single)', async () => {
  const results = await runBenchmark({
    name: 'agent-tool-call-parsing-single',
    fn: () => {
      parseAgentToolCall('Answer. __AGENT_MCP__:memory.recall|{"query":"test","limit":5}');
    },
    iterations: 50000,
    warmup: 5000,
  });
  
  assert.ok(checkBudgets(results), 'Budget exceeded for agent-tool-call-parsing-single');
});