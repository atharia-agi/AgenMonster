import { getMemoryState, getTopTopics } from './memory.ts';

export interface MorningWakeupInput {
  yesterdayRecap: string | null;
  todayRoutines: string[];
  mood: string;
  energy: number;
  pendingGoals: string[];
  alreadyGreetedToday: boolean;
}

export function buildMorningWakeup(input: MorningWakeupInput): string | null {
  if (input.alreadyGreetedToday) return null;

  const parts: string[] = [];

  if (input.yesterdayRecap) {
    parts.push(`Yesterday: ${input.yesterdayRecap}`);
  }

  if (input.todayRoutines.length > 0) {
    parts.push(`Today's routine: ${input.todayRoutines.join(', ')}`);
  }

  if (input.pendingGoals.length > 0) {
    parts.push(`Pending goal: ${input.pendingGoals[0]}`);
  }

  const tone = input.energy < 0.3 ? 'Low-key good morning — you seem rested.' : 'Good morning!';

  if (parts.length === 0) {
    return `${tone} Ready to start?`;
  }

  return `${tone} ${parts.join(' | ')}`;
}

export function runMorningWakeup(pendingGoals: string[]): string | null {
  const state = getMemoryState();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEpisodes = state.episodes.filter((ep) => ep.ts >= today.getTime());
  const alreadyGreetedToday = todayEpisodes.some((ep) => ep.tags.includes('morning-wakeup'));

  if (alreadyGreetedToday) return null;

  const yesterdayRecap = state.episodes.find(
    (ep) => ep.tags.includes('daily-recap') && ep.ts >= today.getTime() - 86400000
  );

  const routines = getTopTopics(3).map((t) => t.topic);
  const mood = 'idle';
  const energy = 0.8;

  const message = buildMorningWakeup({
    yesterdayRecap: yesterdayRecap?.detail ?? null,
    todayRoutines: routines,
    mood,
    energy,
    pendingGoals,
    alreadyGreetedToday: false,
  });

  return message;
}