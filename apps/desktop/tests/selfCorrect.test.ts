import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateReply, type QualitySignals } from '../src/lib/selfCorrect.ts';

function sig(over: Partial<QualitySignals> = {}): QualitySignals {
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

test('evaluateReply returns none for a normal reply', () => {
  const d = evaluateReply(sig());
  assert.equal(d.verdict, 'none');
});

test('evaluateReply retries on empty reply', () => {
  const d = evaluateReply(sig({ reply: '' }));
  assert.equal(d.verdict, 'retry');
  assert.match(d.reason, /Empty reply/);
});

test('evaluateReply retries on very short reply', () => {
  const d = evaluateReply(sig({ reply: 'k.' }));
  assert.equal(d.verdict, 'retry');
  assert.match(d.reason, /too short/);
});

test('evaluateReply retries when reply contains a weak disclaimer', () => {
  const d = evaluateReply(sig({ reply: "I'm not sure, but try this generic approach." }));
  assert.equal(d.verdict, 'retry');
  assert.match(d.reason, /weak/i);
});

test('evaluateReply returns none when cost guard already intervened', () => {
  const d = evaluateReply(sig({ reply: "I don't know.", costGuardBlocked: true }));
  assert.equal(d.verdict, 'none');
});

test('evaluateReply blocks when session cap is reached', () => {
  const d = evaluateReply(sig({ reply: '', correctionsUsedThisSession: 2 }));
  assert.equal(d.verdict, 'block');
});

test('evaluateReply retries when fast + recent failure rate high', () => {
  const d = evaluateReply(sig({
    reply: 'Here is the answer.',
    durationMs: 400,
    recentFailureCount: 3,
  }));
  assert.equal(d.verdict, 'retry');
});

test('evaluateReply counts multiple weak phrases', () => {
  const d = evaluateReply(sig({
    reply: "I'm not sure as an AI, I cannot help with that.",
  }));
  assert.equal(d.verdict, 'retry');
  assert.ok(d.reason.includes('weak'));
});

test('evaluateReply does not retry on cost guard block when no weak phrases', () => {
  const d = evaluateReply(sig({ reply: "Here is the concrete answer.", costGuardBlocked: true }));
  assert.equal(d.verdict, 'none');
});

test('evaluateReply does not retry when duration is normal and failure count is low', () => {
  const d = evaluateReply(sig({
    reply: "Here is a concrete answer with details.",
    durationMs: 1000,
    recentFailureCount: 0,
  }));
  assert.equal(d.verdict, 'none');
});

test('countWeakPhrases returns 0 for strong reply', () => {
  const s = evaluateReply(sig({ reply: "TypeScript is a typed superset of JavaScript." }));
  assert.equal(s.verdict, 'none');
});

test('evaluateReply ignores case for weak phrases', () => {
  const d = evaluateReply(sig({ reply: "I DON'T KNOW the answer." }));
  assert.equal(d.verdict, 'retry');
});

test('evaluateReply blocks on block-list phrases even if short', () => {
  const d = evaluateReply(sig({ reply: 'I am completely sure this is safe and secure. No problems at all.', costGuardBlocked: true }));
  assert.equal(d.verdict, 'none');
});

test('evaluateReply retries empty reply cost guard not yet blocked', () => {
  const d = evaluateReply(sig({ reply: '', costGuardBlocked: false }));
  assert.equal(d.verdict, 'retry');
});

test('evaluateReply does not retry when cap reached and reply is strong', () => {
  const d = evaluateReply(sig({ reply: 'Here is the concrete answer.', correctionsUsedThisSession: 2 }));
  assert.equal(d.verdict, 'block');
});

test('evaluateReply retries on very short one-char reply', () => {
  const d = evaluateReply(sig({ reply: 'x' }));
  assert.equal(d.verdict, 'retry');
});
