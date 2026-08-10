import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CRAFTING_RECIPES,
  canCraft,
  craftItem,
  getAvailableRecipes,
  addItem,
  getItem,
} from '../src/lib/items.ts';
import { createInitialState } from '../src/lib/gameState.ts';

function withItems(state: any, itemIds: string[]): any {
  let s = state;
  for (const id of itemIds) {
    s = addItem(s, id);
  }
  return s;
}

test('CRAFTING_RECIPES has at least 5 recipes', () => {
  assert.ok(CRAFTING_RECIPES.length >= 5);
});

test('canCraft returns false when missing ingredients', () => {
  const state = createInitialState();
  assert.ok(!canCraft(state, 'craft_hp_potion'));
});

test('canCraft returns true when all ingredients available', () => {
  const state = createInitialState();
  const withIngredients = withItems(withItems(state, ['token_leaf', 'token_leaf']), ['rare_token']);
  assert.ok(canCraft(withIngredients, 'craft_hp_potion'));
});

test('craftItem removes ingredients and adds result', () => {
  const state = createInitialState();
  const withIngredients = withItems(withItems(state, ['token_leaf', 'token_leaf']), ['rare_token']);
  const result = craftItem(withIngredients, 'craft_hp_potion');
  assert.ok(!result.items.includes('token_leaf'));
  assert.ok(!result.items.includes('rare_token'));
  assert.ok(result.items.includes('potion_hp'));
});

test('craftItem does nothing when recipe cannot be crafted', () => {
  const state = createInitialState();
  const result = craftItem(state, 'craft_hp_potion');
  assert.equal(result.items.length, state.items.length);
});

test('getAvailableRecipes returns only craftable recipes', () => {
  const state = createInitialState();
  const withIngredients = withItems(withItems(state, ['token_leaf', 'token_leaf']), ['rare_token']);
  const available = getAvailableRecipes(withIngredients);
  assert.ok(available.some(r => r.id === 'craft_hp_potion'));
  assert.ok(!available.some(r => r.id === 'craft_sp_potion'));
});

test('crafting SP Potion requires debug_gem and neon_chip', () => {
  const state = createInitialState();
  const withIngredients = withItems(withItems(state, ['debug_gem']), ['neon_chip']);
  const result = craftItem(withIngredients, 'craft_sp_potion');
  assert.ok(result.items.includes('potion_sp'));
  assert.ok(!result.items.includes('debug_gem'));
  assert.ok(!result.items.includes('neon_chip'));
});

test('crafting Revive requires void_artifact and storm_crystal', () => {
  const state = createInitialState();
  const withIngredients = withItems(withItems(state, ['void_artifact']), ['storm_crystal']);
  const result = craftItem(withIngredients, 'craft_revive');
  assert.ok(result.items.includes('revive'));
  assert.ok(!result.items.includes('void_artifact'));
  assert.ok(!result.items.includes('storm_crystal'));
});
