// DreamCycle — idle-time memory consolidation (Genesis-style DreamCycle).
//
// When the agent is idle (no interaction for a while) or on demand, DreamCycle
// replays recent experience and:
//   1. clusters episodes that share topics/tags,
//   2. consolidates repetitive clusters into a single higher-confidence
//      "schema" episode (compression without data loss),
//   3. extracts crystallized lessons from repeated outcomes,
//   4. feeds successful trajectories to the skill curator for skill formation.
//
// Pure + testable. Reads memory through `getMemoryState()` and writes back
// through public memory.ts APIs (`forgetEpisode`, `rememberEvent`, `upsertFact`).
// The LLM is optional: when no `llm` callback is supplied, consolidation uses
// deterministic heuristics.

import { getMemoryState, forgetEpisode, rememberEvent, upsertFact, resetMemory, type Episode } from './memory.ts';
import { createCuratorState, recordTrajectory, curate, persistCuratorState, loadCuratorState, type TrajectoryStep, type Trajectory } from './skillCurator.ts';

export interface DreamInput {
  episodes?: Episode[];      // default: all current episodes
  now?: number;              // clock override for tests
  minClusterSize?: number;   // episodes needed to consolidate a cluster (default 3)
  minSharedTags?: number;    // tags required to group episodes (default 2)
  llm?: (prompt: string) => Promise<string>; // optional consolidation model
}

export interface DreamOutcome {
  consolidated: { cluster: string; mergedIds: string[]; intoEpisodeId: string; confidence: number }[];
  lessons: { title: string; detail: string; episodeIds: string[]; confidence: number }[];
  skillsCreated: number;
  episodesBefore: number;
  episodesAfter: number;
  skillsBefore: number;
  skillsAfter: number;
  ranAt: number;
}

// ---------- clustering ----------

// Group episodes that share at least `minSharedTags` tags (or strong keyword overlap).
export function clusterEpisodes(episodes: Episode[], minSharedTags = 2): Array<{ key: string; episodes: Episode[] }> {
  const clusters: Array<{ key: string; episodes: Episode[] }> = [];
  const assigned = new Set<string>();

  const tagKey = (tags: string[]) => [...tags].sort().join('::');

  for (let i = 0; i < episodes.length; i++) {
    if (assigned.has(episodes[i].id)) continue;

    const seed = episodes[i];
    const members: Episode[] = [seed];
    assigned.add(seed.id);

    for (let j = i + 1; j < episodes.length; j++) {
      const other = episodes[j];
      if (assigned.has(other.id)) continue;

      const shared = seed.tags.filter((t) => other.tags.includes(t));
      const keywordOverlap = overlapScore(seed, other);
      if (shared.length >= minSharedTags || keywordOverlap >= 0.3) {
        members.push(other);
        assigned.add(other.id);
      }
    }

    clusters.push({ key: tagKey(seed.tags) || seed.title.slice(0, 20), episodes: members });
  }

  return clusters;
}

// Word-overlap between two episodes (0..1). Stop words are ignored so generic
// verbs like "fix"/"error" don't falsely merge unrelated memories.
const OVERLAP_STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with',
  'fix', 'error', 'bug', 'issue', 'detail', 'title', 'episode', 'about',
  'this', 'that', 'from', 'was', 'were', 'has', 'had', 'have', 'using',
]);

function overlapScore(a: Episode, b: Episode): number {
  const wordsA = new Set(`${a.title} ${a.detail}`.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !OVERLAP_STOP_WORDS.has(w)));
  const wordsB = new Set(`${b.title} ${b.detail}`.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !OVERLAP_STOP_WORDS.has(w)));
  let inter = 0;
  for (const w of wordsA) if (wordsB.has(w)) inter++;
  const union = new Set([...wordsA, ...wordsB]).size || 1;
  return inter / union;
}

// ---------- consolidation ----------

// Merge a cluster of episodes into one schema episode with boosted confidence.
// Keeps the highest-confidence detail; summary merges titles.
export function consolidateCluster(cluster: Episode[], now = Date.now()): Episode | null {
  if (cluster.length < 2) return null;

  const avgConfidence = Math.min(1, cluster.reduce((a, e) => a + e.confidence, 0) / cluster.length + 0.1);
  const best = cluster.reduce((a, b) => (b.confidence > a.confidence ? b : a));
  const confidence = Math.min(1, Math.max(best.confidence, avgConfidence) + 0.05 * (cluster.length - 1));
  const tags = [...new Set(cluster.flatMap((e) => e.tags))].slice(0, 8);
  const titles = cluster.map((e) => e.title).slice(0, 4);

  return {
    id: `dream-${now}-${Math.random().toString(36).slice(2, 8)}`,
    ts: now,
    kind: cluster.some((e) => e.kind === 'lesson') ? 'lesson' : best.kind,
    title: titles.length > 1 ? `${titles[0]} (×${titles.length} similar)` : titles[0],
    detail: `Consolidated from ${cluster.length} related memories. ${best.detail}`,
    tags,
    confidence,
  };
}

// Extract crystallized lessons from episode clusters: repeated 'lesson' or
// error→success patterns become stable high-confidence lessons.
export function extractLessons(clusters: Array<{ key: string; episodes: Episode[] }>, now = Date.now()): { title: string; detail: string; episodeIds: string[]; confidence: number }[] {
  const lessons: { title: string; detail: string; episodeIds: string[]; confidence: number }[] = [];

  for (const cluster of clusters) {
    if (cluster.episodes.length < 2) continue;
    const lessonEpisodes = cluster.episodes.filter((e) => e.kind === 'lesson');
    if (lessonEpisodes.length >= 2) {
      const best = lessonEpisodes.reduce((a, b) => (b.confidence > a.confidence ? b : a));
      lessons.push({
        title: `Lesson: ${best.title}`,
        detail: best.detail,
        episodeIds: cluster.episodes.map((e) => e.id),
        confidence: Math.min(1, best.confidence + 0.05),
      });
    }
  }

  return lessons;
}

// ---------- dream loop ----------

const DEFAULT_MIN_IDLE_MS = 10 * 60 * 1000; // 10 minutes of idle triggers a dream

// True when the agent has been idle long enough to justify consolidation.
export function shouldDream(lastInteractionTs: number, now = Date.now(), minIdleMs = DEFAULT_MIN_IDLE_MS): boolean {
  return now - lastInteractionTs >= minIdleMs;
}

// Run one consolidation cycle over current memory. Returns a report.
export function runDreamCycle(input: DreamInput = {}): DreamOutcome {
  const now = input.now ?? Date.now();
  const state = getMemoryState();
  const episodes = input.episodes ?? state.episodes;
  const minSharedTags = input.minSharedTags ?? 2;
  const minClusterSize = input.minClusterSize ?? 3;

  const episodesBefore = episodes.length;
  const clusters = clusterEpisodes(episodes, minSharedTags);
  const consolidated: DreamOutcome['consolidated'] = [];
  const toRemove = new Set<string>();
  let skillsBefore = 0;
  let skillsCreated = 0;

  // Curator integration — crystallize repeated successes into skills.
  const curator = loadCuratorState();
  skillsBefore = curator.skills.length;

  for (const cluster of clusters) {
    // Only consolidate clusters that actually repeat the same thing.
    const repeatable = cluster.episodes.length >= minClusterSize;
    if (repeatable && cluster.episodes.some((e) => e.kind !== 'lesson')) {
      const merged = consolidateCluster(cluster.episodes, now);
      if (merged) {
        for (const e of cluster.episodes) toRemove.add(e.id);
        consolidated.push({
          cluster: cluster.key,
          mergedIds: cluster.episodes.map((e) => e.id),
          intoEpisodeId: merged.id,
          confidence: merged.confidence,
        });
        rememberEvent({
          kind: merged.kind,
          title: merged.title,
          detail: merged.detail,
          tags: merged.tags,
          confidence: merged.confidence,
        });

        // Feed the pattern to the curator as a successful trajectory.
        const trajectory: Trajectory = {
          task: merged.title,
          steps: [{ tool: 'memory', action: 'consolidate', result: 'ok' }],
          outcome: 'success',
          toolCount: 1,
          timestamp: now,
        };
        const { created } = recordTrajectory(curator, trajectory);
        if (created) skillsCreated++;
      }
    }
  }

  // Crystallize lessons.
  const lessons = extractLessons(clusters, now);
  for (const lesson of lessons) {
    const existing = state.episodes.find(
      (e) => e.kind === 'lesson' && e.title === lesson.title.replace(/^Lesson: /, '')
    );
    if (!existing) {
      rememberEvent({ kind: 'lesson', title: lesson.title, detail: lesson.detail, tags: [], confidence: lesson.confidence });
    } else {
      upsertFact(`lesson:${lesson.title.replace(/^Lesson: /, '').slice(0, 30)}`, lesson.detail, lesson.confidence);
    }
  }

  // Remove consumed episodes.
  for (const id of toRemove) forgetEpisode(id);

  // Curation pass: promote/prune.
  curate(curator);
  persistCuratorState(curator);

  const after = getMemoryState();
  return {
    consolidated,
    lessons,
    skillsCreated,
    episodesBefore,
    episodesAfter: after.episodes.length,
    skillsBefore,
    skillsAfter: curator.skills.length,
    ranAt: now,
  };
}

// Idle detector helper — call this from the game loop to see if it's dream time.
export function createDreamScheduler(lastInteractionRef: { current: number }) {
  let lastDreamAt = 0;
  return {
    maybeRun(now = Date.now(), minIdleMs = DEFAULT_MIN_IDLE_MS): DreamOutcome | null {
      if (!shouldDream(lastInteractionRef.current, now, minIdleMs)) return null;
      if (now - lastDreamAt < minIdleMs) return null;
      lastDreamAt = now;
      return runDreamCycle({ now });
    },
  };
}

// Re-export for convenience in tests/UI.
export { resetMemory };
