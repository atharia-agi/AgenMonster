// Svelte SfxPlayer — Web Audio API chiptune sound effects.
// Authentic 8-bit: square, triangle, sawtooth waves + noise.
// NES-style duty cycles, arpeggios, vibrato.

const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

/** Play a single note with specified waveform and duty cycle. */
export function playNote(
  freq: number,
  duration: number,
  volume = 0.3,
  wave: OscillatorType = 'square',
  duty: number = 0.5
) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = wave;
  osc.frequency.value = freq;
  // Duty cycle for square wave (NES-style pulse width modulation)
  if (wave === 'square' && osc.setPeriodicWave) {
    const real = new Float32Array([0, 0, 0, 0]);
    const imag = new Float32Array([0, 1, 0, 0]);
    // Approximate duty cycle via harmonics
    for (let i = 1; i < 16; i++) {
      const real2 = new Float32Array(16);
      const imag2 = new Float32Array(16);
      imag2[0] = 0;
      for (let h = 1; h < 16; h++) {
        imag2[h] = (2 / (h * Math.PI)) * Math.sin(h * Math.PI * duty);
      }
      const wave2 = audioCtx.createPeriodicWave(real2, imag2);
      osc.setPeriodicWave(wave2);
      break;
    }
  }
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + duration);
}

/** Quick arpeggio — plays notes in rapid succession (NES chord trick). */
function arpeggio(freqs: number[], noteLen: number, volume: number, wave: OscillatorType = 'square') {
  freqs.forEach((f, i) => {
    setTimeout(() => playNote(f, noteLen, volume, wave), i * noteLen * 1000);
  });
}

/** Vibrato effect — frequency modulation for expressive notes. */
function vibrato(freq: number, duration: number, volume: number, depth = 5, rate = 8) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  
  osc.type = 'square';
  osc.frequency.value = freq;
  lfo.type = 'sine';
  lfo.frequency.value = rate;
  lfoGain.gain.value = depth;
  
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime);
  lfo.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + duration);
  lfo.stop(audioCtx.currentTime + duration);
}

/** White noise burst — for percussion/hit effects. */
function noiseBurst(duration: number, volume: number) {
  if (!audioCtx) return;
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
  }
  const source = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  source.connect(gain);
  gain.connect(audioCtx.destination);
  source.start(audioCtx.currentTime);
}

export function playSfx(name: string) {
  const v = 0.25; // master volume
  switch (name) {
    case 'hatch': {
      // Rising arpeggio — egg cracking open
      const notes = [262, 330, 392, 523];
      arpeggio(notes, 0.08, v, 'square');
      setTimeout(() => noiseBurst(0.15, v * 0.4), 320);
      break;
    }
    case 'evolve': {
      // Epic ascending arpeggio with triangle wave + vibrato
      const notes = [262, 330, 392, 523, 659, 784, 1047];
      notes.forEach((f, i) => {
        setTimeout(() => playNote(f, 0.12, v, 'square'), i * 100);
      });
      setTimeout(() => vibrato(1047, 0.4, v * 0.8, 8, 6), 700);
      break;
    }
    case 'click': {
      // Short blip
      playNote(880, 0.04, v * 0.6, 'square');
      break;
    }
    case 'chat': {
      // Typewriter blips — two-note pattern
      playNote(523, 0.06, v, 'square');
      setTimeout(() => playNote(659, 0.06, v), 70);
      break;
    }
    case 'error': {
      // Buzzer — low sawtooth
      playNote(110, 0.25, v, 'sawtooth');
      noiseBurst(0.08, v * 0.3);
      break;
    }
    case 'levelup': {
      // Classic RPG fanfare — square + triangle
      const fanfare = [
        { f: 523, t: 0, d: 0.1, w: 'square' as OscillatorType },
        { f: 659, t: 100, d: 0.1, w: 'square' as OscillatorType },
        { f: 784, t: 200, d: 0.1, w: 'square' as OscillatorType },
        { f: 1047, t: 300, d: 0.3, w: 'square' as OscillatorType },
      ];
      fanfare.forEach(n => {
        setTimeout(() => playNote(n.f, n.d, v, n.w), n.t);
      });
      // Bass triangle underneath
      playNote(131, 0.5, v * 0.3, 'triangle');
      break;
    }
    case 'sleep': {
      // Soft lullaby — triangle wave
      playNote(330, 0.3, v * 0.4, 'triangle');
      setTimeout(() => playNote(262, 0.4, v * 0.3, 'triangle'), 350);
      break;
    }
    case 'hungry': {
      // Sad descending — square wave
      playNote(392, 0.15, v, 'square');
      setTimeout(() => playNote(330, 0.15, v), 150);
      setTimeout(() => playNote(262, 0.25, v), 300);
      break;
    }
    case 'search': {
      // Digital scanning — rapid arpeggio
      const scan = [440, 554, 659, 880, 659, 554];
      scan.forEach((f, i) => {
        setTimeout(() => playNote(f, 0.04, v * 0.5, 'square'), i * 50);
      });
      break;
    }
    case 'think': {
      // Thoughtful — triangle with vibrato
      vibrato(440, 0.4, v * 0.5, 3, 4);
      break;
    }
    case 'evolve_start': {
      // Pre-evolution tension — rising noise + square
      for (let i = 0; i < 8; i++) {
        setTimeout(() => playNote(200 + i * 50, 0.08, v * 0.4, 'sawtooth'), i * 60);
      }
      noiseBurst(0.5, v * 0.2);
      break;
    }
    default:
      playNote(440, 0.08, v * 0.5, 'square');
  }
}

export function resumeAudio() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}
