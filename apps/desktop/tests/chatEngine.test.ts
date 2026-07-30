import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isTransientError, isAbortError, dispatchAgentTool } from '../src/lib/chatEngine.ts';

// ---------- isAbortError ----------
test('isAbortError: AbortError name', () => {
  assert.equal(isAbortError({ name: 'AbortError' }), true);
});
test('isAbortError: message contains aborted', () => {
  assert.equal(isAbortError({ message: 'The operation was aborted' }), true);
});
test('isAbortError: 429 is not abort', () => {
  assert.equal(isAbortError({ message: '429 Too Many Requests' }), false);
});

// ---------- isTransientError ----------
test('isTransientError: abort counts as transient', () => {
  assert.equal(isTransientError({ name: 'AbortError' }), true);
});
test('isTransientError: rate limit variants', () => {
  assert.equal(isTransientError({ message: 'Error 429: rate limit exceeded' }), true);
  assert.equal(isTransientError({ message: 'Rate limit' }), true);
});
test('isTransientError: server/network variants', () => {
  assert.equal(isTransientError({ message: 'fetch failed' }), true);
  assert.equal(isTransientError({ message: '504 gateway timeout' }), true);
  assert.equal(isTransientError({ message: 'network unreachable' }), true);
  assert.equal(isTransientError({ message: '503 Service Unavailable' }), true);
  assert.equal(isTransientError({ message: '500 internal error' }), true);
});
test('isTransientError: timeout variant', () => {
  assert.equal(isTransientError({ message: 'request timeout' }), true);
});
test('isTransientError: non-transient error is false', () => {
  assert.equal(isTransientError({ message: 'Invalid API key' }), false);
  assert.equal(isTransientError({ message: 'context length exceeded' }), false);
});
test('isTransientError: case-insensitive matching', () => {
  assert.equal(isTransientError({ message: 'RATE LIMIT' }), true);
});

// ---------- dispatchAgentTool ----------
test('dispatchAgentTool: plain text returns unchanged, no call', () => {
  const r = dispatchAgentTool('Just a normal reply with no marker.');
  assert.equal(r.called, false);
  assert.equal(r.stripped, 'Just a normal reply with no marker.');
  assert.equal(r.toolNote, '');
});
test('dispatchAgentTool: strips marker and produces tool note on success', () => {
  const reply = 'Let me check that.\n__AGENT_MCP__:memory.facts|{}';
  const r = dispatchAgentTool(reply);
  assert.equal(r.called, true);
  assert.equal(r.stripped.includes('__AGENT_MCP__'), false);
  assert.ok(r.stripped.includes('Let me check that.'));
  assert.ok(r.toolNote.includes('memory.facts'));
});
test('dispatchAgentTool: unknown tool yields error note, still called', () => {
  const reply = 'Trying something.\n__AGENT_MCP__:not.a.real.tool|{}';
  const r = dispatchAgentTool(reply);
  assert.equal(r.called, true);
  assert.ok(r.toolNote.includes('tool error') || r.toolNote.includes('⚠'));
});
