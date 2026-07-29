import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectRoutine, getRoutineForToday, type RoutinePattern } from '../src/lib/routine.ts';
import type { Episode } from '../src/lib/memory.ts';

function dateOn(dayOfWeek: number, hour: number): Date {
  const d = new Date();
  const currentDay = d.getDay();
  const diff = ((currentDay - dayOfWeek + 7) % 7) || 7;
  d.setDate(d.getDate() - diff);
  d.setHours(hour, 0, 0, 0);
  d.setMinutes(0, 0, 0);
  return d;
}

function ep(title: string, dayOfWeek: number, hour: number): Episode {
  const d = dateOn(dayOfWeek, hour);
  return {
    id: `e-${dayOfWeek}-${hour}-${title}`,
    ts: d.getTime(),
    kind: 'success',
    title,
    detail: '',
    tags: [],
    confidence: 1,
  };
}

test('empty episodes returns empty array', () => {
  assert.deepEqual(detectRoutine([]), []);
});

test('5 TypeScript episodes all on Mondays at 10am -> confidence 1.0', () => {
  const episodes = [
    ep('TypeScript', 1, 10),
    ep('TypeScript', 1, 10),
    ep('TypeScript', 1, 10),
    ep('TypeScript', 1, 10),
    ep('TypeScript', 1, 10),
  ];
  const [r] = detectRoutine(episodes);
  assert.ok(r);
  assert.equal(r.task, 'TypeScript');
  assert.ok(r.daysOfWeek.includes(1));
  assert.equal(r.hourRange[0], 10);
  assert.equal(r.confidence, 1.0);
});

test('3 episodes scattered across different days -> no routine', () => {
  const episodes = [ep('A', 1, 9), ep('B', 2, 10), ep('C', 3, 11)];
  assert.deepEqual(detectRoutine(episodes), []);
});

test('minimum 3 occurrences required', () => {
  const episodes = [
    ep('Rust', 1, 10),
    ep('Rust', 1, 10),
  ];
  assert.deepEqual(detectRoutine(episodes), []);
});

test('returns sorted routines (highest confidence first)', () => {
  const episodes = [
    ep('TS', 1, 10),
    ep('TS', 1, 10),
    ep('TS', 1, 10),
    ep('Rust', 1, 14),
    ep('Rust', 1, 14),
    ep('Rust', 1, 14),
    ep('Rust', 1, 14),
  ];
  const routines = detectRoutine(episodes);
  assert.ok(routines.length >= 2);
  assert.ok(routines[0].confidence >= routines[1].confidence);
});

test('getRoutineForToday returns only today matching routine', () => {
  const today = new Date().getDay();
  const routines: RoutinePattern[] = [
    { task: 'TS', daysOfWeek: [1, 2, 3], hourRange: [10, 11], confidence: 0.9 },
    { task: 'Python', daysOfWeek: [4, 5], hourRange: [14, 15], confidence: 0.8 },
  ];
  const todayRoutines = getRoutineForToday(routines);
  for (const r of todayRoutines) {
    assert.ok(r.daysOfWeek.includes(today));
  }
});

test('routine with 3/10 episodes -> confidence 0.3 (filtered out)', () => {
  const episodes = [
    ep('X', 1, 10),
    ep('X', 1, 10),
    ep('X', 1, 10),
    ep('A', 1, 9),
    ep('B', 2, 9),
    ep('C', 3, 9),
    ep('D', 4, 9),
    ep('E', 5, 9),
    ep('F', 6, 9),
    ep('G', 0, 9),
  ];
  const routines = detectRoutine(episodes);
  assert.deepEqual(routines, []);
});