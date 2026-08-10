import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmotionalState,
  processEmotionEvent,
  decayEmotion,
  padToMood,
  getBehavioralTone,
  getModelRoutingHint,
  describePAD,
  getValenceSummary,
  baselinePAD,
  type EmotionalState,
} from '../src/lib/emotionEngine.ts';
import type { PersonalityProfile } from '../src/lib/personality.ts';

const TEST_PERSONALITY: PersonalityProfile = {
  type: 'brave',
  name: 'Brave',
  description: 'test',
  greetings: [],
  idlePhrases: [],
  successPhrases: [],
  errorPhrases: [],
  hungryPhrases: [],
  tiredPhrases: [],
  excitedPhrases: [],
  thinkingPhrases: [],
  toolPreference: [],
  riskTolerance: 0.7,
  energyEfficiency: 0.5,
  learningSpeed: 0.5,
  preferredMoods: [],
  idleAnimations: [],
};

test('createEmotionalState seeds PAD from personality baseline', () => {
  const s = createEmotionalState(TEST_PERSONALITY);
  assert.equal(typeof s.pad.pleasure, 'number');
  assert.equal(typeof s.pad.arousal, 'number');
  assert.equal(typeof s.pad.dominance, 'number');
  assert.ok(s.pad.pleasure >= -1 && s.pad.pleasure <= 1);
  assert.ok(s.pad.arousal >= -1 && s.pad.arousal <= 1);
  assert.ok(s.pad.dominance >= -1 && s.pad.dominance <= 1);
  assert.equal(s.ctem.eventCount, 0);
});

test('baselinePAD maps high riskTolerance to high dominance', () => {
  const bold: PersonalityProfile = { ...TEST_PERSONALITY, riskTolerance: 1 };
  const timid: PersonalityProfile = { ...TEST_PERSONALITY, riskTolerance: 0 };
  assert.ok(baselinePAD(bold).dominance > baselinePAD(timid).dominance);
});

test('positive events raise pleasure, negative events lower it', () => {
  let s = createEmotionalState(TEST_PERSONALITY);
  const before = s.pad.pleasure;
  s = processEmotionEvent(s, 'user_praise');
  assert.ok(s.pad.pleasure > before, `expected pleasure up, got ${before} -> ${s.pad.pleasure}`);

  const high = s.pad.pleasure;
  s = processEmotionEvent(s, 'task_fail');
  assert.ok(s.pad.pleasure < high, `expected pleasure down, got ${high} -> ${s.pad.pleasure}`);
});

test('cross-temporal loop persists emotional momentum', () => {
  let s = createEmotionalState(TEST_PERSONALITY);
  for (let i = 0; i < 5; i++) s = processEmotionEvent(s, 'user_praise');
  assert.ok(s.ctem.valenceMomentum > 0.3, `expected positive momentum, got ${s.ctem.valenceMomentum}`);
  assert.equal(s.ctem.eventCount, 5);
  assert.equal(s.ctem.lastEvent, 'user_praise');
});

test('decayEmotion returns toward baseline', () => {
  const s0 = createEmotionalState(TEST_PERSONALITY);
  let s = processEmotionEvent(s0, 'user_praise');
  const base = baselinePAD(TEST_PERSONALITY);
  const pushed = s.pad.pleasure;
  assert.ok(Math.abs(pushed - base.pleasure) > 0.1);

  s = decayEmotion(s, s0.pad.ts + 300_000);
  assert.ok(
    Math.abs(s.pad.pleasure - base.pleasure) < Math.abs(pushed - base.pleasure),
    `expected decay toward baseline, got ${s.pad.pleasure}`
  );
});

test('padToMood returns a valid Mood', () => {
  const s = createEmotionalState(TEST_PERSONALITY);
  const valid = new Set(['happy','sad','proud','focused','idle','neutral','excited','sleepy','frustrated','tired','thinking','angry','dormant']);
  assert.ok(valid.has(padToMood(s.pad)));
});

test('frustration maps to frustrated mood', () => {
  let s = createEmotionalState(TEST_PERSONALITY);
  for (let i = 0; i < 2; i++) s = processEmotionEvent(s, 'task_fail');
  assert.equal(padToMood(s.pad), 'frustrated');
});

test('repeated failures escalate frustration to anger', () => {
  let s = createEmotionalState(TEST_PERSONALITY);
  for (let i = 0; i < 6; i++) s = processEmotionEvent(s, 'task_fail');
  assert.equal(padToMood(s.pad), 'angry');
});

test('excitement maps to excited mood', () => {
  let s = createEmotionalState(TEST_PERSONALITY);
  for (let i = 0; i < 4; i++) s = processEmotionEvent(s, 'deploy_success');
  assert.equal(padToMood(s.pad), 'excited');
});

test('getBehavioralTone is coupled to PAD state', () => {
  let happy = createEmotionalState(TEST_PERSONALITY);
  for (let i = 0; i < 4; i++) happy = processEmotionEvent(happy, 'user_praise');

  let sad = createEmotionalState(TEST_PERSONALITY);
  for (let i = 0; i < 4; i++) sad = processEmotionEvent(sad, 'task_fail');

  const happyTone = getBehavioralTone(happy);
  const sadTone = getBehavioralTone(sad);
  assert.ok(happyTone.empathy > sadTone.empathy);
  assert.equal(typeof happyTone.toneLabel, 'string');
  assert.ok(happyTone.proactivity >= 0 && happyTone.proactivity <= 1);
});

test('getModelRoutingHint escalates on frustration', () => {
  let s = createEmotionalState(TEST_PERSONALITY);
  for (let i = 0; i < 6; i++) s = processEmotionEvent(s, 'tool_error');
  const hint = getModelRoutingHint(s);
  assert.equal(hint.escalate, true);
  assert.ok(['expert', 'premium'].includes(hint.modelTier));
});

test('getModelRoutingHint relaxes on calm confident state', () => {
  let s = createEmotionalState({ ...TEST_PERSONALITY, riskTolerance: 1, energyEfficiency: 0.9, learningSpeed: 0.1 });
  s = processEmotionEvent(s, 'task_complete');
  const hint = getModelRoutingHint(s);
  assert.equal(hint.escalate, false);
});

test('describePAD and getValenceSummary produce strings', () => {
  const s = createEmotionalState(TEST_PERSONALITY);
  assert.match(describePAD(s.pad), /P -?\d\.\d\d/);
  assert.equal(typeof getValenceSummary(s), 'string');
});

test('getValenceSummary reflects streak', () => {
  let s = createEmotionalState(TEST_PERSONALITY);
  for (let i = 0; i < 5; i++) s = processEmotionEvent(s, 'deploy_success');
  assert.equal(getValenceSummary(s), 'on a good streak');

  let s2 = createEmotionalState(TEST_PERSONALITY);
  for (let i = 0; i < 5; i++) s2 = processEmotionEvent(s2, 'energy_critical');
  assert.equal(getValenceSummary(s2), 'in a rough patch');
});
