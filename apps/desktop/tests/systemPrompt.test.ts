import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt, type SystemPromptContext } from '../src/lib/systemPrompt.ts';
import { PERSONALITY_PROFILES } from '../src/lib/personality.ts';

const baseCtx: SystemPromptContext = {
  mood: 'neutral',
  energy: 1.0,
  relationship: 0.5,
  relationshipLevel: 'friend',
  stage: 'adult',
};

const personality = PERSONALITY_PROFILES.calm;

test('buildSystemPrompt returns non-empty string', () => {
  const result = buildSystemPrompt(baseCtx, personality, null, []);
  assert.ok(result.length > 0);
  assert.ok(result.includes('AgenMonster'));
});

test('buildSystemPrompt includes mood tone words when energy is low', () => {
  const lowEnergy = { ...baseCtx, energy: 0.2 };
  const result = buildSystemPrompt(lowEnergy, personality, null, []);
  assert.ok(result.toLowerCase().includes('brief') || result.toLowerCase().includes('low-key') || result.toLowerCase().includes('concise'));
});

test('buildSystemPrompt includes goal block when active goal exists', () => {
  const goal = {
    id: 'g1',
    title: 'deploy to prod',
    steps: [
      { id: 's1', title: 'review changes', done: true },
      { id: 's2', title: 'run tests', done: false },
    ],
    createdAt: Date.now(),
    source: 'manual' as const,
  };
  const result = buildSystemPrompt(baseCtx, personality, goal, []);
  assert.ok(result.includes('deploy to prod'));
  assert.ok(result.includes('Progress:'));
  assert.ok(result.includes('Next step:'));
});

test('buildSystemPrompt includes recalled memories', () => {
  const memories = ['User prefers TypeScript over JavaScript', 'Project uses SvelteKit 5'];
  const result = buildSystemPrompt(baseCtx, personality, null, memories);
  assert.ok(result.includes('User prefers TypeScript over JavaScript'));
  assert.ok(result.includes('Project uses SvelteKit 5'));
});

test('buildSystemPrompt relationship score affects greeting formality', () => {
  const stranger = { ...baseCtx, relationshipLevel: 'stranger' as const, relationship: 0.1 };
  const companion = { ...baseCtx, relationshipLevel: 'best_friend' as const, relationship: 0.9 };

  const resultStranger = buildSystemPrompt(stranger, personality, null, []);
  const resultCompanion = buildSystemPrompt(companion, personality, null, []);

  assert.ok(resultStranger.includes('stranger') || resultStranger.includes('Acquaintance'));
  assert.ok(resultCompanion.includes('best_friend') || resultCompanion.includes('Companion'));
  assert.ok(resultStranger !== resultCompanion);
});

test('buildSystemPrompt includes drift note when personality drift triggered', () => {
  const result = buildSystemPrompt(baseCtx, personality, null, [], { shift: 'genius', reason: 'lots of code' });
  assert.ok(result.includes('drifted'));
  assert.ok(result.includes('genius'));
});