// AutonomousCuriosity — intrinsic motivation for the creature. When its PAD
// arousal (excitement) drops, the pet is "bored" and autonomously seeks novel
// experience: an unexplored world area, an unmastered skill, or a memory topic
// it has rarely touched. This is genuine intrinsic drive — the creature does
// not wait to be told what to do, it generates its own reasons to act. The
// hallmark of an AGI-level agent is curiosity, not just obedience.
//
// Pure + testable: given a snapshot it returns the most novel next thing to
// investigate. No DOM, no rendering.

import { getGameState } from './gameState.ts';
import { getMemoryState } from './memory.ts';
import { getUnlockedAreas, type AreaId } from './worldEngine.ts';

export type CuriosityKind = 'area' | 'skill' | 'memory' | 'npc';

export interface CuriosityTarget {
  kind: CuriosityKind;
  query: string;
  novelty: number; // 0..1, higher = more novel
}

const ALL_AREAS: AreaId[] = ['home_forest', 'token_river', 'bug_dungeon', 'cloud_server', 'neon_circuit', 'void_sea'];

export function pickCuriosity(padArousal = 0.5): CuriosityTarget | null {
  const gs = getGameState();
  const mem = getMemoryState();

  // Already excited enough — no curiosity needed right now.
  if (padArousal > 0.6) return null;

  const visitedAreas = new Set((gs.world?.visitedAreas as AreaId[]) ?? []);
  const unlocked = getUnlockedAreas(gs.level);
  const freshAreas = unlocked.filter((a) => !visitedAreas.has(a));
  const allVisited = ALL_AREAS.filter((a) => !visitedAreas.has(a));

  const masteredSkills = new Set((gs.skills ?? []).map((s: any) => s.name));
  const knownTopics = new Set(mem.episodes.map((e) => e.title));

  // Rank candidates by novelty.
  const candidates: CuriosityTarget[] = [];

  if (freshAreas.length) {
    candidates.push({ kind: 'area', query: `explore the ${freshAreas[0]} area for the first time`, novelty: 1 });
  } else if (allVisited.length) {
    candidates.push({ kind: 'area', query: `revisit ${allVisited[0]} with a fresh perspective`, novelty: 0.5 });
  }

  if ((gs.skills?.length ?? 0) < 8) {
    candidates.push({ kind: 'skill', query: `learn a new capability I have not mastered yet`, novelty: 0.8 });
  }

  // A memory topic we rarely touch.
  const rareTopic = mem.episodes
    .map((e) => ({ t: e.title, n: e.confidence ?? 0.5 }))
    .sort((a, b) => a.n - b.n)[0];
  if (rareTopic) {
    candidates.push({ kind: 'memory', query: `revisit the faint memory: ${rareTopic.t}`, novelty: 1 - rareTopic.n });
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.novelty - a.novelty);
  return candidates[0];
}
