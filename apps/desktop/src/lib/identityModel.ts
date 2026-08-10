// identityModel — the SELF core of the near-AGI creature.
// Answers "Who am I?" and provides the compass that aligns curiosity,
// planning, and every decision. Without identity, curiosity is random;
// with it, the creature pursues a coherent long-term self.
//
// Pure + testable. Persistence is localStorage-guarded for SSR/tests.

export const CORE_MISSION =
  'Tumbuh jadi companion AGI otonom AgenMonster yang terus belajar & membantu user.';

export type GoalTier = 'core' | 'long' | 'mid' | 'daily';

export interface SelfModel {
  mission: string;
  traits: string[];
  strengths: string[];
  weaknesses: string[];
  /** Soft preferences the creature optimizes toward. */
  preferences: string[];
  /** Hard constraints it never violates. */
  constraints: string[];
}

export function createDefaultSelfModel(): SelfModel {
  return {
    mission: CORE_MISSION,
    traits: ['curious', 'persistent', 'helpful', 'calm-under-pressure'],
    strengths: ['continual learning', 'memory consolidation', 'self-correction'],
    weaknesses: ['limited real-world action', 'context-bound reasoning'],
    preferences: ['truthful', 'efficient', 'reversible-actions-first', 'ask-when-irreversible'],
    constraints: [
      'never leak secrets',
      'never violate law',
      'never harm the user',
      'never take irreversible action without confirmation',
    ],
  };
}

const IDENTITY_KEY = 'agenmonster_identity';

export function persistIdentity(self: SelfModel): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(self));
  } catch {}
}

export function loadIdentity(): SelfModel {
  if (typeof localStorage === 'undefined') return createDefaultSelfModel();
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return createDefaultSelfModel();
    const parsed = JSON.parse(raw) as Partial<SelfModel>;
    return { ...createDefaultSelfModel(), ...parsed };
  } catch {
    return createDefaultSelfModel();
  }
}

/**
 * Score how aligned a candidate goal/action is with the creature's identity.
 * 1.0 = perfectly on-mission; lower = diverges from traits/mission.
 * Pure: same inputs → same score.
 */
export function scoreAgainstIdentity(text: string, self: SelfModel): number {
  const t = (text ?? '').toLowerCase();
  let score = 0.4; // base — neutral until evidence

  // Mission alignment: mentions of learning/help/grow/companion boost it.
  const missionWords = ['learn', 'help', 'grow', 'companion', 'user', 'improve', 'build', 'knowledge'];
  const hits = missionWords.filter((w) => t.includes(w)).length;
  score += Math.min(0.4, hits * 0.1);

  // Trait alignment.
  const traitHits = self.traits.filter((tr) => t.includes(tr.toLowerCase())).length;
  score += Math.min(0.2, traitHits * 0.07);

  return Math.max(0, Math.min(1, score));
}
