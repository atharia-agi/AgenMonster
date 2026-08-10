import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_QUEST_DEFS,
  createDailyQuests,
  getDailyQuests,
  updateDailyQuestProgress,
  claimDailyQuestReward,
  getCompletedDailyQuests,
  getTodayDate,
} from '../src/lib/dailyQuests.ts';
import { createInitialState } from '../src/lib/gameState.ts';

test('DAILY_QUEST_DEFS has at least 5 quest definitions', () => {
  assert.ok(DAILY_QUEST_DEFS.length >= 5);
});

test('getTodayDate returns ISO date string YYYY-MM-DD', () => {
  const today = getTodayDate();
  assert.ok(typeof today === 'string');
  assert.ok(today.match(/^\d{4}-\d{2}-\d{2}$/));
});

test('createDailyQuests returns 3 random quests with today date', () => {
  const quests = createDailyQuests();
  assert.equal(quests.length, 3);
  for (const q of quests) {
    assert.ok(q.id);
    assert.equal(q.date, getTodayDate());
    assert.equal(q.progress, 0);
    assert.equal(q.completed, false);
    assert.equal(q.claimed, false);
  }
});

test('getDailyQuests returns existing quests for today', () => {
  const state = createInitialState();
  const quests = getDailyQuests(state);
  assert.ok(Array.isArray(quests));
});

test('updateDailyQuestProgress increments progress', () => {
  const state = createInitialState();
  const quests = createDailyQuests();
  const questId = quests[0].id;
  const stateWithQuests = { ...state, dailyQuests: quests };
  const updated = updateDailyQuestProgress(stateWithQuests, questId, 1);
  const quest = updated.dailyQuests.find((q: any) => q.id === questId);
  assert.equal(quest.progress, 1);
});

test('updateDailyQuestProgress marks completed when max reached', () => {
  const state = createInitialState();
  const quests = createDailyQuests();
  const quest = { ...quests[0], maxProgress: 2 };
  const stateWithQuests = { ...state, dailyQuests: [quest] };
  const updated = updateDailyQuestProgress(stateWithQuests, quest.id, 2);
  const q = updated.dailyQuests.find((q: any) => q.id === quest.id);
  assert.equal(q.completed, true);
});

test('claimDailyQuestReward marks quest as claimed', () => {
  const state = createInitialState();
  const quest = {
    id: 'test_xp',
    title: 'Test',
    description: 'Test quest',
    progress: 1,
    maxProgress: 1,
    completed: true,
    claimed: false,
    rewardType: 'xp' as const,
    rewardAmount: 50,
    date: getTodayDate(),
  };
  const stateWithQuests = { ...state, dailyQuests: [quest] };
  const updated = claimDailyQuestReward(stateWithQuests, 'test_xp');
  const q = updated.dailyQuests.find((q: any) => q.id === 'test_xp');
  assert.equal(q.claimed, true);
});

test('claimDailyQuestReward does not modify currency', () => {
  const state = createInitialState();
  const quest = {
    id: 'test_currency',
    title: 'Test',
    description: 'Test quest',
    progress: 1,
    maxProgress: 1,
    completed: true,
    claimed: false,
    rewardType: 'currency' as const,
    rewardAmount: 100,
    date: getTodayDate(),
  };
  const stateWithQuests = { ...state, dailyQuests: [quest], currency: 0 };
  const updated = claimDailyQuestReward(stateWithQuests, 'test_currency');
  assert.equal(updated.currency, 0);
});

test('claimDailyQuestReward does nothing if already claimed', () => {
  const state = createInitialState();
  const quest = {
    id: 'test_done',
    title: 'Test',
    description: 'Test quest',
    progress: 1,
    maxProgress: 1,
    completed: true,
    claimed: true,
    rewardType: 'xp' as const,
    rewardAmount: 50,
    date: getTodayDate(),
  };
  const stateWithQuests = { ...state, dailyQuests: [quest] };
  const updated = claimDailyQuestReward(stateWithQuests, 'test_done');
  assert.equal(updated.dailyQuests[0].claimed, true);
  assert.equal(updated.dailyQuests[0].claimed, true);
});

test('getCompletedDailyQuests returns only completed quests', () => {
  const state = createInitialState();
  const quests = [
    { id: 'q1', completed: true, claimed: false, date: getTodayDate() },
    { id: 'q2', completed: false, claimed: false, date: getTodayDate() },
    { id: 'q3', completed: true, claimed: true, date: getTodayDate() },
  ];
  const completed = getCompletedDailyQuests({ ...state, dailyQuests: quests });
  assert.equal(completed.length, 2);
});
