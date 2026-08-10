// AutonomousWorld — the pet explores the world on its own during autonomous
// mode. No user input: it travels between unlocked areas, rolls wild
// encounters, completes story/event beats, gains XP, and unlocks new regions
// as it levels. This is the "world-aware" layer of the near-AGI creature —
// it does not just think and remember, it acts in its environment.
//
// Pure state transitions through the existing worldEngine + gameState APIs,
// so it never touches rendering and stays cheap (no aura, no canvas churn).

import { getGameState, saveState } from './gameState.ts';
import {
  travelTo, completeEvent, rollEncounter, unlockArea,
  getUnlockedAreas, getCurrentSeason, type AreaId,
} from './worldEngine.ts';
import { logger } from './logger.ts';

const EXPLORE_INTERVAL_MS = 25_000;

export class AutonomousWorld {
  private timer: ReturnType<typeof setInterval> | null = null;
  private active = false;
  private visited = new Set<AreaId>();
  private lastArea: AreaId | null = null;
  events: Array<{ at: number; area: AreaId; kind: string; gainedXp: number }> = [];

  start(): void {
    if (this.active) return;
    this.active = true;
    this.tick();
    this.timer = setInterval(() => this.tick(), EXPLORE_INTERVAL_MS);
    logger.info('AutonomousWorld exploration started');
  }

  stop(): void {
    this.active = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  isActive(): boolean { return this.active; }

  private tick(): void {
    try {
      const gs = getGameState();
      const world = gs.world;
      if (!world) {
        logger.warn('AutonomousWorld tick skipped: no world state');
        return;
      }
      const season = getCurrentSeason();
      const unlocked = getUnlockedAreas(gs.level);
      if (!unlocked.length) {
        logger.warn('AutonomousWorld tick skipped: no unlocked areas for level', { level: gs.level });
        return;
      }

      // Pick an area to travel to — prefer a fresh one, else revisit.
      const fresh = unlocked.filter((a) => !this.visited.has(a));
      const target: AreaId = (fresh.length ? fresh : unlocked)[
        Math.floor(Math.random() * (fresh.length ? fresh.length : unlocked.length))
      ] ?? 'home_forest';

      let nextWorld = travelTo(world, target);
      this.visited.add(target);
      this.lastArea = target;

      // Roll + complete a wild encounter / event in this area.
      const enc = rollEncounter(nextWorld);
      let gainedXp = 0;
      if (enc) {
        nextWorld = completeEvent(nextWorld, enc.refId);
        gainedXp = enc.type === 'quest' ? 25 : enc.type === 'wild' ? 12 : 8;
      }

      // Occasionally unlock the next area as the pet grows.
      if (gs.level >= 3 && unlocked.length < 6 && Math.random() < 0.3) {
        const locked = (['home_forest','token_river','bug_dungeon','cloud_server','neon_circuit','void_sea'] as AreaId[])
          .find((a) => !unlocked.includes(a));
        if (locked) nextWorld = unlockArea(nextWorld, locked);
      }

      const updated = {
        ...gs,
        world: nextWorld,
        xp: gs.xp + gainedXp,
        lastActivityTs: Date.now(),
      };
      saveState(updated);
      window.dispatchEvent(new Event('gamestate-change'));

      this.events.push({ at: Date.now(), area: target, kind: enc?.type ?? 'travel', gainedXp });
      logger.info('AutonomousWorld tick', { area: target, season, kind: enc?.type, gainedXp, totalVisited: this.visited.size });
    } catch (e) {
      logger.warn('AutonomousWorld tick failed', { error: String(e) });
    }
  }
}

export const autonomousWorld = new AutonomousWorld();
