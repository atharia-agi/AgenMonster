import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priorityScore, decideAttention, selectFocus, type AttentionItem } from '../src/lib/attentionEconomy.ts';

test('priorityScore = impact*urgency*confidence - cost', () => {
  const item: AttentionItem = { goalImpact: 0.8, urgency: 0.5, confidence: 0.9, cost: 0.1 };
  // 0.8*0.5*0.9 - 0.1 = 0.36 - 0.1 = 0.26
  assert.ok(Math.abs(priorityScore(item) - 0.26) < 1e-9);
});

test('priorityScore clamped 0..1', () => {
  const item: AttentionItem = { goalImpact: 1, urgency: 1, confidence: 1, cost: 0.99 };
  assert.ok(priorityScore(item) <= 1);
});

test('decideAttention focuses high, ignores low', () => {
  const high: AttentionItem = { goalImpact: 0.9, urgency: 0.9, confidence: 0.9, cost: 0.1 };
  const low: AttentionItem = { goalImpact: 0.1, urgency: 0.2, confidence: 0.3, cost: 0.5 };
  assert.equal(decideAttention(high), 'focus');
  assert.equal(decideAttention(low), 'ignore');
});

test('decideAttention defers mid priority', () => {
  const mid: AttentionItem = { goalImpact: 0.7, urgency: 0.7, confidence: 0.7, cost: 0.1 };
  // 0.7*0.7*0.7 - 0.1 = 0.343 - 0.1 = 0.243 → defer range
  const d = decideAttention(mid);
  assert.equal(d, 'defer');
});

test('selectFocus picks highest priority index', () => {
  const items: AttentionItem[] = [
    { goalImpact: 0.1, urgency: 0.1, confidence: 0.1, cost: 0.5 }, // ~ -0.45 -> 0
    { goalImpact: 0.9, urgency: 0.9, confidence: 0.9, cost: 0.1 }, // 0.729-0.1=0.629
    { goalImpact: 0.5, urgency: 0.5, confidence: 0.5, cost: 0.2 }, // 0.125-0.2=0
  ];
  assert.equal(selectFocus(items), 1);
});
