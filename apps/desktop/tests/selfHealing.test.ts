import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  detectNeeds,
  generateHealingPlan,
  applyHealing,
  getBestHealingAction,
  getHealingSummary,
  tickSelfHealing,
  createInitialSelfHealingState,
} from '../src/lib/selfHealing.ts';

describe('Self-healing system', () => {
  it('detectNeeds returns critical for needs <= 20', () => {
    const result = detectNeeds({ hunger: 10, affection: 50, energy: 50, focus: 50, mood: 50, motivation: 50, knowledge: 50 });
    assert.ok(result.critical.includes('hunger'));
    assert.strictEqual(result.warning.length, 0);
    assert.strictEqual(result.healthy, false);
  });

  it('detectNeeds returns warning for needs <= 40 but > 20', () => {
    const result = detectNeeds({ hunger: 35, affection: 50, energy: 50, focus: 50, mood: 50, motivation: 50, knowledge: 50 });
    assert.ok(result.warning.includes('hunger'));
    assert.strictEqual(result.critical.length, 0);
    assert.strictEqual(result.healthy, true);
  });

  it('detectNeeds returns healthy when all needs > 40', () => {
    const result = detectNeeds({ hunger: 60, affection: 60, energy: 60, focus: 60, mood: 60, motivation: 60, knowledge: 60 });
    assert.strictEqual(result.critical.length, 0);
    assert.strictEqual(result.warning.length, 0);
    assert.strictEqual(result.healthy, true);
  });

  it('generateHealingPlan returns rest for critical energy', () => {
    const state = createInitialSelfHealingState();
    const needs = { hunger: 50, affection: 50, energy: 10, focus: 50, mood: 50, motivation: 50, knowledge: 50 };
    const plans = generateHealingPlan(needs, state);
    assert.ok(plans.length > 0);
    assert.strictEqual(plans[0].action, 'rest');
    assert.strictEqual(plans[0].priority, 10);
  });

  it('generateHealingPlan returns play for critical mood', () => {
    const state = createInitialSelfHealingState();
    const needs = { hunger: 50, affection: 10, energy: 50, focus: 50, mood: 10, motivation: 50, knowledge: 50 };
    const plans = generateHealingPlan(needs, state);
    const playPlan = plans.find((p) => p.action === 'play');
    assert.ok(playPlan);
    assert.strictEqual(playPlan.priority, 9);
  });

  it('applyHealing rest increases energy', () => {
    const state = createInitialSelfHealingState();
    const needs = { hunger: 50, affection: 50, energy: 10, focus: 50, mood: 50, motivation: 50, knowledge: 50 };
    const result = applyHealing(needs, 'rest', state);
    assert.ok(result.needs.energy > needs.energy);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.healingState.totalHeals, 1);
    assert.strictEqual(result.healingState.successfulHeals, 1);
  });

  it('applyHealing respects cooldown', () => {
    const state = createInitialSelfHealingState();
    state.lastHealTs = Date.now();
    const needs = { hunger: 50, affection: 50, energy: 10, focus: 50, mood: 50, motivation: 50, knowledge: 50 };
    const result = applyHealing(needs, 'rest', state);
    assert.strictEqual(result.success, false);
  });

  it('getBestHealingAction returns best action for critical needs', () => {
    const state = createInitialSelfHealingState();
    const needs = { hunger: 10, affection: 50, energy: 10, focus: 50, mood: 50, motivation: 50, knowledge: 50 };
    const action = getBestHealingAction(needs, state);
    assert.ok(action === 'rest' || action === 'play');
  });

  it('getBestHealingAction returns null when needs are healthy', () => {
    const state = createInitialSelfHealingState();
    const needs = { hunger: 80, affection: 80, energy: 80, focus: 80, mood: 80, motivation: 80, knowledge: 80 };
    const action = getBestHealingAction(needs, state);
    assert.strictEqual(action, null);
  });

  it('getHealingSummary returns informative text', () => {
    const state = createInitialSelfHealingState();
    assert.strictEqual(getHealingSummary(state), 'No healing actions taken yet.');
  });

  it('getHealingSummary returns stats after heals', () => {
    const state = createInitialSelfHealingState();
    state.totalHeals = 10;
    state.successfulHeals = 8;
    state.improvementScore = 80;
    const summary = getHealingSummary(state);
    assert.ok(summary.includes('10 actions'));
    assert.ok(summary.includes('80%'));
    assert.ok(summary.includes('80'));
  });

  it('tickSelfHealing applies healing for critical needs', () => {
    const state = createInitialSelfHealingState();
    const needs = { hunger: 10, affection: 50, energy: 10, focus: 50, mood: 50, motivation: 50, knowledge: 50 };
    const result = tickSelfHealing(needs, state, Date.now());
    assert.ok(result.actionTaken !== null);
    assert.ok(result.healingState.totalHeals >= 1);
  });

  it('tickSelfHealing does nothing when needs are healthy', () => {
    const state = createInitialSelfHealingState();
    const needs = { hunger: 80, affection: 80, energy: 80, focus: 80, mood: 80, motivation: 80, knowledge: 80 };
    const result = tickSelfHealing(needs, state, Date.now());
    assert.strictEqual(result.actionTaken, null);
  });

  it('applyHealing tracks learned patterns', () => {
    const state = createInitialSelfHealingState();
    const needs = { hunger: 10, affection: 50, energy: 10, focus: 50, mood: 50, motivation: 50, knowledge: 50 };
    const result = applyHealing(needs, 'rest', state);
    assert.ok(result.healingState.learnedPatterns.length >= 1);
    assert.ok(result.healingState.learnedPatterns[0].successRate >= 0);
  });
});