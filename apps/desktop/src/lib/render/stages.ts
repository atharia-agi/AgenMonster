// Stage palette definitions — GBA colorful pixel theme.
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
    palette: ['#f8f4e8', '#c8a0d8', '#a080c0', '#8060a0', '#604080', '#e0d0f0'],
  },
  {
    id: 'hatchling',
    name: 'Hatchling',
    palette: ['#f8f4e8', '#50b8a0', '#38a080', '#208860', '#106040', '#80e8d0'],
  },
  {
    id: 'baby',
    name: 'Baby',
    palette: ['#f8f4e8', '#60a8e8', '#4090d0', '#2878b8', '#106098', '#a0d0ff'],
  },
  {
    id: 'child',
    name: 'Child',
    palette: ['#f8f4e8', '#a080e0', '#8068c8', '#6850b0', '#483880', '#c8a8ff'],
  },
  {
    id: 'teen',
    name: 'Teen',
    palette: ['#f8f4e8', '#e8607c', '#c84860', '#a83048', '#881830', '#ffa0b0'],
  },
  {
    id: 'adult',
    name: 'Adult',
    palette: ['#f8f4e8', '#8060c0', '#6848a0', '#503088', '#302070', '#b8a0e8'],
  },
  {
    id: 'mega',
    name: 'Mega',
    palette: ['#f8f4e8', '#f0b040', '#d89830', '#c08020', '#a06810', '#ffe080'],
  },
];
