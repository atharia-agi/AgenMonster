import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, getAchievementProgress, getAchievementDef, getAchievementsByCategory } from '../src/lib/achievements.ts';
import { createInitialState } from '../src/lib/gameState.ts';

test('ACHIEVEMENTS has 18 achievements across 5 categories', () => {
  assert.ok(ACHIEVEMENTS.length >= 18);
  const cats = new Set(ACHIEVEMENTS.map(a => a.category));
  assert.ok(cats.has('story'));
  assert.ok(cats.has('exploration'));
  assert.ok(cats.has('crafting'));
  assert.ok(cats.has('pet_care'));
  assert.ok(cats.has('milestone'));
});

test('getAchievementDef returns correct definition', () => {
  const def = getAchievementDef('first_story');
  assert.ok(def);
  assert.equal(def.title, 'First Story');
  assert.equal(def.category, 'story');
});

test('getAchievementsByCategory returns only story achievements', () => {
  const story = getAchievementsByCategory('story');
  assert.ok(story.length > 0);
  for (const s of story) assert.equal(s.category, 'story');
});

test('getAchievementProgress earns first_story when questFlags has entries', () => {
  const state = createInitialState();
  const world = { ...state.world, questFlags: { cloud_storm_helped: 1 } };
  const progress = getAchievementProgress(world, state);
  const firstStory = progress.find(a => a.id === 'first_story');
  assert.ok(firstStory?.earned);
});

test('getAchievementProgress earns first_travel when visitedAreas > 1', () => {
  const state = createInitialState();
  const world = { ...state.world, visitedAreas: ['home_forest', 'token_river'] };
  const progress = getAchievementProgress(world, state);
  const firstTravel = progress.find(a => a.id === 'first_travel');
  assert.ok(firstTravel?.earned);
});

test('getAchievementProgress earns level_5 when level >= 5', () => {
  const state = createInitialState();
  const world = state.world;
  const updated = { ...state, level: 5 };
  const progress = getAchievementProgress(world, updated);
  const level5 = progress.find(a => a.id === 'level_5');
  assert.ok(level5?.earned);
});

test('getAchievementProgress does not earn level_5 when level < 5', () => {
  const state = createInitialState();
  const world = state.world;
  const updated = { ...state, level: 3 };
  const progress = getAchievementProgress(world, updated);
  const level5 = progress.find(a => a.id === 'level_5');
  assert.ok(!level5?.earned);
});

test('getAchievementProgress earns first_craft when items.length > 0', () => {
  const state = createInitialState();
  const world = state.world;
  const updated = { ...state, items: ['potion_hp'] };
  const progress = getAchievementProgress(world, updated);
  const firstCraft = progress.find(a => a.id === 'first_craft');
  assert.ok(firstCraft?.earned);
});

test('getAchievementProgress earns chain_master when chain completed', () => {
  const state = createInitialState();
  const world = { ...state.world, questFlags: { cloud_storm_completed: 1 } };
  const progress = getAchievementProgress(world, state);
  const chainMaster = progress.find(a => a.id === 'chain_master');
  assert.ok(chainMaster?.earned);
});

test('getAchievementProgress returns all 18 achievements', () => {
  const state = createInitialState();
  const progress = getAchievementProgress(state.world, state);
  assert.equal(progress.length, ACHIEVEMENTS.length);
});
