export type Mood = 'idle' | 'happy' | 'sleepy' | 'proud' | 'excited' | 'focused' | 'thinking' | 'sad' | 'angry' | 'frustrated' | 'tired';

export interface SpritePose {
  bodyBob: number;
  headBob: number;
  legSpread: number;
  eyeLook: number;
  mouthType: 'normal' | 'open' | 'happy' | 'sad';
  showEye: boolean;
  showMouth: boolean;
  squashX: number;
  squashY: number;
  idleFidget: { headTilt: number; wingFlap: number; bodySway: number };
  walkShift?: number;
  cyclePhase?: number;
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
        const sPhase = (Math.sin(t * 0.003) + 1) / 2;
        const headTilt = Math.sin(t * 0.0011) * 1;
        const wingFlap = Math.sin(t * 0.0015) * 0.5;
        const bodySway = Math.sin(t * 0.0008) * 0.3;
        return {
          bodyBob: breath,
          headBob: Math.round(breath * 0.5),
          legSpread: 0,
          eyeLook: Math.floor(Math.sin(t * 0.002) > 0 ? 1 : 0),
          mouthType: 'normal',
          showEye: !isBlinking,
          showMouth: true,
          squashX: 1 - sPhase * 0.08,
          squashY: 1 + sPhase * 0.08,
          idleFidget: { headTilt, wingFlap, bodySway },
        };
      }
      case 'happy': {
        const bounce = Math.abs(Math.sin(t * 0.015)) * 2;
        const apex = Math.cos(t * 0.015);
        const squash = apex > 0 ? 1 + apex * 0.15 : 1 - apex * 0.1;
        const headTilt = Math.sin(t * 0.004) * 1.5;
        const wingFlap = Math.sin(t * 0.012) * 1.2;
        const bodySway = Math.sin(t * 0.003) * 0.6;
        const walkShift = Math.sin(t * 0.015) * 0.8;
        return {
          bodyBob: Math.round(-bounce),
          headBob: Math.round(-bounce),
          legSpread: 1,
          eyeLook: 0,
          mouthType: 'happy',
          showEye: true,
          showMouth: true,
          squashX: 1 / squash,
          squashY: squash,
          idleFidget: { headTilt, wingFlap, bodySway },
          walkShift,
          cyclePhase: (t * 0.015) % (Math.PI * 2),
        };
      }
      case 'sleepy':
      case 'tired': {
        const droop = 1;
        const headTilt = Math.sin(t * 0.0008) * 0.8;
        const wingFlap = 0;
        const bodySway = 0;
        return {
          bodyBob: Math.round(Math.sin(t * 0.002) * 1),
          headBob: droop,
          legSpread: 0,
          eyeLook: 0,
          mouthType: 'normal',
          showEye: !isBlinking,
          showMouth: true,
          squashX: 1.05,
          squashY: 0.95,
          idleFidget: { headTilt, wingFlap, bodySway },
        };
      }
      case 'excited': {
        const shake = Math.sin(t * 0.03);
        const sq = 1 + Math.abs(shake) * 0.12;
        const headTilt = shake * 1;
        const wingFlap = Math.sin(t * 0.025) * 2.5;
        const bodySway = shake * 0.8;
        const walkShift = Math.sin(t * 0.03) * 1.2;
        return {
          bodyBob: Math.round(-1 + shake * 0.5),
          headBob: Math.round(-1 + shake * 0.5),
          legSpread: shake,
          eyeLook: shake,
          mouthType: 'open',
          showEye: true,
          showMouth: true,
          squashX: 1 / sq,
          squashY: sq,
          idleFidget: { headTilt, wingFlap, bodySway },
          walkShift,
          cyclePhase: (t * 0.03) % (Math.PI * 2),
        };
      }
      case 'proud': {
        const puff = breathe(t) * 2;
        const sq = 1 + Math.abs(puff) * 0.05;
        const headTilt = -1;
        const wingFlap = Math.sin(t * 0.008) * 1.5;
        const bodySway = 0;
        return {
          bodyBob: puff,
          headBob: puff,
          legSpread: 0,
          eyeLook: 1,
          mouthType: 'happy',
          showEye: true,
          showMouth: true,
          squashX: 1 / sq,
          squashY: sq,
          idleFidget: { headTilt, wingFlap, bodySway },
        };
      }
      case 'sad':
      case 'frustrated': {
        const slump = 1;
        const headTilt = -1;
        const wingFlap = -0.5;
        const bodySway = Math.sin(t * 0.002) * 0.4;
        return {
          bodyBob: slump,
          headBob: slump,
          legSpread: -1,
          eyeLook: -1,
          mouthType: 'sad',
          showEye: true,
          showMouth: true,
          squashX: 1.08,
          squashY: 0.92,
          idleFidget: { headTilt, wingFlap, bodySway },
        };
      }
      case 'focused':
      case 'thinking': {
        const headTilt = Math.sin(t * 0.0006) * 0.5;
        const wingFlap = Math.sin(t * 0.003) * 0.3;
        const bodySway = 0;
        return {
          bodyBob: breathe(t),
          headBob: Math.round(Math.sin(t * 0.004) * 0.5),
          legSpread: 0,
          eyeLook: 0,
          mouthType: 'normal',
          showEye: !isBlinking,
          showMouth: true,
          squashX: 1,
          squashY: 1,
          idleFidget: { headTilt, wingFlap, bodySway },
        };
      }
      case 'angry': {
        const shake = Math.sin(t * 0.02);
        const sq = 1 + Math.abs(shake) * 0.1;
        const headTilt = 0;
        const wingFlap = Math.sin(t * 0.018) * 1.8;
        const bodySway = shake * 0.5;
        return {
          bodyBob: shake,
          headBob: shake,
          legSpread: 0,
          eyeLook: -1,
          mouthType: 'normal',
          showEye: !isBlinking,
          showMouth: true,
          squashX: 1.1,
          squashY: 0.9,
          idleFidget: { headTilt, wingFlap, bodySway },
        };
      }
      default: {
        const headTilt = 0;
        const wingFlap = 0;
        const bodySway = 0;
        return {
          bodyBob: breathe(t),
          headBob: 0,
          legSpread: 0,
          eyeLook: 0,
          mouthType: 'normal',
          showEye: !isBlinking,
          showMouth: true,
          squashX: 1,
          squashY: 1,
          idleFidget: { headTilt, wingFlap, bodySway },
        };
      }
    }
  }

  getMood(): Mood { return this.mood; }
}
