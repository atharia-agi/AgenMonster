// Exploration Engine — side-scrolling movement, area transitions, world interaction.
// Handles player movement, collision, monster AI paths, and exploration tracking.

import type { WorldState } from './worldEngine.ts';

export type Direction = 'left' | 'right' | 'idle';

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  direction: Direction;
  isMoving: boolean;
  isRunning: boolean;
  currentArea: string;
  inTransition: boolean;
}

export interface MonsterEntity {
  id: string;
  name: string;
  sprite: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  behavior: 'passive' | 'neutral' | 'aggressive';
  level: number;
  form: string;
  patrolPath: { x: number; y: number }[];
  patrolIndex: number;
  speed: number;
}

export interface InteractionResult {
  type: 'talk' | 'battle' | 'befriend' | 'item' | 'nothing';
  targetId?: string;
  reward?: { xp: number; item?: string };
  message: string;
}

export function createInitialPlayerState(area: string): PlayerState {
  return {
    x: 100,
    y: 0,
    vx: 0,
    vy: 0,
    direction: 'idle',
    isMoving: false,
    isRunning: false,
    currentArea: area,
    inTransition: false,
  };
}

export function createMonsterEntity(def: {
  id: string;
  name: string;
  sprite: string;
  form: string;
  level: number;
  behavior: 'passive' | 'neutral' | 'aggressive';
  startX: number;
  startY: number;
  patrolRange: number;
  speed: number;
}): MonsterEntity {
  return {
    id: def.id,
    name: def.name,
    sprite: def.sprite,
    x: def.startX,
    y: def.startY,
    vx: def.speed,
    vy: 0,
    behavior: def.behavior,
    level: def.level,
    form: def.form,
    patrolPath: [
      { x: def.startX - def.patrolRange, y: def.startY },
      { x: def.startX + def.patrolRange, y: def.startY },
    ],
    patrolIndex: 0,
    speed: def.speed,
  };
}

export function updatePlayer(state: PlayerState, input: { left: boolean; right: boolean; run: boolean }, dt: number, bounds: { width: number; height: number }): PlayerState {
  const speed = input.run ? 180 : 120;
  let vx = 0;
  let direction: Direction = state.direction;
  let isMoving = false;

  if (input.left) {
    vx = -speed;
    direction = 'left';
    isMoving = true;
  } else if (input.right) {
    vx = speed;
    direction = 'right';
    isMoving = true;
  }

  let x = state.x + vx * dt;
  let y = state.y;

  // Clamp to bounds
  x = Math.max(0, Math.min(bounds.width, x));

  return {
    ...state,
    x,
    y,
    vx,
    direction,
    isMoving,
    isRunning: input.run,
  };
}

export function updateMonsterAI(entity: MonsterEntity, dt: number, playerX: number, bounds: { width: number }): MonsterEntity {
  const { x, patrolPath, patrolIndex, speed, behavior } = entity;
  const target = patrolPath[patrolIndex];
  const dx = target.x - x;
  const dist = Math.abs(dx);

  let vx = 0;
  let newIndex = patrolIndex;

  if (behavior === 'aggressive' && Math.abs(playerX - x) < 150) {
    // Chase player
    vx = playerX > x ? speed : -speed;
  } else if (dist > 5) {
    // Patrol
    vx = dx > 0 ? speed : -speed;
  } else {
    // Switch patrol target
    newIndex = (patrolIndex + 1) % patrolPath.length;
  }

  let newX = x + vx * dt;
  newX = Math.max(0, Math.min(bounds.width, newX));

  return {
    ...entity,
    x: newX,
    vx,
    patrolIndex: newIndex,
  };
}

export function checkInteraction(player: PlayerState, entities: MonsterEntity[]): InteractionResult {
  for (const entity of entities) {
    const dist = Math.abs(player.x - entity.x);
    if (dist < 40) {
      if (entity.behavior === 'passive') {
        return { type: 'befriend', targetId: entity.id, message: `${entity.name} looks friendly.` };
      } else if (entity.behavior === 'neutral') {
        return { type: 'talk', targetId: entity.id, message: `${entity.name} is cautious but curious.` };
      } else {
        return { type: 'battle', targetId: entity.id, reward: { xp: entity.level * 10 }, message: `${entity.name} attacks!` };
      }
    }
  }
  return { type: 'nothing', message: '' };
}

export function transitionArea(state: PlayerState, targetArea: string, direction: 'left' | 'right'): PlayerState {
  return {
    ...state,
    currentArea: targetArea,
    inTransition: true,
    x: direction === 'right' ? 50 : 200,
    direction,
    isMoving: false,
    vx: 0,
  };
}

export function completeTransition(state: PlayerState): PlayerState {
  return {
    ...state,
    inTransition: false,
  };
}

export function checkAreaTransition(player: PlayerState, bounds: { width: number; transitions: { x: number; targetArea: string; direction: 'left' | 'right' }[] }): PlayerState | null {
  for (const t of bounds.transitions) {
    if (player.direction === 'right' && player.x >= bounds.width && t.direction === 'right') {
      return transitionArea(player, t.targetArea, 'right');
    }
    if (player.direction === 'left' && player.x <= 0 && t.direction === 'left') {
      return transitionArea(player, t.targetArea, 'left');
    }
  }
  return null;
}
