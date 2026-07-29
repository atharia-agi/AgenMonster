// Sprite metadata for all 7 stages.
// Loaded by spriteLoader.ts at runtime.

export interface SpriteStage {
  id: string;
  name: string;
  eyeStyle: 'closed' | 'wide' | 'round' | 'focused' | 'confident' | 'wise' | 'transcendent';
  tailLength: number;
  wingState: 'none' | 'nubs' | 'small' | 'growing' | 'full' | 'majestic' | 'cosmic';
  weapon: string | null;
  accentDots: number;
  scrollBg: string;
  bodyScale: number;
  hasCrown: boolean;
  palette: string[];
}

export const STAGES: SpriteStage[] = [
  {
    id: 'egg', name: 'Egg',
    eyeStyle: 'closed', tailLength: 0, wingState: 'none', weapon: null,
    accentDots: 2, scrollBg: 'cream-speck', bodyScale: 0.8, hasCrown: false,
    palette: ['#f5f0e6','#dcd2c3','#f0e8d8','#c8bfa8','#b8a898','#a89888','#988878'],
  },
  {
    id: 'hatchling', name: 'Hatchling',
    eyeStyle: 'wide', tailLength: 3, wingState: 'nubs', weapon: null,
    accentDots: 3, scrollBg: 'grass', bodyScale: 1.0, hasCrown: false,
    palette: ['#90c878','#70a858','#b0d898','#508838','#609848','#408028','#307018'],
  },
  {
    id: 'baby', name: 'Baby',
    eyeStyle: 'round', tailLength: 5, wingState: 'small', weapon: null,
    accentDots: 4, scrollBg: 'waves', bodyScale: 1.0, hasCrown: false,
    palette: ['#88ccf0','#60a8d8','#a0d8f8','#4888c0','#3878b0','#2868a0','#185890'],
  },
  {
    id: 'child', name: 'Child',
    eyeStyle: 'focused', tailLength: 6, wingState: 'growing', weapon: 'wand',
    accentDots: 5, scrollBg: 'mist', bodyScale: 1.1, hasCrown: false,
    palette: ['#d8c8f0','#b8a8d8','#e8d8f8','#9888c0','#8878b0','#7868a0','#685890'],
  },
  {
    id: 'teen', name: 'Teen',
    eyeStyle: 'confident', tailLength: 7, wingState: 'full', weapon: 'sword',
    accentDots: 6, scrollBg: 'hearts', bodyScale: 1.2, hasCrown: false,
    palette: ['#ff8090','#e06070','#ffa0b0','#c04050','#b03040','#a02030','#901020'],
  },
  {
    id: 'adult', name: 'Adult',
    eyeStyle: 'wise', tailLength: 8, wingState: 'majestic', weapon: 'staff',
    accentDots: 8, scrollBg: 'sun-rays', bodyScale: 1.3, hasCrown: false,
    palette: ['#8070c0','#6050a0','#a090e0','#403080','#302070','#201060','#100050'],
  },
  {
    id: 'mega', name: 'Mega',
    eyeStyle: 'transcendent', tailLength: 10, wingState: 'cosmic', weapon: 'scepter',
    accentDots: 10, scrollBg: 'aurora', bodyScale: 1.5, hasCrown: true,
    palette: ['#ffc860','#ffb840','#ffd880','#ffa820','#ff9810','#ff8800','#ff7800'],
  },
];

export function getStage(id: string): SpriteStage {
  return STAGES.find(s => s.id === id) || STAGES[0];
}
