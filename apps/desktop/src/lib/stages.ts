// Stage transition manager — handles evolution, cutscenes, sound.

export type StageId = 'egg' | 'hatchling' | 'baby' | 'child' | 'teen' | 'adult' | 'mega';

const STAGE_ORDER: StageId[] = ['egg', 'hatchling', 'baby', 'child', 'teen', 'adult', 'mega'];

export interface StageTransition {
  from: StageId;
  to: StageId;
  durationFrames: number;
  flashText: string;
  particleCount: number;
}

export function getTransition(from: StageId, to: StageId): StageTransition {
  const configs: Record<string, Partial<StageTransition>> = {
    'egg→hatchling': { durationFrames: 32, flashText: 'HATCHED!', particleCount: 40 },
    'hatchling→baby': { durationFrames: 40, flashText: 'GROWING!', particleCount: 50 },
    'baby→child': { durationFrames: 40, flashText: 'LEARNING!', particleCount: 50 },
    'child→teen': { durationFrames: 48, flashText: 'POWER UP!', particleCount: 60 },
    'teen→adult': { durationFrames: 56, flashText: 'EVOLVED!', particleCount: 70 },
    'adult→mega': { durationFrames: 64, flashText: 'MEGA EVOLUTION!', particleCount: 80 },
  };
  const key = `${from}→${to}`;
  const cfg = configs[key] || { durationFrames: 32, flashText: 'CHANGED!', particleCount: 30 };
  return { from, to, ...cfg } as StageTransition;
}

export function getNextStage(current: StageId): StageId | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export function getStageIndex(stage: StageId): number {
  return STAGE_ORDER.indexOf(stage);
}
