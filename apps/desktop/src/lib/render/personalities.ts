// Per-stage personality profiles — behavioral traits, blink rates,
// bob amplitudes, attention-grab phrases.

export interface StagePersonality {
  id: string;
  name: string;
  traits: string[];
  preferredMood: string;
  defaultSpeech: string[];
  idleBobAmplitude: number;
  idleBobSpeed: number;
  blinkRateMinMs: number;
  blinkRateMaxMs: number;
  attentionGrabChance: number;
  attentionPhrases: string[];
}

export const STAGE_PERSONALITIES: Record<string, StagePersonality> = {
  egg: {
    id: 'egg', name: 'Egg',
    traits: ['curious', 'sleepy', 'fragile'],
    preferredMood: 'sleepy',
    defaultSpeech: ['...', '*wobble*', '...mm?'],
    idleBobAmplitude: 1.5, idleBobSpeed: 800,
    blinkRateMinMs: 4000, blinkRateMaxMs: 8000,
    attentionGrabChance: 0.005,
    attentionPhrases: ['...', '*crack*'],
  },
  hatchling: {
    id: 'hatchling', name: 'Hatchling',
    traits: ['playful', 'clumsy', 'eager'],
    preferredMood: 'happy',
    defaultSpeech: ['!', 'bark!', 'play?'],
    idleBobAmplitude: 3.0, idleBobSpeed: 400,
    blinkRateMinMs: 2000, blinkRateMaxMs: 5000,
    attentionGrabChance: 0.03,
    attentionPhrases: ['bark!', 'play!', '?'],
  },
  baby: {
    id: 'baby', name: 'Baby',
    traits: ['gentle', 'curious', 'social'],
    preferredMood: 'idle',
    defaultSpeech: ['~', 'hmm', 'nice'],
    idleBobAmplitude: 2.5, idleBobSpeed: 600,
    blinkRateMinMs: 2500, blinkRateMaxMs: 6000,
    attentionGrabChance: 0.02,
    attentionPhrases: ['hmm?', 'oh!', '~'],
  },
  child: {
    id: 'child', name: 'Child',
    traits: ['focused', 'methodical', 'proud'],
    preferredMood: 'idle',
    defaultSpeech: ['ready.', "let's go.", 'hmm...'],
    idleBobAmplitude: 2.0, idleBobSpeed: 550,
    blinkRateMinMs: 3000, blinkRateMaxMs: 6000,
    attentionGrabChance: 0.025,
    attentionPhrases: ['task?', 'ready!', '...?'],
  },
  teen: {
    id: 'teen', name: 'Teen',
    traits: ['confident', 'cheeky', 'powerful'],
    preferredMood: 'proud',
    defaultSpeech: ['obviously.', 'easy.', 'watch this.'],
    idleBobAmplitude: 2.5, idleBobSpeed: 450,
    blinkRateMinMs: 3000, blinkRateMaxMs: 7000,
    attentionGrabChance: 0.04,
    attentionPhrases: ['obviously.', 'let me.', 'huh?'],
  },
  adult: {
    id: 'adult', name: 'Adult',
    traits: ['wise', 'calm', 'powerful', 'mysterious'],
    preferredMood: 'idle',
    defaultSpeech: ['.', 'I see.', 'hmm.'],
    idleBobAmplitude: 1.5, idleBobSpeed: 700,
    blinkRateMinMs: 4000, blinkRateMaxMs: 9000,
    attentionGrabChance: 0.02,
    attentionPhrases: ['...', 'fascinating.', 'indeed.'],
  },
  mega: {
    id: 'mega', name: 'Mega',
    traits: ['transcendent', 'omniscient', 'serene'],
    preferredMood: 'proud',
    defaultSpeech: ['⚡', 'omniscience achieved.', '∞'],
    idleBobAmplitude: 1.0, idleBobSpeed: 900,
    blinkRateMinMs: 5000, blinkRateMaxMs: 12000,
    attentionGrabChance: 0.015,
    attentionPhrases: ['⚡', 'all paths.', '∞'],
  },
};

export function getPersonality(stage: string): StagePersonality {
  return STAGE_PERSONALITIES[stage] || STAGE_PERSONALITIES.egg;
}
