// Sound player — plays chiptune SFX via Web Audio API.

export class SoundPlayer {
  private ctx: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();

  async init() {
    this.ctx = new AudioContext();
  }

  async load(name: string, url: string) {
    if (!this.ctx) return;
    try {
      const resp = await fetch(url);
      const data = await resp.arrayBuffer();
      const buffer = await this.ctx.decodeAudioData(data);
      this.buffers.set(name, buffer);
    } catch (e) {
      console.warn(`Failed to load sound ${name}:`, e);
    }
  }

  play(name: string, volume = 0.5) {
    if (!this.ctx) return;
    const buffer = this.buffers.get(name);
    if (!buffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
  }

  async loadAll() {
    const sounds = ['click', 'bark', 'happy', 'evolve', 'error', 'busy'];
    for (const name of sounds) {
      await this.load(name, `/ogg/${name}.wav`);
    }
  }
}

export const soundPlayer = new SoundPlayer();
