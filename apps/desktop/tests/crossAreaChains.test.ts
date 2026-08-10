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

test('cross-area chains exist: lost artifact, glitch cure, and ancient code', () => {
  const ids = STORY_EVENTS.map(s => s.id);
  assert.ok(ids.includes('lost_artifact_chain_1'));
  assert.ok(ids.includes('lost_artifact_chain_5'));
  assert.ok(ids.includes('glitch_cure_chain_1'));
  assert.ok(ids.includes('glitch_cure_chain_5'));
  assert.ok(ids.includes('ancient_code_chain_1'));
  assert.ok(ids.includes('ancient_code_chain_8'));
});

test('lost artifact chain 1 has no area requirement', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'lost_artifact_chain_1')!;
  assert.ok(meetsRequirements(ev.requirements, makeWorld()));
});

test('lost artifact chain 2 grants questFlag and XP', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'lost_artifact_chain_2')!;
  const world = makeWorld({ questFlags: { lost_artifact_quest: 1 }, explorationXp: 10 });
  const result = ev.choices![0].effect(world);
  assert.equal(result.questFlags?.lost_artifact_forest, 1);
  assert.equal(result.explorationXp, 40);
});

test('lost artifact chain 3 requires forest fragment', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'lost_artifact_chain_3')!;
  const without = makeWorld({ questFlags: { lost_artifact_quest: 1 }, explorationXp: 11 });
  const withFlag = makeWorld({ questFlags: { lost_artifact_quest: 1, lost_artifact_forest: 1 }, explorationXp: 11 });
  assert.ok(!meetsRequirements(ev.requirements, without));
  assert.ok(meetsRequirements(ev.requirements, withFlag));
});

test('lost artifact chain 5 requires all 3 fragments', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'lost_artifact_chain_5')!;
  const partial = makeWorld({ questFlags: { lost_artifact_forest: 1, lost_artifact_river: 1 }, explorationXp: 12 });
  const complete = makeWorld({ questFlags: { lost_artifact_forest: 1, lost_artifact_river: 1, lost_artifact_dungeon: 1 }, explorationXp: 12 });
  assert.ok(!meetsRequirements(ev.requirements, partial));
  assert.ok(meetsRequirements(ev.requirements, complete));
});

test('lost artifact chain 5 grants 100 XP on completion', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'lost_artifact_chain_5')!;
  const world = makeWorld({ questFlags: { lost_artifact_forest: 1, lost_artifact_river: 1, lost_artifact_dungeon: 1 }, explorationXp: 12 });
  const result = ev.choices![0].effect(world);
  assert.equal(result.explorationXp, 112);
  assert.equal(result.questFlags?.lost_artifact_complete, 1);
});

test('glitch cure chain 2 requires neon_circuit area', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'glitch_cure_chain_2')!;
  const wrongArea = makeWorld({ questFlags: { glitch_cure_quest: 1 }, explorationXp: 14 });
  const rightArea = makeWorld({ questFlags: { glitch_cure_quest: 1 }, currentArea: 'neon_circuit', explorationXp: 14 });
  assert.ok(!meetsRequirements(ev.requirements, wrongArea));
  assert.ok(meetsRequirements(ev.requirements, rightArea));
});

test('glitch cure chain 4 requires storm ingredient from cloud_server', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'glitch_cure_chain_4')!;
  const world = makeWorld({ questFlags: { glitch_cure_neon: 1, glitch_cure_void: 1 }, currentArea: 'cloud_server', explorationXp: 16 });
  assert.ok(meetsRequirements(ev.requirements, world));
});

test('glitch cure chain 5 requires all 3 ingredients', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'glitch_cure_chain_5')!;
  const partial = makeWorld({ questFlags: { glitch_cure_neon: 1, glitch_cure_void: 1 }, explorationXp: 16 });
  const complete = makeWorld({ questFlags: { glitch_cure_neon: 1, glitch_cure_void: 1, glitch_cure_storm: 1 }, explorationXp: 16 });
  assert.ok(!meetsRequirements(ev.requirements, partial));
  assert.ok(meetsRequirements(ev.requirements, complete));
});

test('glitch cure chain 5 grants 150 XP on completion', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'glitch_cure_chain_5')!;
  const world = makeWorld({ questFlags: { glitch_cure_neon: 1, glitch_cure_void: 1, glitch_cure_storm: 1 }, explorationXp: 16 });
  const result = ev.choices![0].effect(world);
  assert.equal(result.explorationXp, 166);
  assert.equal(result.questFlags?.glitch_cure_complete, 1);
});

test('ancient code chain 2 grants questFlag and XP', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'ancient_code_chain_2')!;
  const world = makeWorld({ questFlags: { ancient_code_quest: 1 }, explorationXp: 15 });
  const result = ev.choices![0].effect(world);
  assert.equal(result.questFlags?.ancient_code_forest, 1);
  assert.equal(result.explorationXp, 40);
});

test('ancient code chain 3 requires forest fragment', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'ancient_code_chain_3')!;
  const without = makeWorld({ questFlags: { ancient_code_quest: 1 }, explorationXp: 16 });
  const withFlag = makeWorld({ questFlags: { ancient_code_quest: 1, ancient_code_forest: 1 }, currentArea: 'token_river', explorationXp: 16 });
  assert.ok(!meetsRequirements(ev.requirements, without));
  assert.ok(meetsRequirements(ev.requirements, withFlag));
});

test('ancient code chain 5 requires dungeon fragment', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'ancient_code_chain_5')!;
  const without = makeWorld({ questFlags: { ancient_code_river: 1 }, explorationXp: 18 });
  const withFlag = makeWorld({ questFlags: { ancient_code_river: 1, ancient_code_dungeon: 1 }, currentArea: 'neon_circuit', explorationXp: 18 });
  assert.ok(!meetsRequirements(ev.requirements, without));
  assert.ok(meetsRequirements(ev.requirements, withFlag));
});

test('ancient code chain 8 requires all 6 fragments', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'ancient_code_chain_8')!;
  const partial = makeWorld({ questFlags: { ancient_code_forest: 1, ancient_code_river: 1, ancient_code_dungeon: 1 }, explorationXp: 20 });
  const complete = makeWorld({ questFlags: { ancient_code_forest: 1, ancient_code_river: 1, ancient_code_dungeon: 1, ancient_code_neon: 1, ancient_code_void: 1, ancient_code_storm: 1 }, explorationXp: 20 });
  assert.ok(!meetsRequirements(ev.requirements, partial));
  assert.ok(meetsRequirements(ev.requirements, complete));
});

test('ancient code chain 8 grants 200 XP on completion', () => {
  const ev = STORY_EVENTS.find(s => s.id === 'ancient_code_chain_8')!;
  const world = makeWorld({ questFlags: { ancient_code_forest: 1, ancient_code_river: 1, ancient_code_dungeon: 1, ancient_code_neon: 1, ancient_code_void: 1, ancient_code_storm: 1 }, explorationXp: 20 });
  const result = ev.choices![0].effect(world);
  assert.equal(result.explorationXp, 220);
  assert.equal(result.questFlags?.ancient_code_complete, 1);
});
