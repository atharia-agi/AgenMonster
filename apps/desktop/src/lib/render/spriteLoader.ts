// Sprite loader — loads stage data from JSON and provides
// palette lookup for the renderer.

import { STAGES, type SpriteStage } from './stages';

const PALETTE_CACHE: Map<string, string[]> = new Map();

export function loadPalette(stage: string): string[] {
  if (PALETTE_CACHE.has(stage)) return PALETTE_CACHE.get(stage)!;
  const s = STAGES.find(st => st.id === stage);
  const palette = s?.palette || STAGES[0].palette;
  PALETTE_CACHE.set(stage, palette);
  return palette;
}

export function getBodyColor(stage: string): string {
  return loadPalette(stage)[1];
}

export function getBellyColor(stage: string): string {
  return loadPalette(stage)[2];
}

export function getAccentColor(stage: string): string {
  return loadPalette(stage)[4];
}

export function getAllStages(): SpriteStage[] {
  return [...STAGES];
}

export function getNextStage(current: string): string | null {
  const idx = STAGES.findIndex(s => s.id === current);
  if (idx < 0 || idx >= STAGES.length - 1) return null;
  return STAGES[idx + 1].id;
}
