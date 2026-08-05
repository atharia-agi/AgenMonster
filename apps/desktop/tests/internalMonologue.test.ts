import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/lib/gameState.ts';
import { buildMonologuePrompt, generateMonologueFallback, generateInternalMonologue, addMonologue, getLatestMonologue } from '../src/lib/internalMonologue.ts';

test('buildMonologuePrompt includes all context fields', () => {
  const prompt = buildMonologuePrompt({
    mood: 'happy',
    energy: 0.8,
    activity: 'coding',
    stage: 'teen',
    personalityType: 'curious',
    goals: [{ title: 'Learn TS', progress: 0.5 }],
    topics: ['typescript', 'react'],
    lastInteractionMs: Date.now() - 300000,
  });
  assert.ok(prompt.includes('Mood: happy'));
  assert.ok(prompt.includes('Energy: 80%'));
  assert.ok(prompt.includes('Activity: coding'));
  assert.ok(prompt.includes('Stage: teen'));
  assert.ok(prompt.includes('Personality: curious'));
  assert.ok(prompt.includes('Active goal: Learn TS'));
  assert.ok(prompt.includes('Recent focus: typescript'));
});

test('buildMonologuePrompt handles missing goals and topics', () => {
  const prompt = buildMonologuePrompt({
    mood: 'idle',
    energy: 0.5,
    activity: 'idle',
    stage: 'egg',
    personalityType: 'shy',
    goals: [],
    topics: [],
    lastInteractionMs: Date.now() - 60000,
  });
  assert.ok(prompt.includes('No active goal'));
  assert.ok(prompt.includes('No recent topics'));
});

test('generateMonologueFallback uses personality phrases', () => {
  const fallback = generateMonologueFallback({
    mood: 'idle',
    energy: 0.5,
    activity: 'idle',
    stage: 'egg',
    personalityType: 'curious',
    goals: [],
    topics: [],
    lastInteractionMs: Date.now(),
  });
  assert.ok(typeof fallback === 'string');
  assert.ok(fallback.length > 0);
});

test('generateMonologueFallback includes topic and goal suffixes', () => {
  const fallback = generateMonologueFallback({
    mood: 'idle',
    energy: 0.5,
    activity: 'idle',
    stage: 'egg',
    personalityType: 'curious',
    goals: [{ title: 'Test Goal' }],
    topics: ['Test Topic'],
    lastInteractionMs: Date.now(),
  });
  assert.ok(fallback.includes('Test Topic'));
  assert.ok(fallback.includes('Test Goal'));
});

test('generateMonologueFallback includes energy suffix', () => {
  const lowEnergy = generateMonologueFallback({
    mood: 'tired',
    energy: 0.1,
    activity: 'idle',
    stage: 'egg',
    personalityType: 'shy',
    goals: [],
    topics: [],
    lastInteractionMs: Date.now(),
  });
  assert.ok(lowEnergy.includes('tired'));

  const highEnergy = generateMonologueFallback({
    mood: 'excited',
    energy: 0.9,
    activity: 'playing',
    stage: 'baby',
    personalityType: 'playful',
    goals: [],
    topics: [],
    lastInteractionMs: Date.now(),
  });
  assert.ok(highEnergy.includes('Full of energy'));
});

test('generateInternalMonologue falls back when no API key', async () => {
  const state = createInitialState();
  state.mood = 'idle';
  state.needs.energy = 50;
  state.activity = 'idle';
  state.stage = 'egg';
  state.personalityType = 'shy';
  state.goals = [];
  state.lastActivityTs = Date.now() - 60000;
  const result = await generateInternalMonologue(
    state,
    async () => ({ provider: 'groq', apiKey: '', model: 'llama-3.1-8b-instant' })
  );
  assert.ok(typeof result === 'string');
  assert.ok(result.length > 0);
});

test('generateInternalMonologue falls back on API error', async () => {
  const state = createInitialState();
  state.mood = 'happy';
  state.needs.energy = 80;
  state.activity = 'playing';
  state.stage = 'baby';
  state.personalityType = 'playful';
  state.goals = [];
  state.lastActivityTs = Date.now();
  const result = await generateInternalMonologue(
    state,
    async () => ({ provider: 'groq', apiKey: 'fake-key', model: 'llama-3.1-8b-instant' })
  );
  assert.ok(typeof result === 'string');
  assert.ok(result.length > 0);
});

test('addMonologue appends and truncates to MAX_MONOLOGUE', () => {
  const state = { internalMonologue: [] as string[] } as any;
  for (let i = 0; i < 25; i++) {
    const updated = addMonologue(state, `thought ${i}`);
    assert.ok(updated.internalMonologue.length <= 20);
  }
});

test('getLatestMonologue returns last entry or null', () => {
  assert.equal(getLatestMonologue({ internalMonologue: [] } as any), null);
  assert.equal(getLatestMonologue({ internalMonologue: ['a', 'b', 'c'] } as any), 'c');
});
