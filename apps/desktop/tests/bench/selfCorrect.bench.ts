// Benchmark 4: Self-Correction Evaluation
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateReply } from '../../src/lib/selfCorrect.ts';
import { runBenchmark, checkBudgets } from './harness.ts';

const testReplies = [
  { reply: 'Here is a clear, specific answer with concrete details.', durationMs: 1200, recentFailureCount: 0 },
  { reply: "I'm not sure, but try this generic approach.", durationMs: 1200, recentFailureCount: 0 },
  { reply: 'I cannot help you with that request.', durationMs: 1200, recentFailureCount: 0 },
  { reply: '', durationMs: 1200, recentFailureCount: 0 },
  { reply: 'k.', durationMs: 1200, recentFailureCount: 0 },
  { reply: 'Here is the answer.', durationMs: 400, recentFailureCount: 3 },
  { reply: "I don't know as an AI, I cannot help with that.", durationMs: 1200, recentFailureCount: 0 },
  { reply: 'TypeScript is a typed superset of JavaScript.', durationMs: 1200, recentFailureCount: 0 },
  { reply: 'I cannot access that file because it is outside the allowed sandbox.', durationMs: 1200, recentFailureCount: 0 },
  { reply: 'I am just a language model, so I cannot answer that.', durationMs: 1200, recentFailureCount: 0 },
];

function makeSignals(over: any = {}) {
  return {
    reply: 'Here is a clear, specific answer with concrete details.',
    durationMs: 1200,
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    recentFailureCount: 0,
    costGuardBlocked: false,
    correctionsUsedThisSession: 0,
    maxCorrectionsPerSession: 2,
    ...over,
  };
}

test('bench: self-correction evaluation', async () => {
  const results = await runBenchmark({
    name: 'self-correction-evaluation',
    fn: () => {
      for (const t of testReplies) {
        evaluateReply(makeSignals(t));
      }
    },
    iterations: 5000,
    warmup: 500,
  });
  
  assert.ok(checkBudgets(results), 'Budget exceeded for self-correction-evaluation');
});

test('bench: weak phrase matching', async () => {
  const weakReplies = [
    "I'm not sure about that.",
    'I cannot assist with that request.',
    'I can\'t help you with that.',
    'I don\'t have access to that information.',
    'As an AI language model, I cannot do that.',
  ];
  
  const results = await runBenchmark({
    name: 'weak-phrase-matching',
    fn: () => {
      for (const r of weakReplies) {
        evaluateReply(makeSignals({ reply: r }));
      }
    },
    iterations: 10000,
    warmup: 1000,
  });
  
  assert.ok(checkBudgets(results), 'Budget exceeded for weak-phrase-matching');
});