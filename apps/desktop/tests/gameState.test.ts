import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  getGameState,
  dispatchEvent,
  migrate,
  exportState,
  importState,
  SCHEMA_VERSION,
} from '../src/lib/gameState.ts';

test('fresh state starts at egg with seeded welcome messages', () => {
  const s = createInitialState();
  assert.equal(s.stage, 'egg');
  assert.equal(s.level, 1);
  assert.equal(s.version, SCHEMA_VERSION);
  assert.ok(s.chatMessages.length >= 2);
});

test('chat event grants XP and records the message', () => {
  const before = getGameState();
  const xpBefore = before.xp;
  const msgBefore = before._totalMessages;
  dispatchEvent({ type: 'chat', data: { text: 'hello' } });
  const after = getGameState();
  assert.ok(after.xp >= xpBefore);
  assert.equal(after._totalMessages, msgBefore + 1);
});

test('stage evolves once XP threshold is crossed', () => {
  for (let i = 0; i < 20; i++) dispatchEvent({ type: 'chat', data: { text: 'x' } });
  const after = getGameState();
  const totalXp = after.xp + (after.level - 1) * 50;
  assert.ok(totalXp >= 50, 'should have enough total XP to evolve past egg');
  assert.notEqual(after.stage, 'egg');
});

test('migration fills missing nested fields from an older save', () => {
  const old: any = {
    stage: 'baby',
    level: 3,
    xp: 250,
    needs: { hunger: 10 }, // older save missing most need fields
    // missing: mood, activity, skills, chatMessages, tools, etc.
  };
  const m = migrate(old);
  assert.equal(m.version, SCHEMA_VERSION);
  assert.equal(m.stage, 'baby');
  assert.equal(m.needs.hunger, 10);
  assert.equal(typeof m.needs.energy, 'number');
  assert.equal(m.needs.energy, createInitialState().needs.energy);
  assert.ok(Array.isArray(m.skills) && m.skills.length > 0);
  assert.ok(Array.isArray(m.chatMessages));
  assert.ok(Array.isArray(m.tools) && m.tools.length > 0);
});

test('migration drops unknown legacy fields', () => {
  const old: any = { stage: 'child', someOldField: 'leak', needs: { hunger: 5 } };
  const m = migrate(old) as any;
  assert.equal(m.someOldField, undefined);
});

test('export/import round-trips state', () => {
  dispatchEvent({ type: 'chat', data: { text: 'roundtrip' } });
  const json = exportState();
  const re = importState(json);
  assert.equal(re._totalMessages, getGameState()._totalMessages);
});

test('importing invalid JSON throws', () => {
  assert.throws(() => importState('not json{'));
});
