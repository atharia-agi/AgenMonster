// Master sprite — the 24x24 pixel art identity of the monster.
// All stages share this silhouette; only palette changes.

import { loadPalette } from './spriteLoader';

export interface StageConfig {
  bodyColor: string;
  bellyColor: string;
  eyeColor: string;
  accentColor: string;
  wingColor: string;
}

// 24x24 sprite grid — 0 = empty, 1-7 = palette indices
// This is the canonical monster shape used by all stages.
const BODY_GRID: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,1,2,2,2,2,2,2,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,3,3,2,2,2,2,3,3,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,4,4,2,2,2,2,4,4,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,1,1,2,5,5,2,1,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,1,2,2,2,2,1,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,1,2,2,2,2,1,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,2,2,2,6,6,6,6,2,2,2,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,2,2,6,6,6,6,6,6,2,2,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,2,2,6,6,6,6,6,6,2,2,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,2,2,2,6,6,6,6,2,2,2,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// Pixel mappings for each palette index
// 0=transparent, 1=outline, 2=body, 3=eye white, 4=eye pupil, 5=mouth, 6=belly

export function renderMasterSprite(
  ctx: CanvasRenderingContext2D,
  stage: string,
  offsetX: number,
  offsetY: number,
  scale: number = 1,
) {
  const palette = loadPalette(stage);
  const outlineColor = palette[0];
  const bodyColor = palette[1];
  const bellyColor = palette[2];
  const eyeWhite = '#ffffff';
  const eyePupil = '#1a1a2e';
  const mouthColor = '#1a1a2e';

  const colorMap: Record<number, string> = {
    0: 'transparent',
    1: outlineColor,
    2: bodyColor,
    3: eyeWhite,
    4: eyePupil,
    5: mouthColor,
    6: bellyColor,
  };

  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const idx = BODY_GRID[y][x];
      if (idx === 0) continue;
      ctx.fillStyle = colorMap[idx] || 'transparent';
      ctx.fillRect(offsetX + x * scale, offsetY + y * scale, scale, scale);
    }
  }
}

export function getSpritePixel(x: number, y: number): number {
  if (y < 0 || y >= 24 || x < 0 || x >= 24) return 0;
  return BODY_GRID[y][x];
}
