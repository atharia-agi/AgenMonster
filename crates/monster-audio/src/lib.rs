//! Chiptune synthesizer — pure-Rust.
//!
//! Generates short 16-bit / 11025 Hz mono PCM .wav assets for the pet's
//! persona. Implements square-wave (NES-flavoured) and triangle
//! oscillators + ADSR envelope. Outputs are suitable for shipping
//! directly to `apps/desktop/static/ogg/` or any path.

use hound::{SampleFormat, WavSpec, WavWriter};
use serde::{Deserialize, Serialize};
use std::path::Path;

pub const SAMPLE_RATE: u32 = 11025;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Wave {
    Square,
    Triangle,
    Saw,
    Noise,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Envelope {
    pub attack_ms: u32,
    pub decay_ms: u32,
    pub sustain: f32, // 0..1
    pub release_ms: u32,
}

impl Default for Envelope {
    fn default() -> Self {
        Self {
            attack_ms: 5,
            decay_ms: 60,
            sustain: 0.65,
            release_ms: 60,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Voice {
    pub wave: Wave,
    pub freq_hz: f32,
    pub duration_ms: u32,
    pub envelope: Envelope,
    pub volume: f32,
}

impl Voice {
    /// Render this voice into interleaved [i16] PCM samples.
    pub fn render(&self) -> Vec<i16> {
        let total_ms = self.duration_ms;
        let total_samples = ((SAMPLE_RATE as u32 * total_ms) / 1000) as usize;
        let mut out = Vec::with_capacity(total_samples);
        let release_start = total_samples
            .saturating_sub((SAMPLE_RATE as u32 * self.envelope.release_ms / 1000) as usize);
        let attack = (SAMPLE_RATE as u32 * self.envelope.attack_ms.max(1) / 1000) as f32;
        let decay = (SAMPLE_RATE as u32 * self.envelope.decay_ms.max(1) / 1000) as f32;

        let mut phase: u32 = 0;
        let phase_inc = (self.freq_hz / SAMPLE_RATE as f32 * u32::MAX as f32) as u32;
        let mut seed: u32 = 0x1234_5678;

        for i in 0..total_samples {
            // Compute envelope at time i
            let env = if (i as f32) < attack {
                i as f32 / attack
            } else if (i as f32) < attack + decay {
                // 1 → sustain
                let t = (i as f32 - attack) / decay;
                1.0 + (self.envelope.sustain - 1.0) * t
            } else if i < release_start {
                self.envelope.sustain
            } else {
                let span = total_samples - release_start;
                let t = (i - release_start) as f32 / span as f32;
                self.envelope.sustain * (1.0 - t)
            };
            let amp = env * self.volume;

            // Compute sample
            let s: f32 = match self.wave {
                Wave::Square => {
                    // phase / u32::MAX gives a 0..1 saw
                    let v = (phase as f32 / u32::MAX as f32) * 2.0 - 1.0;
                    if v >= 0.0 {
                        1.0
                    } else {
                        -1.0
                    }
                }
                Wave::Triangle => {
                    let v = (phase as f32 / u32::MAX as f32) * 2.0 - 1.0;
                    if v >= 0.0 {
                        1.0 - v
                    } else {
                        1.0 + v
                    }
                }
                Wave::Saw => (phase as f32 / u32::MAX as f32) * 2.0 - 1.0,
                Wave::Noise => {
                    // LFSR
                    let b = seed & 1;
                    seed >>= 1;
                    if b == 1 {
                        seed ^= 0x8000_0059;
                    }
                    if seed & 1 == 1 {
                        1.0
                    } else {
                        -1.0
                    }
                }
            };
            let sample = (s * amp * 0.85 * i16::MAX as f32) as i16;
            out.push(sample);
            phase = phase.wrapping_add(phase_inc);
        }
        out
    }
}

pub fn write_wav(path: &Path, samples: &[i16]) -> anyhow::Result<()> {
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).ok();
    }
    let spec = WavSpec {
        channels: 1,
        sample_rate: SAMPLE_RATE,
        bits_per_sample: 16,
        sample_format: SampleFormat::Int,
    };
    let mut w = WavWriter::create(path, spec)?;
    for s in samples {
        w.write_sample(*s)?;
    }
    w.finalize().ok();
    Ok(())
}

/// Bundle multiple voices sequentially.
pub fn mixed(voices: &[Voice]) -> Vec<i16> {
    let mut out = vec![];
    let mut cur = vec![];
    for v in voices {
        cur = v.render();
        out.extend(cur);
    }
    let max = out
        .iter()
        .map(|v| v.unsigned_abs() as i32)
        .max()
        .unwrap_or(1)
        .max(1);
    if max > i16::MAX as i32 {
        // already saturated
        let factor = i16::MAX as f32 / max as f32;
        out.iter().map(|v| (*v as f32 * factor) as i16).collect()
    } else {
        out
    }
}

pub fn presets() -> Vec<(&'static str, Vec<Voice>)> {
    use Wave::*;
    let env_short = Envelope {
        attack_ms: 1,
        decay_ms: 20,
        sustain: 0.4,
        release_ms: 30,
    };
    let env_mid = Envelope {
        attack_ms: 2,
        decay_ms: 40,
        sustain: 0.5,
        release_ms: 60,
    };
    vec![
        (
            "click",
            vec![Voice {
                wave: Square,
                freq_hz: 880.0,
                duration_ms: 60,
                envelope: env_short.clone(),
                volume: 0.5,
            }],
        ),
        (
            "bark",
            vec![
                Voice {
                    wave: Square,
                    freq_hz: 660.0,
                    duration_ms: 50,
                    envelope: env_short.clone(),
                    volume: 0.55,
                },
                Voice {
                    wave: Square,
                    freq_hz: 990.0,
                    duration_ms: 60,
                    envelope: Envelope {
                        release_ms: 80,
                        ..env_short.clone()
                    },
                    volume: 0.5,
                },
            ],
        ),
        (
            "happy",
            vec![
                Voice {
                    wave: Triangle,
                    freq_hz: 523.25,
                    duration_ms: 70,
                    envelope: env_mid.clone(),
                    volume: 0.5,
                },
                Voice {
                    wave: Triangle,
                    freq_hz: 659.25,
                    duration_ms: 70,
                    envelope: env_mid.clone(),
                    volume: 0.55,
                },
                Voice {
                    wave: Triangle,
                    freq_hz: 783.99,
                    duration_ms: 70,
                    envelope: env_mid.clone(),
                    volume: 0.6,
                },
                Voice {
                    wave: Triangle,
                    freq_hz: 1046.50,
                    duration_ms: 140,
                    envelope: Envelope {
                        release_ms: 120,
                        ..env_mid.clone()
                    },
                    volume: 0.55,
                },
            ],
        ),
        (
            "evolve",
            vec![
                Voice {
                    wave: Square,
                    freq_hz: 440.0,
                    duration_ms: 60,
                    envelope: env_mid.clone(),
                    volume: 0.45,
                },
                Voice {
                    wave: Square,
                    freq_hz: 554.36,
                    duration_ms: 80,
                    envelope: env_mid.clone(),
                    volume: 0.50,
                },
                Voice {
                    wave: Square,
                    freq_hz: 659.25,
                    duration_ms: 80,
                    envelope: env_mid.clone(),
                    volume: 0.55,
                },
                Voice {
                    wave: Square,
                    freq_hz: 880.0,
                    duration_ms: 100,
                    envelope: env_mid.clone(),
                    volume: 0.55,
                },
                Voice {
                    wave: Square,
                    freq_hz: 1108.73,
                    duration_ms: 100,
                    envelope: env_mid.clone(),
                    volume: 0.55,
                },
                Voice {
                    wave: Square,
                    freq_hz: 1318.51,
                    duration_ms: 120,
                    envelope: Envelope {
                        release_ms: 200,
                        ..env_mid.clone()
                    },
                    volume: 0.55,
                },
                Voice {
                    wave: Square,
                    freq_hz: 1760.0,
                    duration_ms: 160,
                    envelope: Envelope {
                        release_ms: 280,
                        ..env_mid.clone()
                    },
                    volume: 0.55,
                },
                Voice {
                    wave: Square,
                    freq_hz: 2637.02,
                    duration_ms: 220,
                    envelope: Envelope {
                        release_ms: 360,
                        ..env_mid.clone()
                    },
                    volume: 0.6,
                },
            ],
        ),
        (
            "error",
            vec![
                Voice {
                    wave: Square,
                    freq_hz: 220.0,
                    duration_ms: 80,
                    envelope: env_short.clone(),
                    volume: 0.5,
                },
                Voice {
                    wave: Square,
                    freq_hz: 165.0,
                    duration_ms: 80,
                    envelope: env_short.clone(),
                    volume: 0.5,
                },
                Voice {
                    wave: Square,
                    freq_hz: 110.0,
                    duration_ms: 200,
                    envelope: Envelope {
                        release_ms: 180,
                        ..env_short.clone()
                    },
                    volume: 0.5,
                },
            ],
        ),
        (
            "busy",
            vec![Voice {
                wave: Noise,
                freq_hz: 6000.0,
                duration_ms: 70,
                envelope: Envelope {
                    attack_ms: 1,
                    decay_ms: 20,
                    sustain: 0.4,
                    release_ms: 30,
                },
                volume: 0.35,
            }],
        ),
    ]
}

pub fn export_all() -> anyhow::Result<()> {
    std::fs::create_dir_all("apps/desktop/static/ogg")?;
    for (name, voices) in presets() {
        let samples = mixed(&voices);
        let mut path = std::path::PathBuf::from("apps/desktop/static/ogg");
        path.push(format!("{name}.wav"));
        write_wav(&path, &samples)?;
        eprintln!("wrote {:?}", path);
    }
    Ok(())
}

pub fn preview(name: &str) -> Option<Vec<i16>> {
    for (n, voices) in presets() {
        if n == name {
            return Some(mixed(&voices));
        }
    }
    None
}
