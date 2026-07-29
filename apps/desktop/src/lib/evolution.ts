import { persistState, loadState } from "./selfAdapt.ts";

export interface PromptVariant {
  name: string;
  text: string;
  effectiveness: number;
  uses: number;
  lastUsed: number;
}

export interface RoutineGene {
  name: string;
  steps: string[];
  fitness: number;
  generation: number;
}

export interface PersonalityAllele {
  trait: string;
  value: number;
  drift: number;
}

export interface EvolutionState {
  promptVariants: PromptVariant[];
  routinePopulation: RoutineGene[];
  personalityAlleles: PersonalityAllele[];
  generation: number;
  mutations: number;
  bestFitness: number;
  lastEvolutionTs: number;
  evolutionLog: string[];
}

const INITIAL_PROMPTS: PromptVariant[] = [
  { name: "casual", text: "You are a friendly, casual daily companion. Keep responses light and encouraging.", effectiveness: 0.5, uses: 0, lastUsed: 0 },
  { name: "focused", text: "You are a focused and productive daily companion. Help the user stay on track with clear, actionable responses.", effectiveness: 0.5, uses: 0, lastUsed: 0 },
  { name: "creative", text: "You are a creative and inspiring daily companion. Use vivid language, metaphors, and unexpected perspectives.", effectiveness: 0.5, uses: 0, lastUsed: 0 },
];

const DEFAULT_ROUTINES: RoutineGene[] = [
  { name: "morning", steps: ["Wake up", "Check goals", "Review schedule", "Positive affirmation"], fitness: 0.5, generation: 1 },
  { name: "evening", steps: ["Reflect on day", "Complete goals", "Plan tomorrow", "Gratitude note"], fitness: 0.5, generation: 1 },
  { name: "focus_block", steps: ["Set timer", "Work on priority", "Short break", "Review progress"], fitness: 0.5, generation: 1 },
];

const DEFAULT_PERSONALITY: PersonalityAllele[] = [
  { trait: "enthusiasm", value: 0.5, drift: 0.01 },
  { trait: "empathy", value: 0.5, drift: 0.01 },
  { trait: "directness", value: 0.5, drift: 0.01 },
  { trait: "humor", value: 0.3, drift: 0.005 },
  { trait: "patience", value: 0.7, drift: 0.005 },
];

const MUTATION_RATE = 0.15;
const CROSSOVER_RATE = 0.3;
const ELITISM_COUNT = 1;
const MAX_GENERATIONS = 1000;
const MAX_LOG_ENTRIES = 100;

export function createEvolutionState(): EvolutionState {
  return {
    promptVariants: [...INITIAL_PROMPTS],
    routinePopulation: [...DEFAULT_ROUTINES],
    personalityAlleles: DEFAULT_PERSONALITY.map((a) => ({ ...a })),
    generation: 1,
    mutations: 0,
    bestFitness: 0.5,
    lastEvolutionTs: Date.now(),
    evolutionLog: [],
  };
}

function mutateText(text: string): string {
  const words = text.split(" ");
  const idx = Math.floor(Math.random() * words.length);
  const modifiers = [
    "always ", "consistently ", "with energy ", "with empathy ", "using clear examples ",
    "encouragingly ", "directly ", "enthusiastically ", "thoughtfully ", "concisely ",
  ];
  words.splice(idx, 0, modifiers[Math.floor(Math.random() * modifiers.length)]);
  return words.join(" ");
}

function mutateStep(step: string): string {
  const mutations = [
    () => `Start with: ${step}`,
    () => `${step} — reflect briefly`,
    () => `${step}, then note the outcome`,
    () => `Quick ${step.toLowerCase()} check-in`,
    () => `${step} (5 min max)`,
    () => `Gentle ${step.toLowerCase()} session`,
  ];
  return mutations[Math.floor(Math.random() * mutations.length)]();
}

function mutateRoutine(routine: RoutineGene): RoutineGene {
  const newSteps = [...routine.steps];
  const mutationCount = Math.max(1, Math.floor(Math.random() * 3));

  for (let i = 0; i < mutationCount; i++) {
    const op = Math.random();
    if (op < 0.4 && newSteps.length > 1) {
      newSteps.splice(Math.floor(Math.random() * newSteps.length), 1);
    } else if (op < 0.7) {
      newSteps[Math.floor(Math.random() * newSteps.length)] = mutateStep(newSteps[Math.floor(Math.random() * newSteps.length)]);
    } else {
      newSteps.push(mutateStep("New step"));
    }
  }

  return { ...routine, steps: newSteps, generation: routine.generation + 1 };
}

function crossoverRoutines(a: RoutineGene, b: RoutineGene): RoutineGene {
  if (Math.random() > CROSSOVER_RATE) return mutateRoutine(a);

  const cut = Math.min(a.steps.length, b.steps.length);
  const childSteps = cut > 0
    ? [...a.steps.slice(0, Math.floor(cut / 2)), ...b.steps.slice(Math.floor(cut / 2))]
    : [...a.steps];

  return {
    name: `${a.name}_${b.name}_hybrid`,
    steps: childSteps,
    fitness: 0.3,
    generation: Math.max(a.generation, b.generation) + 1,
  };
}

export function evolve(
  evoState: EvolutionState,
  feedbackScores: number[],
  routineScores: number[],
): EvolutionState {
  if (evoState.generation >= MAX_GENERATIONS) {
    return evoState;
  }
  if (feedbackScores.length === 0 && routineScores.length === 0) {
    return evoState;
  }

  const newPromptVariants = evoState.promptVariants.map((pv) => {
    const score = feedbackScores.length > 0
      ? feedbackScores.reduce((s, f) => s + f, 0) / feedbackScores.length
      : 0.5;
    return { ...pv, effectiveness: score };
  });

  const sorted = [...newPromptVariants].sort((a, b) => b.effectiveness - a.effectiveness);
  const elite = sorted.slice(0, ELITISM_COUNT);
  const rest = sorted.slice(ELITISM_COUNT);

  const mutated = rest.map((pv) => {
    if (Math.random() < MUTATION_RATE) {
      return {
        ...pv,
        text: mutateText(pv.text),
        effectiveness: Math.min(1, pv.effectiveness + (Math.random() - 0.3) * 0.1),
        uses: 0,
        lastUsed: 0,
      };
    }
    return pv;
  });

  const newPopulation = [...elite, ...mutated];

  const sortedRoutines = [...evoState.routinePopulation].sort((a, b) => b.fitness - a.fitness);
  const eliteRoutines = sortedRoutines.slice(0, ELITISM_COUNT);
  const restRoutines = sortedRoutines.slice(ELITISM_COUNT);

  const mutatedRoutines = restRoutines.map((r) => {
    if (Math.random() < MUTATION_RATE) {
      return mutateRoutine(r);
    }
    return r;
  });

  const crossedRoutines = restRoutines.length >= 2
    ? Array.from({ length: Math.floor(restRoutines.length / 2) }, (_, i) =>
        crossoverRoutines(restRoutines[i * 2] || restRoutines[0], restRoutines[i * 2 + 1] || restRoutines[0]),
      )
    : [];

  const newRoutinePopulation = [...eliteRoutines, ...mutatedRoutines, ...crossedRoutines].slice(0, 10);

  const avgScore = feedbackScores.length > 0 ? feedbackScores.reduce((s, f) => s + f, 0) / feedbackScores.length : 0;
  const bestFitness = Math.max(evoState.bestFitness, avgScore);

  const newAlleles = evoState.personalityAlleles.map((allele) => {
    const drift = (Math.random() - 0.5) * allele.drift * 2;
    let newValue = allele.value + drift;
    newValue = Math.max(0, Math.min(1, newValue));
    return { ...allele, value: newValue };
  });

  const logEntry = `Gen ${evoState.generation}: avgScore=${avgScore.toFixed(3)}, bestFitness=${bestFitness.toFixed(3)}, mutations=${mutated.length + mutatedRoutines.length}`;
  const newLog = [...evoState.evolutionLog, logEntry].slice(-MAX_LOG_ENTRIES);

  evoState.mutations += mutated.length + mutatedRoutines.length;

  const newState: EvolutionState = {
    promptVariants: newPopulation,
    routinePopulation: newRoutinePopulation,
    personalityAlleles: newAlleles,
    generation: evoState.generation + 1,
    mutations: evoState.mutations,
    bestFitness,
    lastEvolutionTs: Date.now(),
    evolutionLog: newLog,
  };

  persistState("agenmonster_evolution", newState);
  return newState;
}

export function selectBestPrompt(evoState: EvolutionState, weights: { systemPromptWeight: number }): PromptVariant {
  const weighted = evoState.promptVariants.map((pv) => ({
    ...pv,
    score: pv.effectiveness * (weights.systemPromptWeight || 0.5) + (1 - (weights.systemPromptWeight || 0.5)) * (1 / evoState.promptVariants.length),
  }));
  weighted.sort((a, b) => b.score - a.score);
  return weighted[0];
}

export function selectBestRoutine(evoState: EvolutionState, name: string): RoutineGene | null {
  const candidates = evoState.routinePopulation.filter((r) => r.name === name || r.name.includes(name));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.fitness - a.fitness);
  return candidates[0];
}

export function updateRoutineFitness(
  evoState: EvolutionState,
  routineName: string,
  score: number,
): void {
  const routine = evoState.routinePopulation.find((r) => r.name === routineName);
  if (routine) {
    routine.fitness = routine.fitness * 0.7 + score * 0.3;
    evoState.lastEvolutionTs = Date.now();
    persistState("agenmonster_evolution", evoState);
  }
}

export function getPersonalityTraits(evoState: EvolutionState): Record<string, number> {
  const traits: Record<string, number> = {};
  for (const allele of evoState.personalityAlleles) {
    traits[allele.trait] = allele.value;
  }
  return traits;
}

export function getEvolutionProgress(evoState: EvolutionState): {
  generation: number;
  mutations: number;
  bestFitness: number;
  promptVariants: number;
  routines: number;
  lastEvolutionTs: number;
} {
  return {
    generation: evoState.generation,
    mutations: evoState.mutations,
    bestFitness: evoState.bestFitness,
    promptVariants: evoState.promptVariants.length,
    routines: evoState.routinePopulation.length,
    lastEvolutionTs: evoState.lastEvolutionTs,
  };
}
