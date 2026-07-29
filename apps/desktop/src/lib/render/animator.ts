export type Mood = 'idle' | 'happy' | 'sleepy' | 'proud' | 'excited' | 'focused' | 'thinking' | 'sad' | 'angry' | 'frustrated' | 'tired';

export interface SpritePose {
  bodyBob: number;
  headBob: number;
  legSpread: number;
  eyeLook: number;
  mouthType: 'normal' | 'open' | 'happy' | 'sad';
  showEye: boolean;
  showMouth: boolean;
}

// Base idle waveform
function breathe(t: number) { return Math.round(Math.sin(t * 0.003) * 1); }
function bob(t: number, speed: number) { return Math.round(Math.sin(t * speed) * 1.5); }
function walkCycle(t: number) { return Math.round(Math.sin(t * 0.012) * 1.8); }

export class SpriteAnimator {
  private mood: Mood = 'idle';
  private elapsed = 0;

  setMood(mood: Mood) {
    if (this.mood !== mood) {
      this.mood = mood;
      this.elapsed = 0;
    }
  }

  update(dt: number, mood: Mood, globalFrame: number, isBlinking: boolean): SpritePose {
    this.elapsed += dt;
    const t = this.elapsed;

    switch (mood) {
      case 'idle': {
        const breath = breathe(t);
        return {
          bodyBob: breath,
          headBob: Math.round(breath * 0.5),
          legSpread: 0,
          eyeLook: Math.floor(Math.sin(t * 0.002) > 0 ? 1 : 0),
          mouthType: 'normal',
          showEye: !isBlinking,
          showMouth: true,
        };
      }
      case 'happy': {
        const bounce = Math.abs(Math.sin(t * 0.015)) * 2;
        return {
          bodyBob: Math.round(-bounce),
          headBob: Math.round(-bounce),
          legSpread: 1,
          eyeLook: 0,
          mouthType: 'happy',
          showEye: true,
          showMouth: true,
        };
      }
      case 'sleepy':
      case 'tired': {
        const droop = 1;
        return {
          bodyBob: Math.round(Math.sin(t * 0.002) * 1),
          headBob: droop,
          legSpread: 0,
          eyeLook: 0,
          mouthType: 'normal',
          showEye: !isBlinking,
          showMouth: true,
        };
      }
      case 'excited': {
        const shake = Math.sin(t * 0.03) > 0 ? 1 : -1;
        return {
          bodyBob: Math.round(-1 + shake * 0.5),
          headBob: Math.round(-1 + shake * 0.5),
          legSpread: shake,
          eyeLook: shake,
          mouthType: 'open',
          showEye: true,
          showMouth: true,
        };
      }
      case 'proud': {
        const puff = breathe(t) * 2;
        return {
          bodyBob: puff,
          headBob: puff,
          legSpread: 0,
          eyeLook: 1,
          mouthType: 'happy',
          showEye: true,
          showMouth: true,
        };
      }
      case 'sad':
      case 'frustrated': {
        const slump = 1;
        return {
          bodyBob: slump,
          headBob: slump,
          legSpread: -1,
          eyeLook: -1,
          mouthType: 'sad',
          showEye: true,
          showMouth: true,
        };
      }
      case 'focused':
      case 'thinking': {
        return {
          bodyBob: breathe(t),
          headBob: Math.round(Math.sin(t * 0.004) * 0.5),
          legSpread: 0,
          eyeLook: 0,
          mouthType: 'normal',
          showEye: !isBlinking,
          showMouth: true,
        };
      }
      case 'angry': {
        const shake = Math.sin(t * 0.02) > 0 ? 1 : -1;
        return {
          bodyBob: shake,
          headBob: shake,
          legSpread: 0,
          eyeLook: -1,
          mouthType: 'normal',
          showEye: !isBlinking,
          showMouth: true,
        };
      }
      default: {
        return {
          bodyBob: breathe(t),
          headBob: 0,
          legSpread: 0,
          eyeLook: 0,
          mouthType: 'normal',
          showEye: !isBlinking,
          showMouth: true,
        };
      }
    }
  }

  getMood(): Mood { return this.mood; }
}
