// Pet Evolution System — form changes, SP, care-based evolution paths.
// Inspired by Monster World (care quality) + Monster Adventure (SP/tactical).

export type PetForm = 'egg' | 'rookie' | 'champion' | 'ultimate';

export interface FormDef {
  form: PetForm;
  name: string;
  sprite: string;
  color: string;
  statsBonus: { hp: number; attack: number; speed: number; affection: number };
  abilities: string[];
  spCost: number;
  description: string;
}

export const FORMS: Record<PetForm, FormDef> = {
  egg: {
    form: 'egg',
    name: 'Koromon',
    sprite: '🥚',
    color: '#f8f4e8',
    statsBonus: { hp: 0, attack: 0, speed: 0, affection: 0 },
    abilities: [],
    spCost: 0,
    description: 'A mysterious egg. What will hatch?',
  },
  rookie: {
    form: 'rookie',
    name: 'Koromon',
    sprite: '🐣',
    color: '#f0b040',
    statsBonus: { hp: 10, attack: 5, speed: 3, affection: 5 },
    abilities: ['tackle', 'peck'],
    spCost: 0,
    description: 'A newborn monster. Curious and energetic.',
  },
  champion: {
    form: 'champion',
    name: 'Agumon',
    sprite: '🔥',
    color: '#e8607c',
    statsBonus: { hp: 30, attack: 15, speed: 8, affection: 10 },
    abilities: ['tackle', 'peck', 'fire_blast', 'claw_slash'],
    spCost: 20,
    description: 'A brave fire-type monster. Loyal and strong.',
  },
  ultimate: {
    form: 'ultimate',
    name: 'MetalGreymon',
    sprite: '🤖',
    color: '#60a8e8',
    statsBonus: { hp: 60, attack: 30, speed: 15, affection: 20 },
    abilities: ['tackle', 'peck', 'fire_blast', 'claw_slash', 'trident_claw', 'mega_flame'],
    spCost: 40,
    description: 'A powerful cyborg monster. A true warrior of the digital world.',
  },
};

export type EvolutionPath = 'balanced' | 'offensive' | 'defensive' | 'speed';

export interface EvolutionPathDef {
  id: EvolutionPath;
  name: string;
  description: string;
  requirements: {
    minBattles: number;
    minCareScore: number;
    minExploration: number;
    preferredStat: 'attack' | 'speed' | 'affection';
  };
  championVariant: string;
  ultimateVariant: string;
}

export const EVOLUTION_PATHS: Record<EvolutionPath, EvolutionPathDef> = {
  balanced: {
    id: 'balanced',
    name: 'Balanced Path',
    description: 'A well-rounded evolution. Good at everything.',
    requirements: { minBattles: 5, minCareScore: 50, minExploration: 3, preferredStat: 'attack' },
    championVariant: 'agumon',
    ultimateVariant: 'metal_greymon',
  },
  offensive: {
    id: 'offensive',
    name: 'Warrior Path',
    description: 'Focused on attack power. Wins battles decisively.',
    requirements: { minBattles: 10, minCareScore: 30, minExploration: 2, preferredStat: 'attack' },
    championVariant: 'greymon',
    ultimateVariant: 'skull_greymon',
  },
  defensive: {
    id: 'defensive',
    name: 'Guardian Path',
    description: 'Focused on defense and support. Protects the team.',
    requirements: { minBattles: 3, minCareScore: 80, minExploration: 5, preferredStat: 'affection' },
    championVariant: 'gabumon',
    ultimateVariant: 'were_garurumon',
  },
  speed: {
    id: 'speed',
    name: 'Scout Path',
    description: 'Focused on speed and exploration. Fast and agile.',
    requirements: { minBattles: 4, minCareScore: 40, minExploration: 10, preferredStat: 'speed' },
    championVariant: 'biyomon',
    ultimateVariant: 'garudamon',
  },
};

export interface EvolutionState {
  currentForm: PetForm;
  unlockedForms: PetForm[];
  selectedPath: EvolutionPath | null;
  sp: number;
  maxSp: number;
  battlesWon: number;
  careScore: number;
  explorationCount: number;
  lastEvolutionTs: number;
  canEvolve: boolean;
  evolutionPending: boolean;
}

export function createInitialEvolutionState(): EvolutionState {
  return {
    currentForm: 'egg',
    unlockedForms: ['egg', 'rookie'],
    selectedPath: null,
    sp: 0,
    maxSp: 100,
    battlesWon: 0,
    careScore: 0,
    explorationCount: 0,
    lastEvolutionTs: 0,
    canEvolve: false,
    evolutionPending: false,
  };
}

export function tickEvolution(state: EvolutionState, now = Date.now()): EvolutionState {
  const spRegenRate = 1;
  const spRegenMs = 60000;
  const sinceLastTick = now - state.lastEvolutionTs;
  const spGain = Math.floor(sinceLastTick / spRegenMs) * spRegenRate;

  return {
    ...state,
    sp: Math.min(state.maxSp, state.sp + spGain),
    lastEvolutionTs: now,
  };
}

export function evaluateEvolution(state: EvolutionState): { canEvolve: boolean; toForm: PetForm | null } {
  if (state.evolutionPending) return { canEvolve: false, toForm: null };

  const currentForm = state.currentForm;

  if (currentForm === 'egg') {
    return { canEvolve: true, toForm: 'rookie' };
  }

  if (currentForm === 'rookie') {
    if (state.sp < 20) return { canEvolve: false, toForm: null };
    if (!state.selectedPath) return { canEvolve: false, toForm: null };

    const path = EVOLUTION_PATHS[state.selectedPath];
    if (state.battlesWon < path.requirements.minBattles) return { canEvolve: false, toForm: null };
    if (state.careScore < path.requirements.minCareScore) return { canEvolve: false, toForm: null };
    if (state.explorationCount < path.requirements.minExploration) return { canEvolve: false, toForm: null };

    return { canEvolve: true, toForm: 'champion' };
  }

  if (currentForm === 'champion') {
    if (state.sp < 40) return { canEvolve: false, toForm: null };
    if (state.battlesWon < 15) return { canEvolve: false, toForm: null };
    if (state.careScore < 100) return { canEvolve: false, toForm: null };
    if (state.explorationCount < 8) return { canEvolve: false, toForm: null };

    return { canEvolve: true, toForm: 'ultimate' };
  }

  return { canEvolve: false, toForm: null };
}

export function evolvePet(
  state: EvolutionState,
  targetForm: PetForm
): { newState: EvolutionState; success: boolean; message: string } {
  const eval_ = evaluateEvolution(state);
  if (!eval_.canEvolve || eval_.toForm !== targetForm) {
    return { newState: state, success: false, message: 'Cannot evolve yet. Keep training!' };
  }

  const spCost = FORMS[targetForm].spCost;
  if (state.sp < spCost) {
    return { newState: state, success: false, message: 'Not enough SP!' };
  }

  const newState: EvolutionState = {
    ...state,
    currentForm: targetForm,
    unlockedForms: state.unlockedForms.includes(targetForm) ? state.unlockedForms : [...state.unlockedForms, targetForm],
    sp: state.sp - spCost,
    lastEvolutionTs: Date.now(),
    evolutionPending: true,
    canEvolve: false,
  };

  return {
    newState,
    success: true,
    message: `Evolving to ${FORMS[targetForm].name}!`,
  };
}

export function completeEvolution(state: EvolutionState): EvolutionState {
  return {
    ...state,
    evolutionPending: false,
  };
}

export function recordBattle(state: EvolutionState, won: boolean): EvolutionState {
  return {
    ...state,
    battlesWon: won ? state.battlesWon + 1 : state.battlesWon,
    careScore: Math.max(0, state.careScore - 2),
  };
}

export function recordCare(state: EvolutionState, careType: 'feed' | 'play' | 'talk' | 'rest'): EvolutionState {
  let careGain = 0;
  switch (careType) {
    case 'feed': careGain = 5; break;
    case 'play': careGain = 8; break;
    case 'talk': careGain = 3; break;
    case 'rest': careGain = 4; break;
  }

  return {
    ...state,
    careScore: state.careScore + careGain,
  };
}

export function recordExploration(state: EvolutionState): EvolutionState {
  return {
    ...state,
    explorationCount: state.explorationCount + 1,
  };
}

export function selectEvolutionPath(state: EvolutionState, pathId: EvolutionPath): EvolutionState {
  if (state.selectedPath) return state;
  return {
    ...state,
    selectedPath: pathId,
  };
}
