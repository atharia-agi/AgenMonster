// TypeScript SoundPlayer — manages all sound effects.

import { playSfx, playNote, resumeAudio } from './render/sfx';

export class SoundPlayer {
  private enabled: boolean = true;
  private volume: number = 0.8;

  constructor() {}

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  play(name: string) {
    if (!this.enabled) return;
    resumeAudio();
    playSfx(name);
  }

  playNote(freq: number, duration: number) {
    if (!this.enabled) return;
    resumeAudio();
    playNote(freq, duration, this.volume);
  }
}

// Singleton
export const soundPlayer = new SoundPlayer();
