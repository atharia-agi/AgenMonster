// Daily Life Loop — time-based activities that make the monster feel alive.
// Monster has a schedule: morning → work → lunch → work → evening → sleep → dream.

export type TimeOfDay = 'dawn' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night' | 'late_night';

export type ActivityType =
  | 'sleeping' | 'waking_up' | 'breakfast' | 'morning_routine'
  | 'working' | 'researching' | 'coding' | 'browsing'
  | 'lunch_break' | 'afternoon_work'
  | 'evening_relax' | 'gaming' | 'reading'
  | 'preparing_sleep' | 'dreaming' | 'idle';

export interface ScheduleEntry {
  startHour: number;
  endHour: number;
  activity: ActivityType;
  label: string;
  icon: string;
}

export interface DailyState {
  currentActivity: ActivityType;
  currentTimeOfDay: TimeOfDay;
  scheduleIndex: number;
  hoursSlept: number;
  isNapping: boolean;
  dreamActive: boolean;
  dreamContent: string[];
}

// Default schedule (24h format)
export const DEFAULT_SCHEDULE: ScheduleEntry[] = [
  { startHour: 0, endHour: 5, activity: 'sleeping', label: 'Deep Sleep', icon: 'ico-mood-sleepy' },
  { startHour: 5, endHour: 6, activity: 'dreaming', label: 'Dreaming', icon: 'ico-mood-thinking' },
  { startHour: 6, endHour: 7, activity: 'waking_up', label: 'Waking Up', icon: 'ico-stage-hatchling' },
  { startHour: 7, endHour: 8, activity: 'breakfast', label: 'Token Breakfast', icon: 'ico-need-hunger' },
  { startHour: 8, endHour: 12, activity: 'working', label: 'Morning Work', icon: 'ico-stage-baby' },
  { startHour: 12, endHour: 13, activity: 'lunch_break', label: 'Lunch Break', icon: 'ico-need-hunger' },
  { startHour: 13, endHour: 17, activity: 'afternoon_work', label: 'Afternoon Work', icon: 'ico-need-energy' },
  { startHour: 17, endHour: 19, activity: 'evening_relax', label: 'Evening Relax', icon: 'ico-action-play' },
  { startHour: 19, endHour: 21, activity: 'researching', label: 'Night Research', icon: 'ico-need-knowledge' },
  { startHour: 21, endHour: 22, activity: 'preparing_sleep', label: 'Getting Sleepy', icon: 'ico-weather-stars' },
  { startHour: 22, endHour: 24, activity: 'sleeping', label: 'Sleeping', icon: 'ico-mood-sleepy' },
];

const DREAM_CONTENTS = [
  ['flying through code...', 'bugs turn into butterflies...', 'a giant keyboard appears...'],
  ['an ocean of tokens...', 'swimming in data...', 'a whale of knowledge...'],
  ['a forest of variables...', 'trees grow functions...', 'flowers bloom as outputs...'],
  ['a mountain of PRs...', 'climbing to the summit...', 'the view is merge conflicts...'],
  ['a city of APIs...', 'buildings are endpoints...', 'traffic flows as requests...'],
  ['a galaxy of skills...', 'each star is a memory...', 'nebulae of knowledge...'],
];

export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  if (hour >= 20 && hour < 23) return 'night';
  return 'late_night';
}

export function getCurrentActivity(hour: number): ScheduleEntry {
  for (const entry of DEFAULT_SCHEDULE) {
    if (hour >= entry.startHour && hour < entry.endHour) {
      return entry;
    }
  }
  return DEFAULT_SCHEDULE[0]; // sleeping
}

export function createDailyState(): DailyState {
  const now = new Date();
  const hour = now.getHours();
  const entry = getCurrentActivity(hour);

  return {
    currentActivity: entry.activity,
    currentTimeOfDay: getTimeOfDay(hour),
    scheduleIndex: DEFAULT_SCHEDULE.indexOf(entry),
    hoursSlept: 0,
    isNapping: false,
    dreamActive: false,
    dreamContent: [],
  };
}

export function tickDaily(state: DailyState, energy: number, hour: number): DailyState {
  const newState = { ...state };
  const entry = getCurrentActivity(hour);

  // Update activity based on schedule
  if (entry.activity !== state.currentActivity) {
    newState.currentActivity = entry.activity;
    newState.currentTimeOfDay = getTimeOfDay(hour);

    // Start dreaming if sleeping past 5am
    if (entry.activity === 'dreaming') {
      newState.dreamActive = true;
      newState.dreamContent = DREAM_CONTENTS[Math.floor(Math.random() * DREAM_CONTENTS.length)];
    } else {
      newState.dreamActive = false;
    }
  }

  // Force sleep if energy is critical
  if (energy <= 5 && state.currentActivity !== 'sleeping') {
    newState.currentActivity = 'sleeping';
    newState.isNapping = true;
  }

  // Wake up if napping and energy restored
  if (state.isNapping && energy >= 50) {
    newState.isNapping = false;
    newState.currentActivity = 'waking_up';
  }

  return newState;
}

// Get activity description for display
export function getActivityDescription(activity: ActivityType): string {
  const descriptions: Record<ActivityType, string> = {
    sleeping: 'Zzz... sleeping peacefully...',
    waking_up: '*stretch* Good morning!',
    breakfast: 'Nom nom tokens...',
    morning_routine: 'Getting ready for the day...',
    working: 'Working hard...',
    researching: 'Exploring knowledge...',
    coding: 'Writing code...',
    browsing: 'Browsing the web...',
    lunch_break: 'Taking a break...',
    afternoon_work: 'Afternoon productivity!',
    evening_relax: 'Relaxing after work...',
    gaming: 'Playing games...',
    reading: 'Reading something interesting...',
    preparing_sleep: 'Getting sleepy...',
    dreaming: 'Having a wonderful dream...',
    idle: 'Waiting for something to happen...',
  };
  return descriptions[activity];
}

// Get activity for mood (maps daily activity to mood)
export function getActivityMood(activity: ActivityType): string {
  const moodMap: Record<ActivityType, string> = {
    sleeping: 'sleepy',
    waking_up: 'idle',
    breakfast: 'happy',
    morning_routine: 'idle',
    working: 'focused',
    researching: 'focused',
    coding: 'focused',
    browsing: 'happy',
    lunch_break: 'happy',
    afternoon_work: 'focused',
    evening_relax: 'happy',
    gaming: 'excited',
    reading: 'thinking',
    preparing_sleep: 'sleepy',
    dreaming: 'happy',
    idle: 'idle',
  };
  return moodMap[activity];
}
