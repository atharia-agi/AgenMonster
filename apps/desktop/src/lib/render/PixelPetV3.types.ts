/**
 * PixelPetV3 Types - Bandai Namco AAA Quality Pet Rendering
 * 
 * Types for the PixelPetV3 component - Bandai-quality pet rendering
 */

import type { VisualEngineState, QualityTier } from './VisualEngine';

// ============================================================
// SPRITE & POSE TYPES
// ============================================================

export interface SpriteLayer {
  name: string;
  paths: Path2D[];
  zIndex: number;
  visible: boolean;
  opacity: number;
  blendMode: GlobalCompositeOperation;
}

export interface Pose {
  name: string;
  transforms: Map<string, Transform>;
  morphTargets: Map<string, number>;
  timing: { duration: number; easing: string };
}

export interface Transform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
}

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
  restLength: number;
}

export interface ClothSimulationConfig {
  particleCount: number;
  stiffness: number;
  damping: number;
  gravity: number;
  windInfluence: number;
}

export interface RigidBodyConfig {
  mass: number;
  inertia: number;
  friction: number;
  restitution: number;
}

export interface BlinkConfig {
  minInterval: number;
  maxInterval: number;
  duration: number;
  asymmetry: number; // 0-1, how different left/right can be
}

export interface GazeConfig {
  smoothing: number;
  maxOffset: number;
  curiosityFactor: number;
  focusRadius: number;
}

export interface BreathingConfig {
  baseRate: number; // breaths per minute
  depth: number; // 0-1
  moodMultipliers: Record<string, number>;
}

export interface SpritePose {
  bodyBob: number;
  headBob: number;
  legSpread: number;
  mouthType: 'normal' | 'happy' | 'open' | 'sad';
  showEye: boolean;
  showMouth: boolean;
  eyeLook: number;
  idleFidget: {
    headTilt: number;
    wingFlap: number;
    bodySway: number;
  };
  walkShift: number;
  squashX: number;
  squashY: number;
}

// ============================================================
// PHYSICS TYPES
// ============================================================

export interface SpringParticle {
  x: number; y: number;
  vx: number; vy: number;
  fx: number; fy: number;
  targetX: number; targetY: number;
  mass: number;
  restLength: number;
}

export interface ClothParticle {
  x: number; y: number;
  px: number; py: number; // previous position (Verlet)
  vx: number; vy: number;
  pinned: boolean;
  mass: number;
}

export interface ClothConstraint {
  a: number;
  b: number;
  restLength: number;
}

// ============================================================
// PARTICLE TYPES
// ============================================================

export type ParticleKind = 'sparkle' | 'dust' | 'heart' | 'zzz' | 'petal' | 'puff';

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
  kind: ParticleKind;
  trail?: { x: number; y: number }[];
}

// ============================================================
// STAGE & MOOD TYPES
// ============================================================

export type StageName = 'egg' | 'hatchling' | 'baby' | 'child' | 'teen' | 'adult' | 'mega';

export type MoodName = 'idle' | 'happy' | 'excited' | 'proud' | 'sad' | 'angry' | 'frustrated'
 | 'sleepy' | 'tired' | 'focused' | 'thinking' | 'content' | 'scared';

export type FacingDirection = 'left' | 'right';

// ============================================================
// COMPONENT PROPS
// ============================================================

export interface PixelPetV3Props {
  width?: number;
  height?: number;
  mood?: MoodName;
  stage?: StageName;
  facing?: FacingDirection;
  externalSpeech?: string;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  onCanvas?: (el: HTMLCanvasElement) => { destroy: () => void };
}

// ============================================================
// STAGE COLOR CONFIG
// ============================================================

export interface StageColorConfig {
  body: string[];
  outline: string[];
  eye: string[];
  accent: string;
  glow: string;
  shadow: string;
}

export interface MoodTintConfig {
  hue: number;
  sat: number;
  light: number;
}

// ============================================================
// VISUAL ENGINE STATE (re-export)
// ============================================================

export type { VisualEngineState, WeatherState, CameraState, RenderLayer, VisualEngineConfig, QualityTier } from './VisualEngine';

// ============================================================
// CANVAS RENDER TYPES
// ============================================================

export interface CanvasDrawContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  frame: number;
  dt: number;
  state: {
    stage: StageName;
    mood: MoodName;
    facing: FacingDirection;
    quality: QualityTier;
  };
}