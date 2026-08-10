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

test('meetsRequirements passes with no requirements', () => {
  const world = makeWorld();
  assert.ok(meetsRequirements(undefined, world));
});

test('meetsRequirements blocks when minLevel not met', () => {
  const world = makeWorld({ explorationXp: 1 });
  assert.ok(!meetsRequirements({ minLevel: 5 }, world));
});

test('meetsRequirements passes when minLevel met', () => {
  const world = makeWorld({ explorationXp: 10 });
  assert.ok(meetsRequirements({ minLevel: 5 }, world));
});

test('meetsRequirements blocks when requiredFlags missing', () => {
  const world = makeWorld({ questFlags: {} });
  assert.ok(!meetsRequirements({ requiredFlags: ['cloud_storm_helped'] }, world));
});

test('meetsRequirements passes when requiredFlags present', () => {
  const world = makeWorld({ questFlags: { cloud_storm_helped: 1 } });
  assert.ok(meetsRequirements({ requiredFlags: ['cloud_storm_helped'] }, world));
});

test('meetsRequirements blocks when requiredAreas does not match', () => {
  const world = makeWorld({ currentArea: 'home_forest' });
  assert.ok(!meetsRequirements({ requiredAreas: ['cloud_server'] }, world));
});

test('meetsRequirements passes when requiredAreas matches', () => {
  const world = makeWorld({ currentArea: 'cloud_server' });
  assert.ok(meetsRequirements({ requiredAreas: ['cloud_server'] }, world));
});

test('STORY_EVENTS contains 7 new area-specific chains', () => {
  const storyIds = STORY_EVENTS.map(s => s.id);
  const expected = [
    'cloud_storm_chain_1',
    'cloud_storm_chain_2',
    'bug_outbreak_chain_1',
    'bug_outbreak_chain_2',
    'neon_glitch_chain_1',
    'neon_glitch_chain_2',
    'river_guardian_chain_1',
    'river_guardian_chain_2',
    'void_signal_chain_1',
    'void_signal_chain_2',
  ];
  for (const id of expected) {
    assert.ok(storyIds.includes(id), `missing story event: ${id}`);
  }
});

test('cloud storm chain 1 requires cloud_server area', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'cloud_storm_chain_1')!;
  const wrongArea = makeWorld({ currentArea: 'home_forest', explorationXp: 10 });
  const rightArea = makeWorld({ currentArea: 'cloud_server', explorationXp: 10 });
  assert.ok(!meetsRequirements(ev.requirements, wrongArea));
  assert.ok(meetsRequirements(ev.requirements, rightArea));
});

test('cloud storm chain 1 grants questFlag on choice', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'cloud_storm_chain_1')!;
  const world = makeWorld();
  const effect = ev.choices![0].effect;
  const result = effect(world);
  assert.equal(result.questFlags?.cloud_storm_helped, 1);
});

test('cloud storm chain 2 requires cloud_storm_helped flag', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'cloud_storm_chain_2')!;
  const withoutFlag = makeWorld({ questFlags: {}, explorationXp: 10 });
  const withFlag = makeWorld({ questFlags: { cloud_storm_helped: 1 }, explorationXp: 10 });
  assert.ok(!meetsRequirements(ev.requirements, withoutFlag));
  assert.ok(meetsRequirements(ev.requirements, withFlag));
});

test('cloud storm chain 2 grants explorationXp on choice', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'cloud_storm_chain_2')!;
  const world = makeWorld({ questFlags: { cloud_storm_helped: 1 }, explorationXp: 10 });
  const result = ev.choices![0].effect(world);
  assert.equal(result.explorationXp, 60);
});

test('bug outbreak chain 1 requires bug_dungeon area', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'bug_outbreak_chain_1')!;
  const wrongArea = makeWorld({ currentArea: 'home_forest', explorationXp: 10 });
  const rightArea = makeWorld({ currentArea: 'bug_dungeon', explorationXp: 10 });
  assert.ok(!meetsRequirements(ev.requirements, wrongArea));
  assert.ok(meetsRequirements(ev.requirements, rightArea));
});

test('bug outbreak chain 2 grants explorationXp on destroy choice', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'bug_outbreak_chain_2')!;
  const world = makeWorld({ questFlags: { bug_outbreak_contained: 1 }, explorationXp: 10 });
  const result = ev.choices![0].effect(world);
  assert.equal(result.explorationXp, 70);
  assert.equal(result.questFlags?.bug_outbreak_resolved, 1);
});

test('void signal chain 1 requires void_sea area and level 12', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'void_signal_chain_1')!;
  const lowLevel = makeWorld({ currentArea: 'void_sea', explorationXp: 5 });
  const rightLevel = makeWorld({ currentArea: 'void_sea', explorationXp: 15 });
  assert.ok(!meetsRequirements(ev.requirements, lowLevel));
  assert.ok(meetsRequirements(ev.requirements, rightLevel));
});

test('void signal chain 2 grants Void Artifact reward', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'void_signal_chain_2')!;
  const world = makeWorld({ questFlags: { void_signal_investigated: 1 }, explorationXp: 15 });
  const result = ev.choices![0].effect(world);
  assert.equal(result.questFlags?.void_project_helped, 1);
  assert.equal(result.explorationXp, 95);
});

test('river guardian chain 1 requires token_river area', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'river_guardian_chain_1')!;
  const wrongArea = makeWorld({ currentArea: 'home_forest', explorationXp: 10 });
  const rightArea = makeWorld({ currentArea: 'token_river', explorationXp: 10 });
  assert.ok(!meetsRequirements(ev.requirements, wrongArea));
  assert.ok(meetsRequirements(ev.requirements, rightArea));
});

test('neon glitch chain 1 requires neon_circuit area', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'neon_glitch_chain_1')!;
  const wrongArea = makeWorld({ currentArea: 'home_forest', explorationXp: 10 });
  const rightArea = makeWorld({ currentArea: 'neon_circuit', explorationXp: 10 });
  assert.ok(!meetsRequirements(ev.requirements, wrongArea));
  assert.ok(meetsRequirements(ev.requirements, rightArea));
});
