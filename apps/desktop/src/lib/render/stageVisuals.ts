// Per-stage visual config — defines how the pet looks at each stage.

export interface StageVisual {
  id: string;
  bodyScale: number;
  hasWings: boolean;
  hasCrown: boolean;
  wingStyle: 'none' | 'nubs' | 'small' | 'growing' | 'full' | 'majestic' | 'cosmic';
  weaponStyle: 'none' | 'wand' | 'sword' | 'staff' | 'scepter';
  accentDots: number;
  bgPattern: 'dots' | 'waves' | 'stars' | 'aurora' | 'grass' | 'mist' | 'hearts' | 'sun-rays';
}

export const STAGE_VISUALS: Record<string, StageVisual> = {
  egg: {
    id: 'egg', bodyScale: 0.8, hasWings: false, hasCrown: false,
    wingStyle: 'none', weaponStyle: 'none', accentDots: 2,
    bgPattern: 'dots',
  },
  hatchling: {
    id: 'hatchling', bodyScale: 1.0, hasWings: false, hasCrown: false,
    wingStyle: 'nubs', weaponStyle: 'none', accentDots: 3,
    bgPattern: 'grass',
  },
  baby: {
    id: 'baby', bodyScale: 1.0, hasWings: true, hasCrown: false,
    wingStyle: 'small', weaponStyle: 'none', accentDots: 4,
    bgPattern: 'waves',
  },
  child: {
    id: 'child', bodyScale: 1.1, hasWings: true, hasCrown: false,
    wingStyle: 'growing', weaponStyle: 'wand', accentDots: 5,
    bgPattern: 'mist',
  },
  teen: {
    id: 'teen', bodyScale: 1.2, hasWings: true, hasCrown: false,
    wingStyle: 'full', weaponStyle: 'sword', accentDots: 6,
    bgPattern: 'hearts',
  },
  adult: {
    id: 'adult', bodyScale: 1.3, hasWings: true, hasCrown: false,
    wingStyle: 'majestic', weaponStyle: 'staff', accentDots: 8,
    bgPattern: 'sun-rays',
  },
  mega: {
    id: 'mega', bodyScale: 1.5, hasWings: true, hasCrown: true,
    wingStyle: 'cosmic', weaponStyle: 'scepter', accentDots: 10,
    bgPattern: 'aurora',
  },
};

export function getVisual(stage: string): StageVisual {
  return STAGE_VISUALS[stage] || STAGE_VISUALS.egg;
}
