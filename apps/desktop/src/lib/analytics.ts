import type { GameState } from './gameState.ts';
import { loadGoals } from './goals.ts';

export interface AnalyticsSummary {
  daysActive: number;
  totalMessages: number;
  goalsCompleted: number;
  totalGoals: number;
  relationshipLevel: string;
  currentStage: string;
  currentLevel: number;
  totalXP: number;
  uptimeMs: number;
  moodDistribution: Record<string, number>;
}

export function computeAnalytics(gs: GameState): AnalyticsSummary {
  const now = Date.now();
  const sessionStart = gs._sessionStart || now;
  const uptimeMs = now - sessionStart;
  const daysActive = Math.max(1, Math.floor(uptimeMs / (24 * 60 * 60 * 1000)));

  const goals = loadGoals();
  const completedGoals = goals.filter((g) => g.doneAt);

  const moodDist: Record<string, number> = {};
  const kindToMood: Record<string, string> = {
    success: 'happy',
    error: 'sad',
    milestone: 'proud',
    user_note: 'happy',
    preference: 'happy',
    lesson: 'focused',
  };

  let totalMoodCount = 0;

  const episodes = _getEpisodes();
  for (const ep of episodes) {
    const mood = kindToMood[ep.kind] || 'idle';
    moodDist[mood] = (moodDist[mood] || 0) + 1;
    totalMoodCount++;
  }

  if (totalMoodCount > 0) {
    for (const key of Object.keys(moodDist)) {
      moodDist[key] = Math.round((moodDist[key] / totalMoodCount) * 100);
    }
  }

  return {
    daysActive,
    totalMessages: gs._totalMessages,
    goalsCompleted: completedGoals.length,
    totalGoals: goals.length,
    relationshipLevel: gs.relationshipLevel,
    currentStage: gs.stage,
    currentLevel: gs.level,
    totalXP: gs.xp + _accumulatedXP(gs),
    uptimeMs,
    moodDistribution: moodDist,
  };
}

function _getEpisodes(): Array<{ kind: string }> {
  try {
    const raw = localStorage.getItem('agenmonster_memory');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.episodes) ? parsed.episodes : [];
  } catch {
    return [];
  }
}

function _accumulatedXP(gs: GameState): number {
  let total = gs.xp;
  for (let i = 1; i < gs.level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

function xpForLevel(level: number): number {
  return Math.floor(50 * Math.pow(1.3, level - 1));
}