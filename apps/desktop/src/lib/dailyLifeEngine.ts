// Daily Life Engine — ties monster activity/needs to real clock time.
// Runs as a Svelte `use:` action so it starts once on mount and ticks forever.

import { getGameState, dispatchEvent } from './gameState';
import { getCurrentActivity, getActivityMood } from './dailyLife';
import { sendNotification } from './notifications';
import type { Activity } from './gameState';

// Map schedule activity (from dailyLife.ts) to state.activity (gameState Activity type)
function mapScheduleActivity(act: string): Activity {
  switch (act) {
    case 'sleeping':
    case 'dreaming':
      return 'sleeping';
    case 'breakfast':
    case 'lunch_break':
      return 'eating';
    case 'morning_routine':
    case 'preparing_sleep':
      return 'idle';
    case 'working':
    case 'coding':
    case 'afternoon_work':
      return 'coding';
    case 'researching':
      return 'researching';
    case 'browsing':
    case 'evening_relax':
      return 'browsing';
    case 'gaming':
    case 'reading':
    case 'idle':
    default:
      return 'idle';
  }
}

// Speech bubble text on activity transitions
function speechForActivity(act: string, stage: string): string | null {
  const sta = stage.toUpperCase();
  switch (act) {
    case 'sleeping':
      return `${sta}… zzz…`;
    case 'waking_up':
      return `${sta} is awake!`;
    case 'breakfast':
    case 'lunch_break':
      return `${sta} snacked!`;
    case 'working':
    case 'coding':
    case 'afternoon_work':
      return `${sta} is coding…`;
    case 'researching':
      return `${sta} is researching!`;
    case 'browsing':
    case 'evening_relax':
      return `${sta} is chilling.`;
    case 'dreaming':
      return `${sta} dreams…`;
    default:
      return null;
  }
}

export interface DailyLifeOptions {
  tickMs?: number;
}

export function useDailyLife(_node: HTMLElement, options: DailyLifeOptions = {}) {
  const tickMs = options.tickMs ?? 30000; // 30s matches the idle timer

  let timer: ReturnType<typeof setInterval> | null = null;
  let lastNotify = 0;
  let lastActivity: string | null = null;

  function tick() {
    const now = new Date();
    const dayMinutes = now.getHours() * 60 + now.getMinutes();
    const hour = now.getHours();

    // 1. Schedule-driven activity update (from dailyLife.ts hourly schedule)
    try {
      const scheduleEntry = getCurrentActivity(hour);
      const mappedActivity = mapScheduleActivity(scheduleEntry.activity);
      const moodFromActivity = getActivityMood(scheduleEntry.activity) as any;

      // Speech bubble only fires when activity transitions to a NEW value
      const speech = mappedActivity !== lastActivity
        ? speechForActivity(scheduleEntry.activity, getGameState().stage)
        : null;

      dispatchEvent({
        type: 'schedule_tick',
        data: { activity: mappedActivity, mood: moodFromActivity, shouldSpeak: speech ? { text: speech } : undefined },
      });
      lastActivity = mappedActivity;
    } catch (e) {
      console.warn('[dailyLife] schedule_tick failed', e);
    }

    // 2. Real-time needs decay
    dispatchEvent({ type: 'needs_tick', data: { hour } });

    // 3. Activity-based regen (smaller cadence)
    dispatchEvent({ type: 'focus_tick' });

    // 4. Critical-need notification
    const state = getGameState();
    const criticalCount = [state.needs.energy, state.needs.hunger, state.needs.motivation].filter((n: number) => n < 15).length;
    if (criticalCount > 0 && Date.now() - lastNotify > 60000) {
      lastNotify = Date.now();
      sendNotification(
        'AgenMonster',
        criticalCount > 1
          ? 'Your pet really needs attention!'
          : 'Your pet is getting tired/hungry. Care for them!'
      ).catch(() => {});
    }

    // 5. Time-of-day milestones — via console log so it's visible without spam
    void dayMinutes;
  }

  // Tick once immediately on mount so schedule applies before 30s pass
  tick();
  timer = setInterval(tick, tickMs);

  return {
    destroy() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}
