import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAnalytics } from '../src/lib/analytics.ts';

test('computeAnalytics returns daysActive >= 1', () => {
  const gs = {
    stage: 'egg' as const,
    mood: 'idle' as const,
    activity: 'idle' as const,
    level: 1,
    xp: 0,
    xpToNext: 50,
    name: 'AgenMonster',
    version: 1,
    needs: { hunger: 50, energy: 50, focus: 50, mood: 50, affection: 50, motivation: 50, knowledge: 50 },
    relationshipLevel: 'stranger' as const,
    relationshipXp: 0,
    relationshipXpToNext: 100,
    missions: [],
    completedMissions: 0,
    tools: [],
    activeTasks: [],
    crystals: [],
    maxCrystals: 50,
    skills: [],
    chatMessages: [],
    _totalMessages: 0,
    _totalToolUses: 0,
    _totalTasksCompleted: 0,
    _sessionStart: Date.now() - 3600000,
    lastActivityTs: Date.now(),
  };
  const result = computeAnalytics(gs as any);
  assert.equal(result.daysActive, 1);
});

test('computeAnalytics counts totalMessages correctly', () => {
  const gs = {
    stage: 'egg' as const,
    mood: 'idle' as const,
    activity: 'idle' as const,
    level: 1, xp: 0, xpToNext: 50, name: 'AgenMonster', version: 1,
    needs: { hunger: 50, energy: 50, focus: 50, mood: 50, affection: 50, motivation: 50, knowledge: 50 },
    relationshipLevel: 'stranger' as const,
    relationshipXp: 0, relationshipXpToNext: 100,
    missions: [], completedMissions: 0, tools: [], activeTasks: [], crystals: [], maxCrystals: 50, skills: [],
    chatMessages: [],
    _totalMessages: 42,
    _totalToolUses: 0,
    _totalTasksCompleted: 0,
    _sessionStart: Date.now(),
    lastActivityTs: Date.now(),
  };
  const result = computeAnalytics(gs as any);
  assert.equal(result.totalMessages, 42);
});

test('computeAnalytics returns relationshipLevel from state', () => {
  const gs = {
    stage: 'egg' as const,
    mood: 'idle' as const,
    activity: 'idle' as const,
    level: 1, xp: 0, xpToNext: 50, name: 'AgenMonster', version: 1,
    needs: { hunger: 50, energy: 50, focus: 50, mood: 50, affection: 50, motivation: 50, knowledge: 50 },
    relationshipLevel: 'best_friend' as const,
    relationshipXp: 0, relationshipXpToNext: 100,
    missions: [], completedMissions: 0, tools: [], activeTasks: [], crystals: [], maxCrystals: 50, skills: [],
    chatMessages: [],
    _totalMessages: 0,
    _totalToolUses: 0,
    _totalTasksCompleted: 0,
    _sessionStart: Date.now(),
    lastActivityTs: Date.now(),
  };
  const result = computeAnalytics(gs as any);
  assert.equal(result.relationshipLevel, 'best_friend');
});

test('computeAnalytics uptimeMs is positive', () => {
  const gs = {
    stage: 'egg' as const,
    mood: 'idle' as const,
    activity: 'idle' as const,
    level: 1, xp: 0, xpToNext: 50, name: 'AgenMonster', version: 1,
    needs: { hunger: 50, energy: 50, focus: 50, mood: 50, affection: 50, motivation: 50, knowledge: 50 },
    relationshipLevel: 'stranger' as const,
    relationshipXp: 0, relationshipXpToNext: 100,
    missions: [], completedMissions: 0, tools: [], activeTasks: [], crystals: [], maxCrystals: 50, skills: [],
    chatMessages: [],
    _totalMessages: 0,
    _totalToolUses: 0,
    _totalTasksCompleted: 0,
    _sessionStart: Date.now() - 7200000,
    lastActivityTs: Date.now(),
  };
  const result = computeAnalytics(gs as any);
  assert.ok(result.uptimeMs >= 7000000);
});

test('computeAnalytics includes currentStage and currentLevel', () => {
  const gs = {
    stage: 'child' as const,
    mood: 'happy' as const,
    activity: 'idle' as const,
    level: 5, xp: 30, xpToNext: 100, name: 'AgenMonster', version: 1,
    needs: { hunger: 50, energy: 50, focus: 50, mood: 50, affection: 50, motivation: 50, knowledge: 50 },
    relationshipLevel: 'friend' as const,
    relationshipXp: 0, relationshipXpToNext: 100,
    missions: [], completedMissions: 0, tools: [], activeTasks: [], crystals: [], maxCrystals: 50, skills: [],
    chatMessages: [],
    _totalMessages: 10,
    _totalToolUses: 0,
    _totalTasksCompleted: 0,
    _sessionStart: Date.now(),
    lastActivityTs: Date.now(),
  };
  const result = computeAnalytics(gs as any);
  assert.equal(result.currentStage, 'child');
  assert.equal(result.currentLevel, 5);
});