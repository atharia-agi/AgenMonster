// agentChatLoop — tests for the GENUINE multi-turn feedback loop
// (runAgentChatLoop) added so the chat path executes tools across turns
// instead of a one-shot tool invocation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAgentChatLoop } from '../src/lib/agentLoop.ts';

const TOOL_REPLY = 'Let me check.\n__AGENT_MCP__:memory.get|{"key":"x"}';
const FINAL_REPLY = 'Here is the result: success.';

test('runAgentChatLoop runs multiple turns until the LLM stops calling tools', async () => {
  let calls = 0;
  const replies = [TOOL_REPLY, FINAL_REPLY];
  const result = await runAgentChatLoop(
    TOOL_REPLY,
    [{ role: 'user', content: 'hi' }],
    async () => replies[Math.min(calls, replies.length - 1)],
    {
      maxTurns: 5,
      executeTool: async (name, params) => {
        calls++;
        assert.equal(name, 'memory.get');
        assert.deepEqual(params, { key: 'x' });
        return { ok: true, data: { value: 42 } };
      },
    },
  );

  assert.equal(calls, 1, 'exactly one tool call across two turns');
  assert.equal(result.toolCalls.length, 1);
  assert.equal(result.toolCalls[0].name, 'memory.get');
  assert.ok(result.toolResults[0].ok);
  assert.equal(result.turnsUsed, 1, 'one tool turn executed');
  assert.match(result.output, /Here is the result: success/);
  assert.match(result.output, /Let me check/);
  assert.equal(result.stopped, false);
});

test('runAgentChatLoop respects maxTurns when the LLM keeps calling tools', async () => {
  const result = await runAgentChatLoop(
    TOOL_REPLY,
    [],
    async () => TOOL_REPLY,
    {
      maxTurns: 3,
      executeTool: async () => ({ ok: true, data: {} }),
    },
  );

  assert.equal(result.turnsUsed, 3, 'hard-stops at maxTurns');
  assert.ok(result.toolCalls.length >= 1);
});

test('runAgentChatLoop feeds the tool result back into the history', async () => {
  const toolTurns: Array<{ role: string; content: string }> = [];
  await runAgentChatLoop(
    TOOL_REPLY,
    [{ role: 'user', content: 'hi' }],
    async (history) => {
      for (const m of history) {
        if (m.role === 'tool') toolTurns.push(m);
      }
      return FINAL_REPLY;
    },
    { executeTool: async () => ({ ok: true, data: { value: 42 } }) },
  );

  assert.ok(toolTurns.length > 0, 'tool result appended to history');
  assert.match(toolTurns[0].content, /memory\.get/);
  assert.match(toolTurns[0].content, /42/);
});

test('runAgentChatLoop reports tool errors without crashing the loop', async () => {
  const result = await runAgentChatLoop(
    TOOL_REPLY,
    [],
    async () => FINAL_REPLY,
    { executeTool: async () => ({ ok: false, error: 'boom' }) },
  );

  assert.equal(result.toolResults.length, 1);
  assert.equal(result.toolResults[0].ok, false);
  assert.match(result.toolResults[0].error ?? '', /boom/);
  assert.match(result.output, /Here is the result: success/);
});

test('runAgentChatLoop switches provider mid-loop when the next LLM turn fails', async () => {
  const fallbacks: string[] = [];
  let getNextCalls = 0;
  const result = await runAgentChatLoop(
    TOOL_REPLY,
    [{ role: 'user', content: 'hi' }],
    async (history) => {
      getNextCalls++;
      // First next-turn request throws (provider died); the loop must fall back.
      if (getNextCalls === 1) throw new Error('429 rate limit exceeded');
      // The fallback request receives the SAME history incl. the tool result.
      assert.ok(history.some((m) => m.role === 'tool'), 'tool result preserved across fallback');
      return FINAL_REPLY;
    },
    {
      maxTurns: 5,
      providerFallback: () => {
        fallbacks.push('groq');
        return 'groq';
      },
      executeTool: async () => ({ ok: true, data: { value: 42 } }),
    },
  );

  assert.deepEqual(fallbacks, ['groq'], 'fallback provider invoked once');
  assert.equal(getNextCalls, 2, 'next-turn request retried after failure');
  assert.equal(result.toolCalls.length, 1, 'tool executed before the failure');
  assert.match(result.output, /Here is the result: success/);
  assert.equal(result.needsRetry, false);
});

test('runAgentChatLoop rethrows AbortError (user cancel) without fallback', async () => {
  let getNextCalls = 0;
  let fallbacks = 0;
  await assert.rejects(
    runAgentChatLoop(
      TOOL_REPLY,
      [],
      async () => {
        getNextCalls++;
        const err = new Error('The user aborted a request.');
        err.name = 'AbortError';
        throw err;
      },
      {
        providerFallback: () => {
          fallbacks++;
          return 'groq';
        },
        executeTool: async () => ({ ok: true, data: {} }),
      },
    ),
    (e: unknown) => (e as Error)?.name === 'AbortError',
  );
  assert.equal(fallbacks, 0, 'cancel must not trigger provider fallback');
});

test('runAgentChatLoop returns history so a retry can resume from the same context', async () => {
  const result = await runAgentChatLoop(
    TOOL_REPLY,
    [{ role: 'user', content: 'hi' }],
    async (history) => {
      // Force a weak-reply stop AFTER a tool turn so needsRetry=true with history.
      return '';
    },
    {
      maxTurns: 5,
      providerFallback: () => 'groq',
      executeTool: async () => ({ ok: true, data: { value: 7 } }),
    },
  );

  assert.ok(Array.isArray(result.history));
  assert.ok(result.history.length > 0);
  assert.ok(result.history.some((m) => m.role === 'tool'), 'history carries the executed tool');
});
