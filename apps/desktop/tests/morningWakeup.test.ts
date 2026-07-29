import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMorningWakeup, runMorningWakeup } from '../src/lib/morningWakeup.ts';

test('first interaction of day triggers wake-up message', () => {
  const msg = buildMorningWakeup({
    yesterdayRecap: null,
    todayRoutines: [],
    mood: 'idle',
    energy: 1.0,
    pendingGoals: [],
    alreadyGreetedToday: false,
  });
  assert.ok(msg !== null);
  assert.ok(msg!.includes('Good morning'));
});

test('second+ interaction of same day does NOT trigger', () => {
  const msg = buildMorningWakeup({
    yesterdayRecap: null,
    todayRoutines: [],
    mood: 'idle',
    energy: 1.0,
    pendingGoals: [],
    alreadyGreetedToday: true,
  });
  assert.equal(msg, null);
});

test('wake-up includes yesterday recap when available', () => {
  const msg = buildMorningWakeup({
    yesterdayRecap: 'Worked on TypeScript and deployed',
    todayRoutines: [],
    mood: 'idle',
    energy: 1.0,
    pendingGoals: [],
    alreadyGreetedToday: false,
  });
  assert.ok(msg!.includes('Yesterday: Worked on TypeScript and deployed'));
});

test('wake-up excludes recap when no prior episodes exist', () => {
  const msg = buildMorningWakeup({
    yesterdayRecap: null,
    todayRoutines: [],
    mood: 'idle',
    energy: 1.0,
    pendingGoals: [],
    alreadyGreetedToday: false,
  });
  assert.ok(!msg!.includes('Yesterday:'));
});