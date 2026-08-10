import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCuratorState,
  generateSkillFromTrajectory,
  recordTrajectory,
  curate,
  getCurationSummary,
  refineSkill,
  type CuratorState,
  type Trajectory,
} from '../src/lib/skillCurator.ts';
import {
  registerSkill,
  unregisterSkill,
  resetSkillRegistry,
  getAllSkills,
  getGeneratedSkills,
  clearGeneratedSkills,
  type AgentSkill,
} from '../src/lib/agentSkills.ts';

function successTrajectory(task: string, toolCount = 3): Trajectory {
  return {
    task,
    steps: Array.from({ length: toolCount }, (_, i) => ({
      tool: `tool-${i % 3}`,
      action: `step ${i}: do ${task.split(' ')[0]}`,
      result: 'ok',
    })),
    outcome: 'success',
    toolCount,
  };
}

test('generateSkillFromTrajectory produces a well-formed skill', () => {
  const t = successTrajectory('write a unit test for the parser');
  const skill = generateSkillFromTrajectory(t);

  assert.equal(typeof skill.id, 'string');
  assert.ok(skill.id.length > 0);
  assert.equal(typeof skill.name, 'string');
  assert.ok(skill.name.length > 0);
  assert.ok(skill.description.includes('write a unit test'));
  assert.ok(skill.keywords.length > 0);
  assert.ok(skill.whenToUse.includes('write a unit test'));
  assert.ok(skill.prompt && skill.prompt.includes('proven approach'));
  assert.ok(skill.tools && skill.tools.length > 0);
});

test('recordTrajectory creates a new skill on first success', () => {
  const state = createCuratorState();
  const { created } = recordTrajectory(state, successTrajectory('debug the yaml parser crash'));
  assert.ok(created, 'should create a skill');
  assert.equal(state.skills.length, 1);
  assert.equal(state.stats[created!.id].uses, 1);
  assert.equal(state.totalTrajectoriesSeen, 1);
});

test('recordTrajectory does not create skills from failures', () => {
  const state = createCuratorState();
  const { created } = recordTrajectory(state, {
    task: 'migrate the database schema',
    steps: [{ tool: 'db', action: 'run migration', result: 'error: constraint failed' }],
    outcome: 'fail',
  });
  assert.equal(created, null);
  assert.equal(state.skills.length, 0);
});

test('recordTrajectory reuses matching skill and counts outcomes', () => {
  const state = createCuratorState();
  const first = recordTrajectory(state, successTrajectory('fix the slow bundle size'));
  assert.ok(first.created);

  const second = recordTrajectory(state, successTrajectory('fix the slow bundle size'));
  assert.equal(second.created, null);
  assert.ok(second.updated || state.stats[first.created!.id].uses === 2);
  assert.equal(state.stats[first.created!.id].successes, 2);

  recordTrajectory(state, {
    task: 'fix the slow bundle size',
    steps: [{ tool: 'perf', action: 'profile', result: 'error' }],
    outcome: 'fail',
  });
  assert.equal(state.stats[first.created!.id].failures, 1);
  assert.equal(state.stats[first.created!.id].uses, 3);
});

test('curate promotes proven skills and prunes dead ones', () => {
  const state = createCuratorState();
  const skill = generateSkillFromTrajectory(successTrajectory('write e2e tests for checkout'));
  skill.metadata = { generated: 'true' };
  state.skills.push(skill);
  state.stats[skill.id] = {
    uses: 8,
    successes: 7,
    failures: 1,
    lastUsed: Date.now(),
    created: Date.now() - 1000,
    refinementCount: 0,
  };

  const dead = generateSkillFromTrajectory(successTrajectory('deprecated workflow'));
  state.skills.push(dead);
  state.stats[dead.id] = {
    uses: 1,
    successes: 0,
    failures: 1,
    lastUsed: Date.now() - 40 * 24 * 60 * 60 * 1000,
    created: Date.now() - 40 * 24 * 60 * 60 * 1000,
    refinementCount: 0,
  };

  const report = curate(state);
  assert.equal(report.promoted.length, 1);
  assert.equal(report.promoted[0].id, skill.id);
  assert.equal(report.pruned.includes(dead.id), true);
  assert.equal(state.skills.find((s) => s.id === dead.id), undefined);
});

test('generated skills are registered into the live agentSkills registry', () => {
  resetSkillRegistry();
  const state = createCuratorState();
  const { created } = recordTrajectory(state, successTrajectory('add authentication flow'));
  assert.ok(created);

  const all = getAllSkills();
  assert.ok(all.some((s) => s.id === created!.id), 'generated skill should be in registry');
  const generated = getGeneratedSkills();
  assert.ok(generated.some((s) => s.id === created!.id));
});

test('pruning unregisters the skill from the live registry', () => {
  resetSkillRegistry();
  const state = createCuratorState();
  const { created } = recordTrajectory(state, successTrajectory('refactor the legacy module'));
  assert.ok(created);
  assert.ok(getAllSkills().some((s) => s.id === created!.id));

  state.stats[created!.id] = {
    uses: 1,
    successes: 0,
    failures: 1,
    lastUsed: Date.now() - 40 * 24 * 60 * 60 * 1000,
    created: Date.now() - 1000,
    refinementCount: 0,
  };
  curate(state);
  assert.equal(getAllSkills().some((s) => s.id === created!.id), false);
});

test('refineSkill appends experience lessons and bumps refinement count', () => {
  const state = createCuratorState();
  const skill = generateSkillFromTrajectory(successTrajectory('parse nested json config'));
  state.skills.push(skill);
  state.stats[skill.id] = {
    uses: 3,
    successes: 2,
    failures: 1,
    lastUsed: Date.now(),
    created: Date.now(),
    refinementCount: 0,
  };

  const refined = refineSkill(state, skill);
  assert.ok(refined);
  assert.ok(refined.prompt!.includes('success'));
  assert.equal(state.stats[skill.id].refinementCount, 1);
});

test('refineSkill respects max refinement budget', () => {
  const state = createCuratorState();
  const skill = generateSkillFromTrajectory(successTrajectory('analyze stack traces'));
  state.skills.push(skill);
  state.stats[skill.id] = {
    uses: 10,
    successes: 9,
    failures: 1,
    lastUsed: Date.now(),
    created: Date.now(),
    refinementCount: 5,
  };
  assert.equal(refineSkill(state, skill), null);
});

test('curator respects max skill cap', () => {
  const state = createCuratorState();
  for (let i = 0; i < 50; i++) {
    recordTrajectory(state, successTrajectory(`unique task number ${i} for curation`));
  }
  assert.ok(state.skills.length <= 40, `expected cap 40, got ${state.skills.length}`);
});

test('getCurationSummary returns useful text', () => {
  const state = createCuratorState();
  assert.ok(getCurationSummary(state).includes('No self-generated skills'));
  recordTrajectory(state, successTrajectory('build a graph search filter'));
  const summary = getCurationSummary(state);
  assert.ok(summary.toLowerCase().includes('graph search'));
});
