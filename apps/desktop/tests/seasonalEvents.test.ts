import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORY_EVENTS, meetsRequirements } from '../src/lib/eventEngine.ts';
import type { WorldState } from '../src/lib/worldEngine.ts';

function makeWorld(overrides: Partial<WorldState> = {}): WorldState {
  return {
    currentArea: 'home_forest',
    unlockedAreas: ['home_forest', 'token_river', 'bug_dungeon', 'cloud_server', 'neon_circuit', 'void_sea'],
    visitedAreas: ['home_forest'],
    weather: 'clear',
    season: 'spring',
    dayCount: 1,
    lastTickTs: Date.now(),
    eventsCompletedToday: [],
    activeEventId: null,
    explorationXp: 10,
    questFlags: {},
    npcFriendship: {},
    npcMet: {},
    npcBondMilestones: {},
    ...overrides,
  };
}

test('seasonal story chains exist for all 4 seasons', () => {
  const ids = STORY_EVENTS.map(s => s.id);
  assert.ok(ids.includes('dark_frost_chain_1'));
  assert.ok(ids.includes('dark_frost_chain_2'));
  assert.ok(ids.includes('festival_bloom_chain_1'));
  assert.ok(ids.includes('festival_bloom_chain_2'));
  assert.ok(ids.includes('neon_rave_chain_1'));
  assert.ok(ids.includes('neon_rave_chain_2'));
  assert.ok(ids.includes('harvest_festival_chain_1'));
  assert.ok(ids.includes('harvest_festival_chain_2'));
});

test('dark frost chain 1 requires winter season', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'dark_frost_chain_1')!;
  const winter = makeWorld({ season: 'winter', currentArea: 'cloud_server', explorationXp: 10 });
  const summer = makeWorld({ season: 'summer', currentArea: 'cloud_server', explorationXp: 10 });
  assert.ok(!meetsRequirements(ev.requirements, summer));
  assert.ok(meetsRequirements(ev.requirements, winter));
});

test('festival bloom chain 1 requires spring season', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'festival_bloom_chain_1')!;
  const spring = makeWorld({ season: 'spring', currentArea: 'home_forest', explorationXp: 10 });
  const winter = makeWorld({ season: 'winter', currentArea: 'home_forest', explorationXp: 10 });
  assert.ok(!meetsRequirements(ev.requirements, winter));
  assert.ok(meetsRequirements(ev.requirements, spring));
});

test('neon rave chain 1 requires summer season', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'neon_rave_chain_1')!;
  const summer = makeWorld({ season: 'summer', currentArea: 'neon_circuit', explorationXp: 10 });
  const winter = makeWorld({ season: 'winter', currentArea: 'neon_circuit', explorationXp: 10 });
  assert.ok(!meetsRequirements(ev.requirements, winter));
  assert.ok(meetsRequirements(ev.requirements, summer));
});

test('harvest festival chain 1 requires autumn season', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'harvest_festival_chain_1')!;
  const autumn = makeWorld({ season: 'autumn', currentArea: 'token_river', explorationXp: 10 });
  const spring = makeWorld({ season: 'spring', currentArea: 'token_river', explorationXp: 10 });
  assert.ok(!meetsRequirements(ev.requirements, spring));
  assert.ok(meetsRequirements(ev.requirements, autumn));
});

test('dark frost chain 1 also requires cloud_server area', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'dark_frost_chain_1')!;
  const wrongArea = makeWorld({ season: 'winter', currentArea: 'home_forest', explorationXp: 10 });
  const rightArea = makeWorld({ season: 'winter', currentArea: 'cloud_server', explorationXp: 10 });
  assert.ok(!meetsRequirements(ev.requirements, wrongArea));
  assert.ok(meetsRequirements(ev.requirements, rightArea));
});

test('dark frost chain 2 grants explorationXp on choice', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'dark_frost_chain_2')!;
  const world = makeWorld({ questFlags: { dark_frost_investigated: 1 }, explorationXp: 10, season: 'winter' });
  const result = ev.choices![0].effect(world);
  assert.equal(result.questFlags?.dark_frost_resolved, 1);
  assert.equal(result.explorationXp, 80);
});

test('neon rave chain 2 grants explorationXp on choice', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'neon_rave_chain_2')!;
  const world = makeWorld({ questFlags: { neon_rave_joined: 1 }, explorationXp: 10, season: 'summer' });
  const result = ev.choices![0].effect(world);
  assert.equal(result.questFlags?.neon_rave_rewarded, 1);
  assert.equal(result.explorationXp, 50);
});
