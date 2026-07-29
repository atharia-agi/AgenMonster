import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isGoalIntent,
  deriveGoalTitle,
  splitGoalSteps,
  buildGoalFromText,
  buildGoal,
  markStep,
  addStep,
  completeGoal,
  isGoalActive,
  isGoalComplete,
  goalProgress,
  detectCompletionFromReply,
  pickActiveGoal,
  MAX_STEPS_PER_GOAL,
} from '../src/lib/goals.ts';

test('isGoalIntent detects imperative verbs at start', () => {
  assert.equal(isGoalIntent('deploy to AWS'), true);
  assert.equal(isGoalIntent('Fix this bug'), true);
  assert.equal(isGoalIntent('Refactor the auth module'), true);
});

test('isGoalIntent detects "please/can you" variants', () => {
  assert.equal(isGoalIntent('can you deploy this?'), true);
  assert.equal(isGoalIntent('please refactor X'), true);
});

test('isGoalIntent rejects non-imperative chat', () => {
  assert.equal(isGoalIntent('what is the difference between X and Y?'), false);
  assert.equal(isGoalIntent('hello there'), false);
  assert.equal(isGoalIntent(''), false);
});

test('deriveGoalTitle strips imperative verb and filler', () => {
  assert.match(deriveGoalTitle('deploy this to AWS'), /AWS$/);
  assert.match(deriveGoalTitle('fix the auth bug'), /auth bug$/);
  assert.match(deriveGoalTitle('Build a CI workflow'), /CI workflow$/);
});

test('splitGoalSteps parses pipe-separated steps', () => {
  const steps = splitGoalSteps('fix this | add tests | deploy to staging');
  assert.equal(steps.length, 3);
  assert.equal(steps[0], 'fix this');
});

test('splitGoalSteps parses numbered steps', () => {
  const steps = splitGoalSteps('1. write code\n2. run tests\n3. deploy');
  assert.ok(steps.length >= 2);
});

test('splitGoalSteps returns empty for single-action text', () => {
  const steps = splitGoalSteps('deploy to AWS');
  assert.equal(steps.length, 0);
});

test('buildGoalFromText returns null for non-intent', () => {
  assert.equal(buildGoalFromText('what is your name?'), null);
});

test('buildGoalFromText creates goal with steps from pipe list', () => {
  const g = buildGoalFromText('do this | then that | finally ship');
  assert.ok(g);
  assert.equal(g!.steps.length, 3);
  assert.ok(g!.title.length > 0);
});

test('markStep toggles done state', () => {
  const g = buildGoal('t', ['s1', 's2']);
  const stepId = g.steps[0].id;
  const after = markStep(g, stepId, true);
  assert.equal(after.steps.find((s) => s.id === stepId)?.done, true);
  const reverted = markStep(after, stepId, false);
  assert.equal(reverted.steps.find((s) => s.id === stepId)?.done, false);
});

test('addStep appends and caps at MAX_STEPS_PER_GOAL', () => {
  let g = buildGoal('t');
  for (let i = 0; i < MAX_STEPS_PER_GOAL; i++) g = addStep(g, `step ${i}`);
  const before = g.steps.length;
  assert.equal(before, MAX_STEPS_PER_GOAL);
  g = addStep(g, 'over cap');
  assert.equal(g.steps.length, MAX_STEPS_PER_GOAL);
});

test('completeGoal marks everything done and sets doneAt', () => {
  const g = buildGoal('t', ['a', 'b']);
  const c = completeGoal(g);
  assert.ok(c.doneAt);
  assert.ok(c.steps.every((s) => s.done));
});

test('isGoalActive and isGoalComplete report correctly', () => {
  const g = buildGoal('t', ['a']);
  assert.equal(isGoalActive(g), true);
  assert.equal(isGoalComplete(g), false);
  assert.equal(isGoalActive(completeGoal(g)), false);
  assert.equal(isGoalComplete(completeGoal(g)), true);
});

test('goalProgress returns ratio', () => {
  const g = buildGoal('t', ['a', 'b', 'c', 'd']);
  assert.equal(goalProgress(g).ratio, 0);
  let next = markStep(g, g.steps[0].id);
  next = markStep(next, g.steps[1].id);
  assert.equal(goalProgress(next).ratio, 0.5);
});

test('detectCompletionFromReply finds "I finished step X"', () => {
  const g = buildGoal('t', ['deploy to AWS']);
  const reply = "I've finished step 1: deploy to AWS. Next I'll verify.";
  const next = detectCompletionFromReply(g, reply);
  assert.equal(next.steps[0].done, true);
});

test('detectCompletionFromReply is idempotent on done steps', () => {
  const g = buildGoal('t', ['deploy to AWS']);
  const reply = "I've finished deploy to AWS.";
  const r1 = detectCompletionFromReply(g, reply);
  const r2 = detectCompletionFromReply(r1, reply);
  assert.equal(r2.steps[0].done, true);
  assert.equal(r2.steps.filter((s) => s.done).length, 1);
});

test('pickActiveGoal returns most recent active', () => {
  const old = buildGoal('old', ['a']);
  const recent = buildGoal('new', ['b']);
  const oldTime = Date.now() - 10000;
  recent.createdAt = Date.now();
  old.createdAt = oldTime;
  const goals = [old, recent];
  const picked = pickActiveGoal(goals);
  assert.equal(picked?.title, 'new');
});

test('pickActiveGoal ignores completed goals', () => {
  const a = buildGoal('a', ['x']);
  const b = buildGoal('b', ['y']);
  const goals = [completeGoal(a), b];
  const picked = pickActiveGoal(goals);
  assert.equal(picked?.title, 'b');
});

test('buildGoalFromText returns null for non-imperative text', () => {
  assert.equal(buildGoalFromText('hello there'), null);
});

test('buildGoalFromText returns goal for "deploy to aws"', () => {
  const g = buildGoalFromText('deploy to aws');
  assert.ok(g);
  assert.ok(g.title.length > 0);
});

test('buildGoalFromText splits pipe-separated steps', () => {
  const g = buildGoalFromText('deploy app | write terraform | run plan');
  assert.ok(g);
  assert.equal(g.steps.length, 3);
  assert.equal(g.steps[1].title, 'write terraform');
});

test('completeGoal sets doneAt and marks all steps done', () => {
  const g = buildGoal('finish', ['a', 'b', 'c']);
  const done = completeGoal(g);
  assert.ok(done.doneAt !== undefined);
  assert.ok(done.steps.every((s) => s.done));
});

test('addStep appends up to MAX_STEPS_PER_GOAL and caps', () => {
  const g = buildGoal('many', []);
  let cur = g;
  for (let i = 0; i < 10; i++) {
    cur = addStep(cur, `step ${i}`);
  }
  assert.equal(cur.steps.length, 8);
});

test('markStep is idempotent when step is already done', () => {
  const g = buildGoal('done step', ['a']);
  const stepId = g.steps[0].id;
  const afterFirst = markStep(g, stepId, true);
  assert.equal(afterFirst.steps[0].done, true);
  const afterSecond = markStep(afterFirst, stepId, true);
  assert.equal(afterSecond.steps[0].done, true);
  const progress = goalProgress(afterSecond);
  assert.equal(progress.done, 1);
  assert.equal(progress.ratio, 1);
});
