// AutonomousSelfCare — the pet takes care of itself. When its needs hit
// critical/warning levels it autonomously applies healing actions (feed,
// play, clean, sleep) by driving the real gameState — no user input, no
// rendering cost. This is the "self-sustaining" layer: a creature that
// survives and thrives on its own, because a near-AGI companion cannot
// wait for a human to feed it.
//
// Uses the existing selfHealing engine (detectNeeds → generateHealingPlan →
// applyHealing) against the live gameState.

import { getGameState, saveState } from './gameState.ts';
import { detectNeeds, generateHealingPlan, applyHealing, getHealingSummary, createInitialSelfHealingState, type SelfHealingState } from './selfHealing.ts';
import { logger } from './logger.ts';

const SELF_CARE_INTERVAL_MS = 15_000;

export class AutonomousSelfCare {
  private timer: ReturnType<typeof setInterval> | null = null;
  private active = false;
  private state: SelfHealingState = createInitialSelfHealingState();
  log: Array<{ at: number; action: string; need: string }> = [];

  start(): void {
    if (this.active) return;
    this.active = true;
    this.tick();
    this.timer = setInterval(() => this.tick(), SELF_CARE_INTERVAL_MS);
    logger.info('AutonomousSelfCare started');
  }

  stop(): void {
    this.active = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  isActive(): boolean { return this.active; }
  summary(): string { return getHealingSummary(this.state); }

  private tick(): void {
    try {
      const gs = getGameState();
      const needs = gs.needs;
      const { critical, warning } = detectNeeds(needs);
      if (critical.length === 0 && warning.length === 0) return;

      const plan = generateHealingPlan(needs, this.state);
      if (!plan.length) return;

      let next = { ...gs.needs };
      for (const action of plan) {
        const res = applyHealing(next, action.action, this.state);
        next = res.needs;
        this.state = res.healingState;
        this.log.push({ at: Date.now(), action: action.action, need: action.needsTarget ? Object.keys(action.needsTarget)[0] : 'general' });
        logger.info('AutonomousSelfCare applied', { action: action.action, need: action.needsTarget ? Object.keys(action.needsTarget)[0] : 'general' });
      }
      saveState({ ...gs, needs: next });
      window.dispatchEvent(new Event('gamestate-change'));
    } catch (e) {
      logger.warn('AutonomousSelfCare tick failed', { error: String(e) });
    }
  }
}

export const autonomousSelfCare = new AutonomousSelfCare();
