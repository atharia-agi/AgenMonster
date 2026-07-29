import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPetState,
  updateMood,
  decayEnergy,
  getMoodSummary,
  getRelationshipScore,
  type PetState,
  type Interaction,
} from '../src/lib/moodEnergy.ts';

test('createPetState has correct defaults', () => {
  const pet = createPetState();
  assert.equal(pet.mood, 'neutral');
  assert.equal(pet.energy, 1.0);
  assert.equal(pet.relationship, 0.5);
  assert.equal(pet.conversationCount, 0);
  assert.equal(pet.totalTokensToday, 0);
  assert.equal(pet.moodHistory.length, 0);
});

test('mood shifts to tired after idle interaction', () => {
  const pet = createPetState();
  const result = updateMood(pet, { type: 'idle' });
  assert.equal(result.mood, 'tired');
});

test('energy decays linearly over 24h', () => {
  const pet = createPetState();
  const result = decayEnergy(pet, 24);
  assert.ok(result.energy < 0.01);
});

test('relationship increases by 0.1 per followed suggestion', () => {
  const pet = createPetState();
  const result = updateMood(pet, { type: 'followed_suggestion' });
  assert.equal(result.relationship, 0.6);
});

test('relationship decreases by 0.05 per ignored suggestion', () => {
  const pet = createPetState();
  const result = updateMood(pet, { type: 'ignored_suggestion' });
  assert.equal(result.relationship, 0.45);
});

test('mood history capped at 30 entries (FIFO)', () => {
  let state = createPetState();
  for (let i = 0; i < 35; i++) {
    state = updateMood(state, { type: 'idle' });
  }
  assert.equal(state.moodHistory.length, 30);
});

test('getMoodSummary returns today dominant mood', () => {
  let state = createPetState();
  state = updateMood(state, { type: 'positive_emoji' });
  state = updateMood(state, { type: 'positive_emoji' });
  state = updateMood(state, { type: 'ignored_suggestion' });
  const summary = getMoodSummary(state);
  assert.equal(summary, 'happy');
});

test('mood does not flip more than +-1 step per interaction', () => {
  let state = createPetState();
  state = updateMood(state, { type: 'followed_suggestion' });
  assert.equal(state.mood, 'happy');
  state = updateMood(state, { type: 'followed_suggestion' });
  assert.equal(state.mood, 'happy');
});

test('multiple interactions in sequence compound correctly', () => {
  let state = createPetState();
  state = updateMood(state, { type: 'followed_suggestion' });
  state = updateMood(state, { type: 'followed_suggestion' });
  state = updateMood(state, { type: 'followed_suggestion' });
  assert.equal(state.mood, 'happy');
  assert.ok(state.relationship > 0.5);
  assert.equal(state.moodHistory.length, 3);
});

test('mood cannot go above happy (clamped)', () => {
  let state = createPetState();
  state = updateMood(state, { type: 'followed_suggestion' });
  assert.equal(state.mood, 'happy');
});

test('mood cannot go below frustrated (clamped)', () => {
  let state = createPetState();
  state = updateMood(state, { type: 'ignored_suggestion' });
  state = updateMood(state, { type: 'ignored_suggestion' });
  state = updateMood(state, { type: 'ignored_suggestion' });
  assert.equal(state.mood, 'frustrated');
});