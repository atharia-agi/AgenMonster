// Stage palette definitions — mirrors the CSS :root variables.
// Each palette: [bg, primary, secondary, accent, border, highlight]

export interface SpriteStage {
  id: string;
  name: string;
  palette: string[];
}

export const STAGES: SpriteStage[] = [
  {
    id: 'egg',
    name: 'Egg',
    palette: ['#0d0d1a', '#f5f0e6', '#dcd2c3', '#c8bfa8', '#988878', '#e8e0d0'],
  },
  {
    id: 'hatchling',
    name: 'Hatchling',
    palette: ['#0d1a0d', '#90c878', '#70a858', '#508838', '#307018', '#b0e898'],
  },
  {
    id: 'baby',
    name: 'Baby',
    palette: ['#0d1a2e', '#88ccf0', '#60a8d8', '#4888c0', '#185890', '#a0e0ff'],
  },
  {
    id: 'child',
    name: 'Child',
    palette: ['#1a0d2e', '#d8c8f0', '#b8a8d8', '#9888c0', '#685890', '#e8d8ff'],
  },
  {
    id: 'teen',
    name: 'Teen',
    palette: ['#2e0d1a', '#ff8090', '#e06070', '#c04050', '#901020', '#ffa0b0'],
  },
  {
    id: 'adult',
    name: 'Adult',
    palette: ['#0d0d2e', '#8070c0', '#6050a0', '#403080', '#100050', '#a090e0'],
  },
  {
    id: 'mega',
    name: 'Mega',
    palette: ['#1a1a0d', '#ffc860', '#ffb840', '#ffa820', '#ff7800', '#ffe090'],
  },
];
