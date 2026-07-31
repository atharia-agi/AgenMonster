export type PetMood = 'happy' | 'neutral' | 'tired' | 'bored' | 'frustrated';

export interface MoodEntry {
  ts: number;
  mood: PetMood;
  source: string;
}

const MOOD_ORDER: PetMood[] = ['frustrated', 'bored', 'tired', 'neutral', 'happy'];

function moodIndex(m: PetMood): number {
  return MOOD_ORDER.indexOf(m);
}

function clampMoodStep(delta: number): -1 | 0 | 1 {
  if (delta > 0) return 1;
  if (delta < 0) return -1;
  return 0;
}

function recordMood(_pet: { moodHistory: MoodEntry[] }, _mood: PetMood): void {
}
