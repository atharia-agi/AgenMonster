import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clusterEpisodes,
  consolidateCluster,
  extractLessons,
  shouldDream,
  runDreamCycle,
  createDreamScheduler,
} from '../src/lib/dreamCycle.ts';
import { rememberEvent, getMemoryState, resetMemory, type Episode } from '../src/lib/memory.ts';
import { resetSkillRegistry } from '../src/lib/agentSkills.ts';

function ep(overrides: Partial<Episode> & { title: string; detail: string; tags: string[] }): Episode {
  return { id: `e-${Math.random().toString(36).slice(2, 8)}`, ts: Date.now(), kind: 'success', confidence: 0.7, ...overrides } as Episode;
}

function seedRepeatedEpisodes(count: number, tag: string, title = `fix ${tag} bug`): void {
  resetMemory();
  for (let i = 0; i < count; i++) {
    rememberEvent({ kind: 'success', title: `${title} #${i}`, detail: `detail for ${tag} fix`, tags: [tag, 'fix'], confidence: 0.6 });
  }
}

test('clusterEpisodes groups episodes sharing tags', () => {
  const episodes: Episode[] = [
    ep({ title: 'fix yaml parser', detail: 'yaml error', tags: ['yaml', 'parser'] }),
    ep({ title: 'fix yaml crash', detail: 'yaml crash', tags: ['yaml', 'parser'] }),
    ep({ title: 'fix json loader', detail: 'json error', tags: ['json'] }),
  ];
  const clusters = clusterEpisodes(episodes, 2);
  assert.equal(clusters.length, 2);
  const yamlCluster = clusters.find((c) => c.key.includes('yaml'))!;
  assert.equal(yamlCluster.episodes.length, 2);
});

test('clusterEpisodes uses keyword overlap fallback', () => {
  const episodes: Episode[] = [
    ep({ title: 'deploy app', detail: 'pushed to prod', tags: ['deploy'] }),
    ep({ title: 'deploy service', detail: 'pushed to staging', tags: ['ops'] }),
  ];
  const clusters = clusterEpisodes(episodes, 2);
  assert.equal(clusters.length, 1, 'should merge via strong keyword overlap');
});

test('consolidateCluster returns null for single episode', () => {
  const cluster = [ep({ title: 'solo', detail: 'only one', tags: ['x'] })];
  assert.equal(consolidateCluster(cluster), null);
});

test('consolidateCluster boosts confidence and merges tags', () => {
  const cluster = [
    ep({ title: 'fix a', detail: 'd a', tags: ['t1'], confidence: 0.5 }),
    ep({ title: 'fix b', detail: 'd b', tags: ['t1', 't2'], confidence: 0.7 }),
  ];
  const merged = consolidateCluster(cluster)!;
  assert.ok(merged.confidence > 0.7);
  assert.ok(merged.tags.includes('t1'));
  assert.ok(merged.tags.includes('t2'));
  assert.match(merged.title, /fix a/);
});

test('extractLessons finds repeated lesson episodes', () => {
  const lessons: Episode[] = [
    ep({ title: 'lesson: read error first', detail: 'always read the stack trace', tags: ['debug'], kind: 'lesson' }),
    ep({ title: 'lesson: read error first', detail: 'read stack trace before fixing', tags: ['debug'], kind: 'lesson' }),
    ep({ title: 'fix one', detail: 'single', tags: ['other'] }),
  ];
  const clusters = clusterEpisodes(lessons, 2);
  const found = extractLessons(clusters);
  assert.equal(found.length, 1);
  assert.ok(found[0].title.startsWith('Lesson:'));
});

test('shouldDream is false when active, true when idle', () => {
  const now = Date.now();
  assert.equal(shouldDream(now - 1000, now), false);
  assert.equal(shouldDream(now - 30 * 60 * 1000, now), true);
});

test('runDreamCycle consolidates repeated episodes', () => {
  resetSkillRegistry();
  seedRepeatedEpisodes(4, 'yaml');
  const before = getMemoryState().episodes.length;

  const report = runDreamCycle({ minClusterSize: 3 });
  assert.ok(report.consolidated.length >= 1, 'expected at least one consolidation');
  assert.ok(report.episodesBefore >= before);
  assert.ok(report.episodesAfter < report.episodesBefore, 'should compress memory');
  assert.ok(report.consolidated[0].mergedIds.length >= 3);
});

test('runDreamCycle creates a skill from repeated success patterns', () => {
  resetSkillRegistry();
  seedRepeatedEpisodes(5, 'yaml');
  const report = runDreamCycle({ minClusterSize: 3 });
  assert.ok(report.skillsCreated >= 1, `expected skills created, got ${report.skillsCreated}`);
  assert.ok(report.skillsAfter >= report.skillsBefore);
});

test('runDreamCycle crystallizes lessons into facts', () => {
  resetSkillRegistry();
  resetMemory();
  rememberEvent({ kind: 'lesson', title: 'lesson: check imports', detail: 'check imports before use', tags: ['js'], confidence: 0.5 });
  rememberEvent({ kind: 'lesson', title: 'lesson: check imports', detail: 'verify imports first', tags: ['js'], confidence: 0.6 });
  rememberEvent({ kind: 'lesson', title: 'lesson: check imports', detail: 'imports cause errors', tags: ['js'], confidence: 0.5 });
  const report = runDreamCycle({ minClusterSize: 2 });
  assert.ok(report.lessons.length >= 1);
  const facts = getMemoryState().facts;
  assert.ok(Object.keys(facts).some((k) => k.startsWith('lesson:')), 'expected crystallized lesson fact');
});

test('createDreamScheduler runs only when idle and not too often', () => {
  const interactionRef = { current: Date.now() };
  const scheduler = createDreamScheduler(interactionRef);
  assert.equal(scheduler.maybeRun(Date.now()), null, 'active: no dream');

  const now = Date.now() + 30 * 60 * 1000;
  const first = scheduler.maybeRun(now);
  assert.ok(first !== null, 'idle long enough: dream runs');

  const second = scheduler.maybeRun(now + 5 * 1000);
  assert.equal(second, null, 'too soon after last dream');
});

test('runDreamCycle is safe on empty memory', () => {
  resetSkillRegistry();
  resetMemory();
  const report = runDreamCycle();
  assert.equal(report.episodesBefore, 0);
  assert.equal(report.consolidated.length, 0);
  assert.equal(report.skillsCreated, 0);
});
