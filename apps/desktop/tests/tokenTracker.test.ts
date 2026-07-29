import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  estimateTokens,
  recordTokenUsage,
  getTokenState,
  formatCost,
  formatTokens,
  resetTokenState,
  getDailySpend,
} from '../src/lib/tokenTracker.ts';

test('estimateTokens uses ceil(chars/4) heuristic', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens('hi'), 1); // 2/4 = 0.5 → 1
  assert.equal(estimateTokens('hello'), 2); // 5/4 = 1.25 → 2
  assert.equal(estimateTokens('hello world'), 3); // 11/4 = 2.75 → 3
});

test('recordTokenUsage accumulates promptTokens + completionTokens', () => {
  resetTokenState();
  recordTokenUsage({
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    task: 'CODE',
    promptText: 'Explain this typescript bug',
    completionText: 'Try this approach: use generics',
  });
  const s = getTokenState();
  assert.ok(s.lastCallTokens > 0);
  assert.equal(s.promptTokens > 0, true);
  assert.equal(s.completionTokens > 0, true);
  assert.ok(s.byRoute['groq/llama-3.3-70b-versatile#CODE'].calls === 1);
});

test('recordTokenUsage computes cost from pricing table', () => {
  resetTokenState();
  recordTokenUsage({
    provider: 'openai',
    model: 'gpt-4o',
    task: 'CHAT',
    promptText: 'x'.repeat(400), // 100 tokens
    completionText: 'y'.repeat(400), // 100 tokens
  });
  const s = getTokenState();
  // gpt-4o: input $0.0025/1K, output $0.01/1K → 100*0.0025/1000 + 100*0.01/1000 = 0.00025 + 0.001 = 0.00125
  assert.ok(s.totalCost > 0.001 && s.totalCost < 0.002);
});

test('formatCost renders sub-penny values gracefully', () => {
  assert.equal(formatCost(0), '$0');
  assert.equal(formatCost(0.00005), '<$0.0001');
  assert.equal(formatCost(0.005), '$0.0050');
  assert.equal(formatCost(0.5), '$0.500');
  assert.equal(formatCost(2.5), '$2.50');
});

test('formatTokens scales K and M correctly', () => {
  assert.equal(formatTokens(50), '50');
  assert.equal(formatTokens(1500), '1.5K');
  assert.equal(formatTokens(2_000_000), '2.00M');
});

test('recordTokenUsage accumulates per-route correctly', () => {
  resetTokenState();
  recordTokenUsage({
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    task: 'CHAT',
    promptText: 'hello',
    completionText: 'world',
  });
  const s = getTokenState();
  const key = Object.keys(s.byRoute)[0];
  assert.ok(key.startsWith('groq/llama-3.3-70b-versatile#CHAT'));
  assert.equal(s.byRoute[key].calls, 1);
});

test('getDailySpend returns totals within last 24h window', () => {
  resetTokenState();
  const before = getDailySpend();
  assert.equal(before.total, 0);
  recordTokenUsage({
    provider: 'openai',
    model: 'gpt-4o',
    task: 'CHAT',
    promptText: 'a'.repeat(400),
    completionText: 'b'.repeat(400),
  });
  const after = getDailySpend();
  assert.ok(after.total > 0);
  assert.ok(after.byProvider.openai !== undefined);
});

test('estimateTokens uses ceil(chars/4) heuristic', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens('abcd'), 1);
  assert.equal(estimateTokens('abcdefgh'), 2);
});

test('recordTokenUsage computes cost from pricing table', () => {
  resetTokenState();
  recordTokenUsage({
    provider: 'openai',
    model: 'gpt-4o',
    task: 'CHAT',
    promptText: 'a'.repeat(1000),
    completionText: 'b'.repeat(1000),
  });
  const s = getTokenState();
  const key = Object.keys(s.byRoute)[0];
  assert.ok(s.byRoute[key].cost > 0);
});

test('formatCost renders sub-penny values gracefully', () => {
  assert.equal(formatCost(0.001), '$0.0010');
  assert.equal(formatCost(0.00005), '<$0.0001');
});

test('formatTokens scales K and M correctly', () => {
  assert.equal(formatTokens(50), '50');
  assert.equal(formatTokens(1500), '1.5K');
  assert.equal(formatTokens(2_000_000), '2.00M');
});
