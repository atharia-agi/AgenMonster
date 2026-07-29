export interface InteractionRecord {
  ts: number;
  action:
    | 'followed_suggestion'
    | 'ignored_suggestion'
    | 'manual_change'
    | 'positive_emoji'
    | 'negative_emoji'
    | 'abandoned';
  score: number;
}

export interface RelationshipInput {
  currentScore: number;
  records: InteractionRecord[];
}

export const RELATIONSHIP_LEVELS: Array<{ min: number; label: string }> = [
  { min: 0, label: 'stranger' },
  { min: 0.3, label: 'acquaintance' },
  { min: 0.6, label: 'friend' },
  { min: 0.8, label: 'trusted_companion' },
];

export function recordInteraction(records: InteractionRecord[], action: InteractionRecord['action']): InteractionRecord[] {
  const scores: Record<InteractionRecord['action'], number> = {
    followed_suggestion: 0.1,
    ignored_suggestion: -0.05,
    manual_change: 0.05,
    positive_emoji: 0.2,
    negative_emoji: -0.15,
    abandoned: -0.02,
  };
  return [
    ...records,
    { ts: Date.now(), action, score: scores[action] ?? 0 },
  ];
}

export function computeRelationship(input: RelationshipInput): number {
  if (input.records.length === 0) return input.currentScore;
  const now = Date.now();
  const HALF_LIFE = 60 * 24 * 60 * 60 * 1000;
  let sum = 0;
  for (const r of input.records) {
    const age = now - r.ts;
    const weight = Math.exp(-age / HALF_LIFE);
    sum += r.score * weight;
  }
  const combined = Math.max(0, Math.min(1, input.currentScore + sum));
  return combined;
}

export function getRelationshipLevel(score: number): string {
  const level = [...RELATIONSHIP_LEVELS].reverse().find((l) => score >= l.min);
  return level?.label ?? 'stranger';
}