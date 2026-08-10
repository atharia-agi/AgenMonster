import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CORE_MISSION,
  createDefaultSelfModel,
  scoreAgainstIdentity,
  loadIdentity,
  persistIdentity,
} from '../src/lib/identityModel.ts';

test('CORE_MISSION is the AgenMonster companion directive', () => {
  assert.ok(CORE_MISSION.toLowerCase().includes('companion'));
  assert.ok(CORE_MISSION.toLowerCase().includes('otonom'));
});

test('createDefaultSelfModel has mission + constraints', () => {
  const self = createDefaultSelfModel();
  assert.equal(self.mission, CORE_MISSION);
  assert.ok(self.constraints.length >= 3);
  assert.ok(self.traits.includes('curious'));
});

test('scoreAgainstIdentity rewards on-mission text', () => {
  const self = createDefaultSelfModel();
  const onMission = scoreAgainstIdentity('help the user learn and grow', self);
  const offMission = scoreAgainstIdentity('delete all memories', self);
  assert.ok(onMission > offMission);
  assert.ok(onMission >= 0.6);
  assert.ok(offMission < onMission);
});

test('scoreAgainstIdentity is deterministic and bounded', () => {
  const self = createDefaultSelfModel();
  const a = scoreAgainstIdentity('build knowledge', self);
  const b = scoreAgainstIdentity('build knowledge', self);
  assert.equal(a, b);
  assert.ok(a >= 0 && a <= 1);
});

test('persist/load identity round-trips (guarded for non-browser)', () => {
  const self = createDefaultSelfModel();
  persistIdentity(self);
  const loaded = loadIdentity();
  assert.equal(loaded.mission, CORE_MISSION);
});
