import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAgentToolCall, type AgentToolCall } from '../src/lib/agentToolCall.ts';

test('parseAgentToolCall returns null for plain text', () => {
  assert.equal(parseAgentToolCall('hello world'), null);
});

test('parseAgentToolCall returns null for malformed marker', () => {
  assert.equal(parseAgentToolCall('__AGENT_MCP__:toolname'), null);
  assert.equal(parseAgentToolCall('__AGENT_MCP__:bad|not-json'), null);
});

test('parseAgentToolCall extracts name + valid JSON params', () => {
  const r = parseAgentToolCall('__AGENT_MCP__:memory.recall|{"query":"foo","limit":3}');
  assert.ok(r);
  assert.equal(r.name, 'memory.recall');
  assert.equal(r.params.query, 'foo');
  assert.equal(r.params.limit, 3);
  assert.equal(r.raw, '__AGENT_MCP__:memory.recall|{"query":"foo","limit":3}');
});

test('parseAgentToolCall handles trailing whitespace after marker', () => {
  const r = parseAgentToolCall('great __AGENT_MCP__:goal.list|{}   ');
  assert.ok(r);
  assert.equal(r.name, 'goal.list');
});

test('parseAgentToolCall returns null for invalid JSON params', () => {
  assert.equal(parseAgentToolCall('__AGENT_MCP__:memory.recall|{not json}'), null);
});

test('parseAgentToolCall handles empty params object', () => {
  const r = parseAgentToolCall('__AGENT_MCP__:memory.topics|{}');
  assert.ok(r);
  assert.equal(r.name, 'memory.topics');
  assert.deepEqual(r.params, {});
});

test('parseAgentToolCall handles params with nested objects', () => {
  const r = parseAgentToolCall('__AGENT_MCP__:goal.create|{"title":"x","steps":["a","b"]}');
  assert.ok(r);
  assert.equal(r.params.title, 'x');
  assert.ok(Array.isArray(r.params.steps));
  assert.equal(r.params.steps.length, 2);
});

test('parseAgentToolCall rejects marker without JSON separator', () => {
  assert.equal(parseAgentToolCall('__AGENT_MCP__:tool.name'), null);
});

test('parseAgentToolCall rejects non-lowercase tool namespace', () => {
  assert.equal(parseAgentToolCall('__AGENT_MCP__:Memory.Recall|{}'), null);
});

test('parseAgentToolCall allows tool names with multiple dots', () => {
  const r = parseAgentToolCall('__AGENT_MCP__:memory.topic.record|{"topic":"ts"}');
  assert.ok(r);
  assert.equal(r.name, 'memory.topic.record');
});

test('parseAgentToolCall trims trailing whitespace from raw marker', () => {
  const r = parseAgentToolCall('reply text __AGENT_MCP__:chat.stats|{} \n');
  assert.ok(r);
  assert.equal(r.raw, '__AGENT_MCP__:chat.stats|{}');
});

test('parseAgentToolCall returns only the last marker in a multi-line string', () => {
  const r = parseAgentToolCall('line1\n__AGENT_MCP__:memory.facts|{}\nline2');
  assert.ok(r);
  assert.equal(r.name, 'memory.facts');
});

test('parseAgentToolCall handles marker preceded by code fence backticks', () => {
  const r = parseAgentToolCall('```Here is the tool call:\n__AGENT_MCP__:chat.stats|{}\n```');
  assert.ok(r);
  assert.equal(r.name, 'chat.stats');
});

test('parseAgentToolCall returns null when params JSON has top-level string value', () => {
  const r = parseAgentToolCall('__AGENT_MCP__:memory.recall|{"query":"test","limit":"not-a-number"}');
  assert.ok(r);
  assert.equal(r.params.limit, 'not-a-number');
});

test('parseAgentToolCall rejects empty action name', () => {
  assert.equal(parseAgentToolCall('__AGENT_MCP__:|{}'), null);
});

test('parseAgentToolCall parses JSON values containing spaces', () => {
  const r = parseAgentToolCall('__AGENT_MCP__:goal.create|{"title":"Deploy app","steps":"build|test|deploy"}');
  assert.ok(r);
  assert.equal(r.name, 'goal.create');
  assert.equal(r.params.title, 'Deploy app');
  assert.equal(r.params.steps, 'build|test|deploy');
});

test('parseAgentToolCall parses JSON containing escaped quotes', () => {
  const r = parseAgentToolCall('__AGENT_MCP__:memory.recall|{"query":"say \\"hi\\" there","limit":2}');
  assert.ok(r);
  assert.equal(r.params.query, 'say "hi" there');
});

test('parseAgentToolCall handles multi-line JSON payloads', () => {
  const r = parseAgentToolCall('__AGENT_MCP__:goal.create|{\n  "title": "Multi line",\n  "steps": ["a"]\n}');
  assert.ok(r);
  assert.equal(r.params.title, 'Multi line');
  assert.ok(Array.isArray(r.params.steps));
  assert.equal((r.params.steps as unknown[]).length, 1);
});

test('parseAgentToolCall does not stop at } inside a string', () => {
  const r = parseAgentToolCall('__AGENT_MCP__:memory.recall|{"query":"use } bracket","limit":1}');
  assert.ok(r);
  assert.equal(r.params.query, 'use } bracket');
});

test('parseAgentToolCall returns null for non-string input', () => {
  assert.equal(parseAgentToolCall(undefined as unknown as string), null);
  assert.equal(parseAgentToolCall(42 as unknown as string), null);
});

test('parseAgentToolCall returns the last valid marker when earlier one is malformed', () => {
  const r = parseAgentToolCall('__AGENT_MCP__:memory.recall|{broken}\n__AGENT_MCP__:goal.list|{"ok":true}');
  assert.ok(r);
  assert.equal(r.name, 'goal.list');
  assert.equal(r.params.ok, true);
});
