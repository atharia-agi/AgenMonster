export type PetMood = 'happy' | 'neutral' | 'tired' | 'bored' | 'frustrated';

export interface MoodEntry {
  ts: number;
  mood: PetMood;
  source: string;
}

export interface Interaction {
  type:
    | 'followed_suggestion'
    | 'ignored_suggestion'
    | 'manual_change'
    | 'positive_emoji'
    | 'negative_emoji'
    | 'abandoned'
    | 'message'
    | 'idle';
  quality?: 'high' | 'medium' | 'low';
  responseTimeMs?: number;
}

export interface PetState {
  mood: PetMood;
  energy: number;
  relationship: number;
  lastInteractionTs: number;
  conversationCount: number;
  totalTokensToday: number;
  moodHistory: MoodEntry[];
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

function recordMood(pet: PetState, mood: PetMood): void {
  const newHistory = pet.moodHistory.slice();
  newHistory.push({ ts: Date.now(), mood, source: 'updateMood' });
  if (newHistory.length > 30) {
    newHistory.shift();
  }
  pet.moodHistory = newHistory;
}

export function createPetState(): PetState {
  return {
    mood: 'neutral',
    energy: 1.0,
    relationship: 0.5,
    lastInteractionTs: Date.now(),
    conversationCount: 0,
    totalTokensToday: 0,
    moodHistory: [],
  };
}

export function updateMood(pet: PetState, interaction: Interaction): PetState {
  const next: PetState = { ...pet, moodHistory: pet.moodHistory.slice() };
  next.lastInteractionTs = Date.now();
  next.conversationCount += 1;

  let moodDelta = 0;
  let relDelta = 0;

  switch (interaction.type) {
    case 'followed_suggestion':
      moodDelta = 1;
      relDelta = 0.1;
      break;
    case 'ignored_suggestion':
      moodDelta = -1;
      relDelta = -0.05;
      break;
    case 'manual_change':
      moodDelta = 1;
      relDelta = 0.05;
      break;
    case 'positive_emoji':
      moodDelta = 1;
      relDelta = 0.1;
      break;
    case 'negative_emoji':
      moodDelta = -1;
      relDelta = -0.15;
      break;
    case 'abandoned':
      moodDelta = -1;
      relDelta = -0.02;
      break;
    case 'message':
      if (interaction.quality === 'high') {
        moodDelta = 1;
      } else if (interaction.quality === 'low') {
        moodDelta = -1;
      } else {
        moodDelta = 0;
      }
      if (interaction.responseTimeMs !== undefined && interaction.responseTimeMs > 300000) {
        moodDelta = Math.min(moodDelta, 0);
      }
      break;
    case 'idle':
      moodDelta = -1;
      break;
  }

  const currentIdx = moodIndex(next.mood);
  const clampedDelta = clampMoodStep(moodDelta);
  const targetIdx = Math.max(0, Math.min(MOOD_ORDER.length - 1, currentIdx + clampedDelta));
  next.mood = MOOD_ORDER[targetIdx];

  next.relationship = Math.max(0, Math.min(1, next.relationship + relDelta));

  if (interaction.type === 'message' && interaction.quality === 'high' && interaction.responseTimeMs !== undefined) {
    next.totalTokensToday += interaction.responseTimeMs;
  }

  recordMood(next, next.mood);

  return next;
}

export function decayEnergy(pet: PetState, hoursSinceLast: number): PetState {
  const next = { ...pet };
  const rate = hoursSinceLast > 4 ? 1 / 24 : 1 / 96;
  next.energy = Math.max(0, next.energy - hoursSinceLast * rate);
  return next;
}

export function getMoodSummary(pet: PetState): PetMood {
  const now = Date.now();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startTs = startOfDay.getTime();

  const today = pet.moodHistory.filter((e) => e.ts >= startTs);

  if (today.length === 0) {
    return pet.mood;
  }

  const counts: Record<string, number> = {};
  for (const entry of today) {
    counts[entry.mood] = (counts[entry.mood] ?? 0) + 1;
  }

  let dominant: PetMood = 'neutral';
  let maxCount = 0;
  for (const mood of MOOD_ORDER) {
    const count = counts[mood] ?? 0;
    if (count > maxCount) {
      maxCount = count;
      dominant = mood;
    }
  }

  return dominant;
}

export function getRelationshipScore(pet: PetState): number {
  return pet.relationship;
}