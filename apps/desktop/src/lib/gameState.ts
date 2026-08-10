import type { AdaptationWeights, BanditArm, FeedbackEntry, InteractionSignal } from "./selfAdapt.ts";
import { createAdaptationState, recordInteraction, computeReward, adaptWeights, selectPromptVariant, updateBandit } from "./selfAdapt.ts";
import { createEvolutionState, evolve, selectBestPrompt, selectBestRoutine, type EvolutionState, type RoutineGene, type PromptVariant } from "./evolution.ts";
import { loadStateNative, saveStateNative, loadMemoryNative, saveMemoryNative, loadGoalsNative, saveGoalsNative } from "./tauri.ts";
import type { Goal } from "./goals.ts";
import type { ChatThread } from "./threads.ts";

export const SCHEMA_VERSION = 3;

export type Mood = 'happy' | 'sad' | 'proud' | 'focused' | 'idle' | 'neutral' | 'excited' | 'sleepy' | 'frustrated' | 'tired' | 'thinking' | 'angry';
export type Stage = 'egg' | 'hatchling' | 'baby' | 'child' | 'teen' | 'adult' | 'mega';
export type RelationshipLevel = 'stranger' | 'friend' | 'buddy' | 'best_friend' | 'soul_companion';
export type Needs = { hunger: number; affection: number; energy: number; focus: number; mood: number; motivation: number; knowledge: number };
export type Activity = 'idle' | 'chatting' | 'exploring' | 'eating' | 'sleeping' | 'evolving' | 'learning' | 'playing' | 'coding' | 'researching' | 'browsing' | 'dreaming';
export interface Skill { id: string; name: string; category: string; level: number; unlocked: boolean; icon?: string; xp: number; xpToNext: number }
export interface MemoryCrystal { id: string; title: string; description: string; color: string; earnedAt: number }
export interface ActiveTask { id: string; title: string; status: 'pending' | 'active' | 'done' | 'running' | 'queued'; createdAt: number }
export interface Mission { id: string; title: string; description: string; progress: number; maxProgress: number; completed: boolean; status?: string; createdAt?: number }
export interface ChatMessage { id: string; role: 'user' | 'assistant' | 'system'; content: string; timestamp: number; xpEarned?: number; tokens?: number }
export interface ToolInfo { id: string; name: string; available: boolean; icon?: string }
export interface MemoryItem { id: string; content: string; createdAt?: number }

export interface GameState {
  version: number;
  stage: string;
  mood: string;
  energy: number;
  focus: number;
  level: number;
  xp: number;
  xpToNext: number;
  totalXp: number;
  needs: Needs;
  missions: Mission[];
  completedMissions: number;
  completedTasks: number;
  name: string;
  activity: string;
  systemPrompt: string;
  proactivity: number;
  relationshipLevel: number;
  relationshipXp: number;
  relationshipXpToNext: number;
  currentStage: string;
  goals: Goal[];
  activeGoalId: string | null;
  routineType: string;
  routineStep: number;
  shortMemory: MemoryItem[];
  longMemory: MemoryItem[];
  memoryIndex: Record<string, number[]>;
  lastActivityTs: number;
  skills: Skill[];
  crystals: MemoryCrystal[];
  maxCrystals: number;
  activeTasks: ActiveTask[];
  tools: ToolInfo[];
  chatMessages: ChatMessage[];
  items: string[];
  currency: number;
  world: any;
  petEvolution: any;
  hub: any;
  personalityType: string;
  personalityTraits: Record<string, number>;
  internalMonologue: string[];
  selfHealing: any;
  dailyQuests: any[];
  _totalMessages: number;
  _tutorialCompleted: boolean;
  _firstGuidanceShown: boolean;
  _timeoutErrorShown: boolean;
  _lastDailyRecapDate: string;
  _lastMorningWakeupDate: string;
  _moodHistory: { date: string; mood: string; energy: number }[];
  _pendingSpeech?: string;
  _sessionStart: string | number;
  adaptationWeights: AdaptationWeights;
  bandits: BanditArm[];
  feedbackLog: FeedbackEntry[];
  totalInteractions: number;
  lastAdaptationTs: number;
  selectedPromptVariant: string;
  evolution: EvolutionState;
  bestPrompt: PromptVariant;
  activeRoutines: RoutineGene[];
  chatThreads?: Record<string, ChatThread>;
  chatActiveThreadId?: string;
  chatThreadOrder?: string[];
  chatMode?: string;
}

const adaptState = createAdaptationState();
const evoState = createEvolutionState();
const bestPrompt = selectBestPrompt(evoState, { systemPromptWeight: 0.5 });
let _state: GameState | null = null;

function lsGet(key: string): any {
  try {
    const raw = localStorage.getItem(`agenmonster_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function lsSet(key: string, value: any): void {
  try { localStorage.setItem(`agenmonster_${key}`, JSON.stringify(value)); } catch {}
}

export function getGameState(): GameState {
  if (_state) return _state;
  const raw = lsGet('state');
  if (raw) {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (typeof parsed.version === 'number' && parsed.version === SCHEMA_VERSION) {
      _state = parsed as GameState;
      return _state;
    }
    _state = migrate(parsed);
    return _state;
  }
  return resetGameState();
}

export function resetGameState(): GameState {
  const s = createInitialState();
  _state = s;
  lsSet('state', s);
  return s;
}

export function saveState(state: GameState): void {
  _state = state;
  scheduleLsSet('state', state);
}

let _stateTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleLsSet(key: string, value: any): void {
  try {
    localStorage.setItem(`agenmonster_${key}`, JSON.stringify(value));
  } catch {}
}

export async function persistStateNative(state: GameState): Promise<void> {
  _state = state;
  lsSet('state', state);
  try {
    const { saveStateNative } = await import('./tauri.ts');
    await saveStateNative(state);
  } catch {}
}

export function exportState(): string {
  return JSON.stringify(getGameState());
}

export function importState(json: string): GameState {
  const parsed = JSON.parse(json);
  _state = parsed as GameState;
  lsSet('state', _state);
  return _state;
}

function buildWelcomeMessages(): ChatMessage[] {
  return [
    { id: 'welcome-1', role: 'assistant', content: 'Halo! Aku AgenMonster, teman harianmu. Ketik sesuatu untuk mulai!', timestamp: Date.now() },
    { id: 'welcome-2', role: 'assistant', content: 'Coba slash command: /help untuk melihat yang bisa aku lakukan.', timestamp: Date.now() + 1 },
  ];
}

const DEFAULT_TOOLS: ToolInfo[] = [
  { id: 't1', name: 'LLM Chat', available: true, icon: '🤖' },
  { id: 't2', name: 'Memory Recall', available: true, icon: '🔍' },
  { id: 't3', name: 'Goal Tracker', available: true, icon: '📋' },
];

const DEFAULT_SKILLS: Skill[] = [
  { id: 's1', name: 'Chat', category: 'social', level: 1, unlocked: true, icon: '💬', xp: 0, xpToNext: 50 },
  { id: 's2', name: 'Memory', category: 'intellect', level: 1, unlocked: true, icon: '🧠', xp: 0, xpToNext: 50 },
  { id: 's3', name: 'Goals', category: 'planning', level: 0, unlocked: false, icon: '🎯', xp: 0, xpToNext: 50 },
];

export function createInitialState(): GameState {
  return {
    version: SCHEMA_VERSION,
    stage: 'baby',
    mood: 'neutral',
    energy: 0.5,
    focus: 0.5,
    level: 1,
    xp: 0,
    xpToNext: 100,
    totalXp: 0,
    needs: { hunger: 50, affection: 50, energy: 50, focus: 50, mood: 50, motivation: 50, knowledge: 50 },
    missions: [],
    completedMissions: 0,
    name: 'Monster',
    activity: 'idle',
    systemPrompt: bestPrompt.text,
    proactivity: 0.5,
    relationshipLevel: 0,
    relationshipXp: 0,
    relationshipXpToNext: 50,
    currentStage: 'onboarding',
    goals: [],
    activeGoalId: null,
    routineType: 'morning',
    routineStep: 0,
    shortMemory: [],
    longMemory: [],
    memoryIndex: {},
    lastActivityTs: Date.now(),
    skills: DEFAULT_SKILLS,
    crystals: [],
    maxCrystals: 20,
    activeTasks: [],
    tools: DEFAULT_TOOLS,
    chatMessages: buildWelcomeMessages(),
    items: [],
    currency: 0,
    world: undefined,
    petEvolution: undefined,
    hub: undefined,
    personalityType: 'calm',
    personalityTraits: {},
    internalMonologue: [],
    selfHealing: undefined,
    dailyQuests: [],
    completedTasks: 0,
    _totalMessages: 0,
    _tutorialCompleted: false,
    _firstGuidanceShown: false,
    _timeoutErrorShown: false,
    _lastDailyRecapDate: '',
    _lastMorningWakeupDate: '',
    _moodHistory: [],
    _sessionStart: new Date().toISOString(),
    adaptationWeights: adaptState.weights,
    bandits: adaptState.bandits,
    feedbackLog: adaptState.feedbackLog,
    totalInteractions: adaptState.totalInteractions,
    lastAdaptationTs: adaptState.lastAdaptationTs,
    selectedPromptVariant: 'casual',
    evolution: evoState,
    bestPrompt,
    activeRoutines: evoState.routinePopulation,
  };
}

const STAGE_THRESHOLDS: Record<string, number> = {
  egg: 0,
  hatchling: 25,
  baby: 50,
  child: 150,
  teen: 300,
  adult: 500,
  mega: 750,
};

const STAGE_ORDER = Object.keys(STAGE_THRESHOLDS);
const stageRank = (s: string) => STAGE_ORDER.indexOf(s);

function evolveStage(stage: string, totalXp: number): string {
  let highest = stage;
  for (const [s, threshold] of Object.entries(STAGE_THRESHOLDS)) {
    if (totalXp >= threshold) highest = s;
  }
  return stageRank(highest) >= stageRank(stage) ? highest : stage;
}

export function migrate(old: any): GameState {
  const base = createInitialState();
  const next: GameState = {
    ...base,
    version: SCHEMA_VERSION,
    stage: old.stage ?? base.stage,
    mood: old.mood ?? base.mood,
    energy: typeof old.energy === 'number' ? old.energy : base.energy,
    focus: typeof old.focus === 'number' ? old.focus : base.focus,
    level: typeof old.level === 'number' ? old.level : base.level,
    xp: typeof old.xp === 'number' ? old.xp : base.xp,
    xpToNext: typeof old.xpToNext === 'number' ? old.xpToNext : base.xpToNext,
    totalXp: typeof old.totalXp === 'number' ? old.totalXp : base.totalXp,
    needs: { ...base.needs, ...(old.needs || {}) },
    missions: Array.isArray(old.missions) ? old.missions : base.missions,
    completedMissions: typeof old.completedMissions === 'number' ? old.completedMissions : base.completedMissions,
    name: old.name ?? base.name,
    activity: old.activity ?? base.activity,
    systemPrompt: old.systemPrompt ?? base.systemPrompt,
    proactivity: typeof old.proactivity === 'number' ? old.proactivity : base.proactivity,
    relationshipLevel: typeof old.relationshipLevel === 'number' ? old.relationshipLevel : base.relationshipLevel,
    relationshipXp: typeof old.relationshipXp === 'number' ? old.relationshipXp : base.relationshipXp,
    relationshipXpToNext: typeof old.relationshipXpToNext === 'number' ? old.relationshipXpToNext : base.relationshipXpToNext,
    currentStage: old.currentStage ?? base.currentStage,
    goals: Array.isArray(old.goals) ? old.goals : base.goals,
    activeGoalId: old.activeGoalId ?? base.activeGoalId,
    routineType: old.routineType ?? base.routineType,
    routineStep: typeof old.routineStep === 'number' ? old.routineStep : base.routineStep,
    shortMemory: Array.isArray(old.shortMemory) ? old.shortMemory : base.shortMemory,
    longMemory: Array.isArray(old.longMemory) ? old.longMemory : base.longMemory,
    memoryIndex: typeof old.memoryIndex === 'object' && old.memoryIndex !== null ? old.memoryIndex : base.memoryIndex,
    lastActivityTs: typeof old.lastActivityTs === 'number' ? old.lastActivityTs : Date.now(),
    skills: Array.isArray(old.skills) && old.skills.length > 0 ? old.skills : base.skills,
    crystals: Array.isArray(old.crystals) ? old.crystals : base.crystals,
    maxCrystals: typeof old.maxCrystals === 'number' ? old.maxCrystals : base.maxCrystals,
    activeTasks: Array.isArray(old.activeTasks) ? old.activeTasks : base.activeTasks,
    tools: Array.isArray(old.tools) && old.tools.length > 0 ? old.tools : base.tools,
    chatMessages: Array.isArray(old.chatMessages) ? old.chatMessages : base.chatMessages,
    items: Array.isArray(old.items) ? old.items : base.items,
    currency: typeof old.currency === 'number' ? old.currency : base.currency,
    world: old.world ?? base.world,
    petEvolution: old.petEvolution ?? base.petEvolution,
    hub: old.hub ?? base.hub,
    personalityType: old.personalityType ?? base.personalityType,
    personalityTraits: typeof old.personalityTraits === 'object' && old.personalityTraits !== null ? old.personalityTraits : base.personalityTraits,
    internalMonologue: Array.isArray(old.internalMonologue) ? old.internalMonologue : base.internalMonologue,
    selfHealing: old.selfHealing ?? base.selfHealing,
    dailyQuests: Array.isArray(old.dailyQuests) ? old.dailyQuests : base.dailyQuests,
    completedTasks: typeof old.completedTasks === 'number' ? old.completedTasks : base.completedTasks,
    _totalMessages: typeof old._totalMessages === 'number' ? old._totalMessages : base._totalMessages,
    _tutorialCompleted: !!old._tutorialCompleted,
    _firstGuidanceShown: !!old._firstGuidanceShown,
    _timeoutErrorShown: !!old._timeoutErrorShown,
    _lastDailyRecapDate: old._lastDailyRecapDate ?? base._lastDailyRecapDate,
    _lastMorningWakeupDate: old._lastMorningWakeupDate ?? base._lastMorningWakeupDate,
    _moodHistory: Array.isArray(old._moodHistory) ? old._moodHistory : base._moodHistory,
    _sessionStart: old._sessionStart ?? base._sessionStart,
    adaptationWeights: old.adaptationWeights ?? adaptState.weights,
    bandits: Array.isArray(old.bandits) ? old.bandits : adaptState.bandits,
    feedbackLog: Array.isArray(old.feedbackLog) ? old.feedbackLog : adaptState.feedbackLog,
    totalInteractions: typeof old.totalInteractions === 'number' ? old.totalInteractions : adaptState.totalInteractions,
    lastAdaptationTs: typeof old.lastAdaptationTs === 'number' ? old.lastAdaptationTs : adaptState.lastAdaptationTs,
    selectedPromptVariant: old.selectedPromptVariant ?? 'casual',
    evolution: old.evolution ?? evoState,
    bestPrompt: old.bestPrompt ?? bestPrompt,
    activeRoutines: Array.isArray(old.activeRoutines) ? old.activeRoutines : evoState.routinePopulation,
  };
  return next;
}

function adapt(state: GameState): GameState {
  const newWeights = adaptWeights({ weights: state.adaptationWeights, feedbackLog: state.feedbackLog });
  const variant = selectPromptVariant({ bandits: state.bandits });
  return { ...state, adaptationWeights: newWeights, selectedPromptVariant: variant, lastAdaptationTs: Date.now() };
}

function evolveState(state: GameState, feedbackScores: number[], routineScores: number[]): GameState {
  const newEvolution = evolve(state.evolution, feedbackScores, routineScores);
  const bestPrompt = selectBestPrompt(newEvolution, { systemPromptWeight: state.adaptationWeights.systemPromptWeight });
  return { ...state, evolution: newEvolution, bestPrompt, systemPrompt: bestPrompt.text };
}

export function dispatchEvent(event: { type?: string; data?: any }): GameState {
  const current = getGameState();
  switch (event.type) {
    case 'chat': {
      const text = typeof event.data === 'string' ? event.data : event.data?.text || '';
      const xpGain = 5;
      const updated = addXP(current, xpGain);
      const newMessages: ChatMessage[] = [
        ...updated.chatMessages,
        { id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() },
        { id: crypto.randomUUID(), role: 'assistant', content: '', timestamp: Date.now() },
      ];
      if (newMessages.length > 200) newMessages.splice(0, 100);
      const next = {
        ...updated,
        chatMessages: newMessages,
        _totalMessages: current._totalMessages + 1,
        lastActivityTs: Date.now(),
      };
      saveState(next);
      return next;
    }
    case 'feed': {
      const s = { ...current, needs: { ...current.needs, hunger: current.needs.hunger - 20 }, lastActivityTs: Date.now() };
      saveState(s);
      return s;
    }
    case 'play': {
      const s = { ...current, needs: { ...current.needs, affection: current.needs.affection + 10 }, lastActivityTs: Date.now() };
      saveState(s);
      return s;
    }
    case 'talk': {
      const s = { ...current, needs: { ...current.needs, affection: current.needs.affection + 5 }, lastActivityTs: Date.now() };
      saveState(s);
      return s;
    }
    case 'idle': {
      const now = Date.now();
      const last = current.lastActivityTs || now;
      const diff = now - last;
      let newMood = current.mood;
      if (diff > 60000) newMood = 'dormant';
      else if (diff > 10000) newMood = 'idle';
      saveState({ ...current, mood: newMood });
      return getGameState();
    }
    default:
      return current;
  }
}

export function feedPet(state: GameState): GameState {
  const s = { ...state, needs: { ...state.needs, hunger: state.needs.hunger - 20 }, lastActivityTs: Date.now() };
  saveState(s);
  return s;
}

export function playWithPet(state: GameState): GameState {
  const s = { ...state, needs: { ...state.needs, affection: state.needs.affection + 10 }, lastActivityTs: Date.now() };
  saveState(s);
  return s;
}

export function talkToPet(state: GameState): GameState {
  const s = { ...state, needs: { ...state.needs, affection: state.needs.affection + 5 }, lastActivityTs: Date.now() };
  saveState(s);
  return s;
}

export function handleChat(state: GameState, userMessage: string, assistantReply: string): GameState {
  const signal: InteractionSignal = { type: 'message_sent', timestamp: Date.now(), detail: userMessage.slice(0, 50), value: 0.5 };
  const reward = computeReward(signal);
  recordInteraction({ weights: state.adaptationWeights, feedbackLog: state.feedbackLog, totalInteractions: state.totalInteractions }, signal, reward);
  updateBandit({ bandits: state.bandits }, state.selectedPromptVariant, reward);
  const updated = adapt({
    ...state,
    totalInteractions: state.totalInteractions + 1,
    feedbackLog: [...state.feedbackLog, { timestamp: Date.now(), signal, score: reward }],
  });
  const evolved = addXP(updated, 5);
  const newMessages: ChatMessage[] = [...evolved.chatMessages, { id: crypto.randomUUID(), role: 'user', content: userMessage, timestamp: Date.now() }];
  if (newMessages.length > 200) newMessages.splice(0, 100);
  saveState({ ...evolved, chatMessages: newMessages, _totalMessages: state._totalMessages + 1, lastActivityTs: Date.now() });
  return getGameState();
}

export function handleToolUse(state: GameState, toolName: string, success: boolean): GameState {
  const signal: InteractionSignal = { type: 'tool_use', timestamp: Date.now(), detail: toolName, value: success ? 0.1 : -0.2 };
  const reward = computeReward(signal);
  recordInteraction({ weights: state.adaptationWeights, feedbackLog: state.feedbackLog, totalInteractions: state.totalInteractions }, signal, reward);
  const updated = adapt({
    ...state,
    totalInteractions: state.totalInteractions + 1,
    feedbackLog: [...state.feedbackLog, { timestamp: Date.now(), signal, score: reward }],
  });
  const evolved = addXP(updated, success ? 3 : -1);
  saveState({ ...evolved, lastActivityTs: Date.now() });
  return getGameState();
}

export function handleTaskComplete(state: GameState, taskId: string, success: boolean): GameState {
  const signal: InteractionSignal = {
    type: success ? 'goal_complete' : 'goal_fail',
    timestamp: Date.now(),
    detail: taskId,
    value: success ? 1 : 0,
  };
  const reward = computeReward(signal);
  recordInteraction({ weights: state.adaptationWeights, feedbackLog: state.feedbackLog, totalInteractions: state.totalInteractions }, signal, reward);
  updateBandit({ bandits: state.bandits }, state.selectedPromptVariant, reward);
  const updated = adapt({
    ...state,
    totalInteractions: state.totalInteractions + 1,
    feedbackLog: [...state.feedbackLog, { timestamp: Date.now(), signal, score: reward }],
  });
  const evolved = addXP(updated, success ? 20 : 0);
  const feedbackScores = updated.feedbackLog.slice(-10).map((f) => f.score);
  const routineScores = updated.activeRoutines.map((r) => r.fitness);
  const finalState = evolveState(evolved, feedbackScores, routineScores);
  saveState({ ...finalState, lastActivityTs: Date.now() });
  return getGameState();
}

export function addAssistantMessage(state: GameState, content: string): GameState {
  const msg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content, timestamp: Date.now() };
  const s = {
    ...state,
    chatMessages: [
      ...state.chatMessages,
      msg,
    ],
  };
  saveState(s);
  return getGameState();
}

export function handleFeedback(state: GameState, rating: number): GameState {
  const signal: InteractionSignal = { type: 'feedback', timestamp: Date.now(), detail: `rating_${rating}`, value: rating };
  const reward = computeReward(signal);
  recordInteraction({ weights: state.adaptationWeights, feedbackLog: state.feedbackLog, totalInteractions: state.totalInteractions }, signal, reward);
  updateBandit({ bandits: state.bandits }, state.selectedPromptVariant, reward);
  const updated = adapt({
    ...state,
    totalInteractions: state.totalInteractions + 1,
    feedbackLog: [...state.feedbackLog, { timestamp: Date.now(), signal, score: reward }],
  });
  saveState({ ...updated, lastActivityTs: Date.now() });
  return getGameState();
}

export function handleError(state: GameState, error: string): GameState {
  const signal: InteractionSignal = { type: 'tool_use', timestamp: Date.now(), detail: error.slice(0, 50), value: -0.3 };
  const reward = computeReward(signal);
  recordInteraction({ weights: state.adaptationWeights, feedbackLog: state.feedbackLog, totalInteractions: state.totalInteractions }, signal, reward);
  const updated = adapt({
    ...state,
    totalInteractions: state.totalInteractions + 1,
    feedbackLog: [...state.feedbackLog, { timestamp: Date.now(), signal, score: reward }],
  });
  saveState({ ...updated, lastActivityTs: Date.now() });
  return getGameState();
}

export function handleSessionEnd(state: GameState): GameState {
  const sessionLength = Date.now() - (state.lastActivityTs || Date.now());
  const signal: InteractionSignal = { type: 'session_end', timestamp: Date.now(), detail: 'session', value: sessionLength };
  const reward = computeReward(signal);
  recordInteraction({ weights: state.adaptationWeights, feedbackLog: state.feedbackLog, totalInteractions: state.totalInteractions }, signal, reward);
  const updated = adapt({
    ...state,
    totalInteractions: state.totalInteractions + 1,
    feedbackLog: [...state.feedbackLog, { timestamp: Date.now(), signal, score: reward }],
  });
  saveState({ ...updated, lastActivityTs: Date.now() });
  return getGameState();
}

export function handleScheduleTick(state: GameState): GameState {
  const routine = selectBestRoutine(state.evolution, state.routineType);
  if (routine) {
    const updated = { ...state, activeRoutines: state.evolution.routinePopulation };
    saveState(updated);
    return getGameState();
  }
  return state;
}

export function getAdaptationReport(state: GameState): {
  weights: AdaptationWeights;
  variant: string;
  totalInteractions: number;
  bestPrompt: PromptVariant;
  routineCount: number;
  generation: number;
} {
  return {
    weights: state.adaptationWeights,
    variant: state.selectedPromptVariant,
    totalInteractions: state.totalInteractions,
    bestPrompt: state.bestPrompt,
    routineCount: state.activeRoutines.length,
    generation: state.evolution.generation,
  };
}

export function updateAchievements(state: GameState): { newAchievements: string[]; state: GameState } {
  return { newAchievements: [], state };
}

export function setPersonalityType(state: GameState, type: string): GameState {
  return { ...state, personalityType: type };
}

export function setPersonalityTraits(state: GameState, traits: Record<string, number>): GameState {
  return { ...state, personalityTraits: traits };
}

export function useItemOnPet(state: GameState, itemId: string): GameState {
  const item = (state.items || []).find((id) => id === itemId);
  if (!item) return state;
  const without = { ...state, items: (state.items || []).filter((id) => id !== itemId) };
  return without;
}

export function addXP(state: GameState, amount: number): GameState {
  let { xp, level, xpToNext, stage, totalXp } = state;
  totalXp += amount;
  xp += amount;
  while (xp >= xpToNext) {
    xp -= xpToNext;
    level += 1;
    xpToNext = Math.floor(xpToNext * 1.2);
  }
  stage = evolveStage(stage, totalXp);
  return { ...state, xp, level, xpToNext, stage, totalXp };
}
