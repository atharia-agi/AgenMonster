import type { RoutinePattern } from './routine';

export interface Suggestion {
  text: string;
  reason: 'routine' | 'goal' | 'friday' | 'idle';
}

const COOLDOWN_KEY = 'agenmonster_suggestion_cooldown';
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

function lastSuggestedAt(): number {
  try {
    const raw = localStorage.getItem(COOLDOWN_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

function markSuggested(now: number): void {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(now));
  } catch {}
}

export function getSuggestions(
  routines: RoutinePattern[],
  pendingGoals: string[],
  topic: string,
  now = Date.now()
): Suggestion[] {
  if (now - lastSuggestedAt() < COOLDOWN_MS) return [];

  const suggestions: Suggestion[] = [];

  const todayRoutines = routines.filter((r) => r.daysOfWeek.includes(new Date(now).getDay()));
  if (todayRoutines.length > 0) {
    suggestions.push({
      text: `Based on your routine, want to start with ${todayRoutines[0].task}?`,
      reason: 'routine',
    });
  }

  if (pendingGoals.length > 0) {
    suggestions.push({
      text: `You had a goal: ${pendingGoals[0]} — want to check progress?`,
      reason: 'goal',
    });
  }

  const day = new Date(now).getDay();
  if (day === 5) {
    suggestions.push({
      text: 'Happy Friday! Want to review the week\'s accomplishments?',
      reason: 'friday',
    });
  }

  if (suggestions.length > 0) {
    markSuggested(now);
  }

  return suggestions.slice(0, 3);
}