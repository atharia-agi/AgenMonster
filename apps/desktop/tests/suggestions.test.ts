import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSuggestions } from '../src/lib/suggestions.ts';
import type { RoutinePattern } from '../src/lib/routine.ts';

const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
};

function freezeNow(iso: string): number {
  return new Date(iso).getTime();
}

test('routine-based suggestion returned when routine exists', () => {
  const routines: RoutinePattern[] = [
    { task: 'TypeScript', daysOfWeek: [1, 2, 3], hourRange: [10, 11], confidence: 0.9 },
  ];
  const now = freezeNow('2025-01-15T10:00:00Z');
  const suggestions = getSuggestions(routines, [], 'typescript', now);
  assert.ok(suggestions.some((s) => s.text.includes('TypeScript')));
});

test('suggestion cooldown prevents repeat suggestions', () => {
  for (const k of Object.keys(store)) delete store[k];
  const routines: RoutinePattern[] = [
    { task: 'TypeScript', daysOfWeek: [1, 2, 3], hourRange: [10, 11], confidence: 0.9 },
  ];
  const now = freezeNow('2025-01-15T10:00:00Z');
  const first = getSuggestions(routines, [], 'typescript', now);
  assert.ok(first.length > 0);
  const second = getSuggestions(routines, [], 'typescript', now);
  assert.equal(second.length, 0);
});

test('friday suggestion returned only on fridays', () => {
  const nowFriday = freezeNow('2025-01-17T10:00:00Z');
  const friday = getSuggestions([], [], 'anything', nowFriday);
  assert.ok(friday.some((s) => s.reason === 'friday'));

  const nowThursday = freezeNow('2025-01-16T10:00:00Z');
  const thursday = getSuggestions([], [], 'anything', nowThursday);
  assert.ok(!thursday.some((s) => s.reason === 'friday'));
});

test('goal-pending suggestion returned when pending goal exists', () => {
  const suggestions = getSuggestions([], ['deploy to prod'], 'deploy', Date.now());
  assert.ok(suggestions.some((s) => s.text.includes('deploy to prod')));
});

test('ignored suggestion triggers cooldown', () => {
  for (const k of Object.keys(store)) delete store[k];
  const routines: RoutinePattern[] = [
    { task: 'TypeScript', daysOfWeek: [1, 2, 3], hourRange: [10, 11], confidence: 0.9 },
  ];
  const now = freezeNow('2025-01-15T10:00:00Z');
  const first = getSuggestions(routines, ['deploy'], 'typescript', now);
  assert.ok(first.length > 0);
  const second = getSuggestions(routines, ['deploy'], 'typescript', now + 1000);
  assert.equal(second.length, 0);
});