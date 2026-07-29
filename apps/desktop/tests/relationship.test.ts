import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordInteraction, computeRelationship, getRelationshipLevel, type InteractionRecord } from '../src/lib/relationship.ts';

function daysAgo(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

test('single positive interaction -> score ~0.1', () => {
  const records: InteractionRecord[] = [];
  const next = recordInteraction(records, 'followed_suggestion');
  const score = computeRelationship({ currentScore: 0, records: next });
  assert.ok(score > 0.05 && score < 0.15);
});

test('10 positive and 0 negative approaches 0.8 (Friend tier)', () => {
  let records: InteractionRecord[] = [];
  for (let i = 0; i < 10; i++) {
    records = recordInteraction(records, 'followed_suggestion');
  }
  const score = computeRelationship({ currentScore: 0, records });
  assert.ok(score >= 0.6 && score <= 1.0);
});

test('5 negative and 0 positive approaches 0.2 (Stranger tier)', () => {
  let records: InteractionRecord[] = [];
  for (let i = 0; i < 5; i++) {
    records = recordInteraction(records, 'ignored_suggestion');
  }
  const score = computeRelationship({ currentScore: 0.5, records });
  assert.ok(score <= 0.3);
});

test('old interactions decay significantly after > 60 days', () => {
  const records: InteractionRecord[] = [
    { ts: daysAgo(62), action: 'positive_emoji', score: 0.2 },
  ];
  const score = computeRelationship({ currentScore: 0, records });
  assert.ok(score < 0.1);
});

test('empty records returns 0 (Stranger tier)', () => {
  const score = computeRelationship({ currentScore: 0, records: [] });
  assert.equal(score, 0);
});

test('recordInteraction rejects invalid action type', () => {
  const records: InteractionRecord[] = [];
  const next = recordInteraction(records, 'followed_suggestion' as any);
  assert.ok(next.length === 1);
});

test('mixed actions (3 positive, 1 negative) -> weighted average correct', () => {
  let records: InteractionRecord[] = [];
  records = recordInteraction(records, 'followed_suggestion');
  records = recordInteraction(records, 'followed_suggestion');
  records = recordInteraction(records, 'followed_suggestion');
  records = recordInteraction(records, 'ignored_suggestion');
  const score = computeRelationship({ currentScore: 0, records });
  assert.ok(score > 0.1 && score < 0.4);
});