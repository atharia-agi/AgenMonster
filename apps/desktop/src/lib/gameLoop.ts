// Game Loop — central tick for world, events, evolution, hub, daily life.
// Runs once on mount and ticks forever.

import { getGameState, saveState, updateAchievements } from './gameState.ts';
import { tickWorld, travelTo, rollEncounter, completeEvent as worldCompleteEvent } from './worldEngine.ts';
import { tickEvolution, evaluateEvolution, recordBattle, recordCare } from './petEvolution.ts';
import { tickHub, completeHubQuest, calculateHubScore } from './hubGrowth.ts';
import { createEventEngine, getTimeOfDay, type EventEngineOptions } from './eventEngine.ts';
import { getSuggestions, type Suggestion } from './suggestions.ts';
import { createEmotionState, tickEmotion, processEmotionEvent, type EmotionState, type EmotionEvent } from './emotion.ts';
import { getPersonalityForStage } from './personality.ts';
import { pickActiveGoal, markStep, addStep, type Goal } from './goals.ts';
import { tickSelfHealing, createInitialSelfHealingState, type HealingAction } from './selfHealing.ts';
import { logger } from './logger.ts';

let interval: ReturnType<typeof setInterval> | null = null;
let eventEngine: ReturnType<typeof createEventEngine> | null = null;
let lastSuggestionCheck = 0;
let emotionState: EmotionState = createEmotionState();

const NEEDS_DECAY_PER_TICK: Record<string, number> = {
  hunger: 2,
  energy: 1.5,
  focus: 1,
  mood: 0.8,
  affection: 0.5,
  motivation: 1,
  knowledge: 0.3,
};

export function getNeedsDecayPerTick(): Record<string, number> {
  return { ...NEEDS_DECAY_PER_TICK };
}

export function startGameLoop() {
  if (interval) return;

  const tick = () => {
    const state = getGameState();
    const now = Date.now();

    const world = tickWorld(state.world, now);
    const petEvo = tickEvolution(state.petEvolution, now);
    const hub = tickHub(state.hub, now);

    const traits = state.personalityTraits || {};
    let needs = { ...state.needs };
    for (const [key, baseDecay] of Object.entries(NEEDS_DECAY_PER_TICK)) {
      let multiplier = 1;
      if (key === 'energy') {
        const efficiency = traits.energyEfficiency ?? 0.5;
        multiplier = 1.5 - efficiency;
      } else {
        const traitKey = `${key}Decay` as keyof typeof traits;
        multiplier = traits[traitKey] !== undefined ? traits[traitKey] : 1;
      }
      const current = needs[key as keyof typeof needs];
      needs[key as keyof typeof needs] = Math.round(Math.max(0, current - baseDecay * multiplier));
    }

    // Self-healing — auto-apply healing actions when needs are critical
    let healingActionTaken: HealingAction | null = null;
    try {
      const healingResult = tickSelfHealing(needs, state.selfHealing ?? createInitialSelfHealingState(), now);
      needs = healingResult.needs;
      const gs = getGameState();
      saveState({ ...gs, needs, selfHealing: healingResult.healingState });
      healingActionTaken = healingResult.actionTaken;
    } catch (e) {
      logger.warn('[gameLoop] self-healing tick failed', { error: String(e) });
    }

    const { newAchievements, state: updatedState } = updateAchievements({ ...state, world, petEvolution: petEvo, hub, needs });
    if (newAchievements.length > 0) {
      window.dispatchEvent(new CustomEvent('agenmonster:achievement-unlocked', { detail: { achievementIds: newAchievements } }));
    }

    // Suggestions — check every 30 minutes
    const nowMs = Date.now();
    if (nowMs - lastSuggestionCheck > 30 * 60 * 1000) {
      lastSuggestionCheck = nowMs;
      try {
        const routines = (state.activeRoutines ?? []).filter((r: any) => (r.confidence ?? r.fitness ?? 0) > 0.3).map((r: any) => ({ task: r.name, daysOfWeek: [1,2,3,4,5,6,7], hourRange: [9,17] as [number,number], confidence: r.confidence ?? r.fitness ?? 0 }));
        const pendingGoals = (state.goals ?? []).filter((g: any) => !g.doneAt).map((g: any) => g.title);
        const suggestions = getSuggestions(routines, pendingGoals, 'general');
        for (const s of suggestions) {
          window.dispatchEvent(new CustomEvent('agenmonster:suggestion', { detail: { text: s.text, reason: s.reason } }));
        }
      } catch (e) {
        logger.warn('[gameLoop] suggestion generation failed', { error: String(e) });
      }
    }

    // Emotion tick — fade mood over time
    try {
      const personality = getPersonalityForStage(state.stage);
      emotionState = tickEmotion(emotionState);
      if (emotionState.moodDuration === 0 && emotionState.currentMood !== state.mood) {
        saveState({ ...state, mood: emotionState.currentMood });
      }
    } catch (e) {
      logger.warn('[gameLoop] emotion tick failed', { error: String(e) });
    }

    // Autonomous goal pursuit — pet advances goals when conditions are right
    try {
      const goals = state.goals ?? [];
      const active = pickActiveGoal(goals);
      if (active && !active.doneAt && needs.energy > 40 && needs.motivation > 30) {
        const pendingSteps = (active.steps ?? []).filter((s: any) => !s.done);
        if (pendingSteps.length > 0) {
          const personality = getPersonalityForStage(state.stage);
          const traits = state.personalityTraits || {};
          const learningSpeed = traits.learningSpeed ?? 1;
          const progressChance = 0.1 * learningSpeed;
          if (Math.random() < progressChance) {
            const stepToMark = pendingSteps[0];
            markStep(active, stepToMark.id);
            processEmotion('task_success');
            window.dispatchEvent(new CustomEvent('agenmonster:goal-progress', {
              detail: { goalId: active.id, stepId: stepToMark.id, title: active.title }
            }));
          }
        }
      }
    } catch (e) {
      logger.warn('[gameLoop] autonomous goal pursuit failed', { error: String(e) });
    }
  };

  tick();
  interval = setInterval(tick, 30000);
}

export function stopGameLoop() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

export function createGameEventEngine(opts: Omit<EventEngineOptions, 'getWorldState'>) {
  eventEngine = createEventEngine({
    ...opts,
    getWorldState: () => getGameState().world,
  });
  eventEngine.startTick(60000);
  return eventEngine;
}

export function getEventEngine() {
  return eventEngine;
}

export function processEmotion(eventType: EmotionEvent) {
  const state = getGameState();
  try {
    const personality = getPersonalityForStage(state.stage);
    const hour = new Date().getHours();
    const timeOfDay = getTimeOfDay(hour);
    emotionState = processEmotionEvent(emotionState, eventType, state.needs, personality, timeOfDay, state.stage as any);
    if (emotionState.currentMood !== state.mood) {
      saveState({ ...state, mood: emotionState.currentMood });
      window.dispatchEvent(new Event('gamestate-change'));
    }
  } catch (e) {
    logger.warn('[gameLoop] emotion event processing failed', { error: String(e) });
  }
}

export function getEmotionState(): EmotionState {
  return emotionState;
}
