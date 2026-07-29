import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt } from '../src/lib/systemPrompt.ts';
import { PERSONALITY_PROFILES } from '../src/lib/personality.ts';
import type { SystemPromptContext } from '../src/lib/systemPrompt.ts';
import type { RoutinePattern } from '../src/lib/routine.ts';

const ctx: SystemPromptContext = {
  mood: 'neutral',
  energy: 1.0,
  relationship: 0.5,
  relationshipLevel: 'friend',
  stage: 'adult',
};

test('buildSystemPrompt includes routine block when routines exist', () => {
  const routines: RoutinePattern[] = [
    { task: 'TypeScript', daysOfWeek: [1, 2, 3], hourRange: [10, 11], confidence: 0.9 },
  ];
  const result = buildSystemPrompt(ctx, PERSONALITY_PROFILES.calm, null, [], null, routines);
  assert.ok(result.includes('Routine patterns:'));
  assert.ok(result.includes('TypeScript'));
});

test('buildSystemPrompt omits routine block when no routines passed', () => {
  const result = buildSystemPrompt(ctx, PERSONALITY_PROFILES.calm, null, [], null, []);
  assert.ok(!result.includes('Routine patterns:'));
});