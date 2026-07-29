// Emotion Engine — mood changes based on events, energy, time, and activity.
// Replaces static mood with dynamic emotional state machine.

import type { Mood, Needs, Stage } from './gameState';
import type { PersonalityProfile } from './personality';

export type EmotionEvent =
  | 'task_success' | 'task_fail' | 'task_complete'
  | 'token_eat' | 'token_low'
  | 'user_praise' | 'user_ignored'
  | 'long_task' | 'bug_found' | 'deploy_success'
  | 'tool_error' | 'tool_success'
  | 'sleep_start' | 'sleep_end'
  | 'evolve_start' | 'evolve_complete'
  | 'idle_long' | 'interaction'
  | 'energy_high' | 'energy_low' | 'energy_critical';

export interface EmotionState {
  currentMood: Mood;
  moodIntensity: number; // 0-1, how strong the emotion is
  moodDuration: number; // ticks since mood started
  moodMaxDuration: number; // max ticks before mood fades
  lastEvent: EmotionEvent | null;
  lastEventTime: number;
}

const MOOD_TRANSITIONS: Record<Mood, Record<string, Mood>> = {
  idle: {
    task_success: 'happy',
    task_fail: 'sad',
    token_eat: 'happy',
    user_praise: 'happy',
    user_ignored: 'sad',
    long_task: 'focused',
    bug_found: 'frustrated',
    deploy_success: 'excited',
    tool_error: 'frustrated',
    tool_success: 'proud',
    sleep_start: 'sleepy',
    energy_high: 'happy',
    energy_low: 'tired',
    interaction: 'happy',
  },
  happy: {
    task_fail: 'frustrated',
    token_low: 'sad',
    user_ignored: 'idle',
    long_task: 'focused',
    idle_long: 'idle',
    energy_low: 'idle',
    sleep_start: 'sleepy',
  },
  sad: {
    task_success: 'happy',
    user_praise: 'happy',
    token_eat: 'happy',
    interaction: 'idle',
    sleep_start: 'sleepy',
  },
  focused: {
    task_success: 'proud',
    task_fail: 'frustrated',
    deploy_success: 'excited',
    tool_error: 'frustrated',
    idle_long: 'idle',
    sleep_start: 'sleepy',
  },
  excited: {
    task_fail: 'sad',
    idle_long: 'happy',
    energy_low: 'idle',
    sleep_start: 'sleepy',
  },
  sleepy: {
    sleep_end: 'idle',
    interaction: 'idle',
    token_eat: 'happy',
  },
  proud: {
    task_fail: 'frustrated',
    idle_long: 'happy',
    user_ignored: 'idle',
    energy_low: 'idle',
  },
  frustrated: {
    task_success: 'proud',
    deploy_success: 'excited',
    user_praise: 'happy',
    idle_long: 'sad',
    sleep_start: 'sleepy',
  },
  angry: {
    task_success: 'happy',
    user_praise: 'happy',
    idle_long: 'frustrated',
    sleep_start: 'sleepy',
  },
  thinking: {
    task_success: 'proud',
    task_fail: 'frustrated',
    tool_success: 'happy',
    idle_long: 'idle',
  },
  tired: {
    sleep_end: 'idle',
    token_eat: 'happy',
    interaction: 'sleepy',
    energy_high: 'idle',
    user_praise: 'happy',
    idle_long: 'sleepy',
  },
};

// Energy thresholds affect mood
function getEnergyMoodModifier(energy: number): Mood | null {
  if (energy <= 10) return 'sleepy';
  if (energy <= 25) return 'sad';
  if (energy >= 80) return null; // no modifier
  return null;
}

// Time of day affects mood
function getTimeMoodModifier(timeOfDay: string, currentMood: Mood): Mood | null {
  if (timeOfDay === 'night' && currentMood !== 'sleepy' && currentMood !== 'focused') {
    return 'sleepy';
  }
  if (timeOfDay === 'morning' && currentMood === 'sleepy') {
    return 'idle';
  }
  return null;
}

export function createEmotionState(): EmotionState {
  return {
    currentMood: 'idle',
    moodIntensity: 0.5,
    moodDuration: 0,
    moodMaxDuration: 300, // 5 seconds at 60fps
    lastEvent: null,
    lastEventTime: 0,
  };
}

export function processEmotionEvent(
  state: EmotionState,
  event: EmotionEvent,
  needs: Needs,
  personality: PersonalityProfile,
  timeOfDay: string,
  stage: Stage
): EmotionState {
  const newState = { ...state };
  newState.lastEvent = event;
  newState.lastEventTime = Date.now();

  // Get transition
  const transitions = MOOD_TRANSITIONS[state.currentMood];
  let newMood: Mood | undefined;

  if (transitions) {
    // Personality can modify transitions
    if (personality.riskTolerance > 0.7 && (event === 'task_fail' || event === 'tool_error')) {
      newMood = 'excited'; // high risk = excited by failure
    } else if (personality.energyEfficiency > 0.8 && event === 'energy_low') {
      newMood = 'focused'; // efficient = stays focused
    } else {
      newMood = transitions[event] as Mood | undefined;
    }
  }

  if (newMood) {
    newState.currentMood = newMood;
    newState.moodIntensity = 0.8;
    newState.moodDuration = 0;
    newState.moodMaxDuration = getMoodDuration(newMood);
  }

  // Energy modifier
  const energyMod = getEnergyMoodModifier(needs.energy);
  if (energyMod && newState.moodDuration > 60) {
    newState.currentMood = energyMod;
    newState.moodIntensity = 0.6;
  }

  // Time modifier
  const timeMod = getTimeMoodModifier(timeOfDay, newState.currentMood);
  if (timeMod && newState.moodDuration > 120) {
    newState.currentMood = timeMod;
    newState.moodIntensity = 0.4;
  }

  return newState;
}

function getMoodDuration(mood: Mood): number {
  const durations: Record<Mood, number> = {
    idle: 300,
    happy: 240,
    sad: 360,
    focused: 480,
    excited: 180,
    sleepy: 600,
    proud: 300,
    frustrated: 240,
    angry: 200,
    thinking: 360,
    tired: 420,
  };
  return durations[mood] || 300;
}

export function tickEmotion(state: EmotionState): EmotionState {
  const newState = { ...state };
  newState.moodDuration++;

  // Mood fades over time
  if (newState.moodDuration >= newState.moodMaxDuration) {
    if (newState.currentMood !== 'idle') {
      newState.currentMood = 'idle';
      newState.moodIntensity = 0.5;
      newState.moodDuration = 0;
    }
  }

  // Intensity decreases over time
  if (newState.moodIntensity > 0.1) {
    newState.moodIntensity -= 0.001;
  }

  return newState;
}

// Get mood description for display
export function getMoodDescription(mood: Mood, intensity: number): string {
  if (intensity > 0.8) {
    const strong: Record<Mood, string> = {
      idle: 'Relaxed',
      happy: 'Very Happy!',
      sad: 'Quite Sad...',
      focused: 'Laser Focused!',
      excited: 'Super Excited!',
      sleepy: 'Very Sleepy',
      proud: 'So Proud!',
      frustrated: 'Very Frustrated!',
      angry: 'Furious!',
      thinking: 'Deep in Thought',
      tired: 'Exhausted!',
    };
    return strong[mood];
  }
  const mild: Record<Mood, string> = {
    idle: 'Content',
    happy: 'Happy',
    sad: 'A bit down',
    focused: 'Concentrating',
    excited: 'Excited',
    sleepy: 'Drowsy',
    proud: 'Proud',
    frustrated: 'Annoyed',
    angry: 'Irritated',
    thinking: 'Thinking',
    tired: 'Tired',
  };
  return mild[mood];
}
