//! Chiptune synthesizer — square/triangle/sawtooth/noise waves.

pub struct ChiptuneSynth {
    pub sample_rate: u32,
    pub volume: f32,
}

impl ChiptuneSynth {
    pub fn new(sample_rate: u32) -> Self {
        Self { sample_rate, volume: 0.3 }
    }

    pub fn square_wave(&self, freq: f32, t: f32) -> f32 {
        let phase = (t * freq * 2.0 * std::f32::consts::PI) % (2.0 * std::f32::consts::PI);
        if phase < std::f32::consts::PI { self.volume } else { -self.volume }
    }

    pub fn triangle_wave(&self, freq: f32, t: f32) -> f32 {
        let period = 1.0 / freq;
        let phase = t % period;
        let slope = 4.0 * self.volume / period;
        if phase < period / 2.0 {
            slope * phase - self.volume
        } else {
            self.volume - slope * (phase - period / 2.0)
        }
    }

    pub fn sawtooth_wave(&self, freq: f32, t: f32) -> f32 {
        let period = 1.0 / freq;
        let phase = t % period;
        (2.0 * phase / period - 1.0) * self.volume
    }

    pub fn noise(&self) -> f32 {
        use rand::Rng;
        rand::thread_rng().gen_range(-self.volume..self.volume)
    }

    pub fn generate_note(&self, freq: f32, duration: f32, wave: WaveType) -> Vec<f32> {
        let num_samples = (self.sample_rate as f32 * duration) as usize;
        let mut samples = Vec::with_capacity(num_samples);
        for i in 0..num_samples {
            let t = i as f32 / self.sample_rate as f32;
            let sample = match wave {
                WaveType::Square => self.square_wave(freq, t),
                WaveType::Triangle => self.triangle_wave(freq, t),
                WaveType::Sawtooth => self.sawtooth_wave(freq, t),
                WaveType::Noise => self.noise(),
            };
            samples.push(sample);
        }
        samples
    }

    pub fn generate_sfx(&self, preset: SfxPreset) -> Vec<f32> {
        match preset {
            SfxPreset::Hatch => {
                let mut s = Vec::new();
                s.extend(self.generate_note(262.0, 0.1, WaveType::Square));
                s.extend(self.generate_note(330.0, 0.1, WaveType::Square));
                s.extend(self.generate_note(392.0, 0.2, WaveType::Square));
                s
            }
            SfxPreset::Evolve => {
                let mut s = Vec::new();
                s.extend(self.generate_note(392.0, 0.15, WaveType::Square));
                s.extend(self.generate_note(494.0, 0.15, WaveType::Square));
                s.extend(self.generate_note(587.0, 0.15, WaveType::Square));
                s.extend(self.generate_note(784.0, 0.3, WaveType::Square));
                s
            }
            SfxPreset::Click => self.generate_note(880.0, 0.05, WaveType::Square),
            SfxPreset::Chat => {
                let mut s = Vec::new();
                s.extend(self.generate_note(523.0, 0.08, WaveType::Triangle));
                s.extend(self.generate_note(659.0, 0.08, WaveType::Triangle));
                s
            }
            SfxPreset::Error => self.generate_note(220.0, 0.2, WaveType::Square),
            SfxPreset::LevelUp => {
                let mut s = Vec::new();
                s.extend(self.generate_note(523.0, 0.1, WaveType::Square));
                s.extend(self.generate_note(659.0, 0.1, WaveType::Square));
                s.extend(self.generate_note(784.0, 0.1, WaveType::Square));
                s.extend(self.generate_note(1047.0, 0.3, WaveType::Square));
                s
            }
        }
    }
}

pub enum WaveType { Square, Triangle, Sawtooth, Noise }

pub enum SfxPreset { Hatch, Evolve, Click, Chat, Error, LevelUp }

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chiptune_basics() {
        let synth = ChiptuneSynth::new(44100);
        let samples = synth.generate_note(440.0, 0.5, WaveType::Square);
        assert_eq!(samples.len(), 22050);
    }

    #[test]
    fn test_sfx_presets() {
        let synth = ChiptuneSynth::new(44100);
        for preset in [SfxPreset::Hatch, SfxPreset::Evolve, SfxPreset::Click,
                       SfxPreset::Chat, SfxPreset::Error, SfxPreset::LevelUp] {
            let s = synth.generate_sfx(preset);
            assert!(!s.is_empty());
        }
    }

    #[test]
    fn test_waveforms() {
        let synth = ChiptuneSynth::new(44100);
        assert!((-0.3..=0.3).contains(&synth.square_wave(440.0, 0.0)));
        assert!((-0.3..=0.3).contains(&synth.triangle_wave(440.0, 0.0)));
        assert!((-0.3..=0.3).contains(&synth.sawtooth_wave(440.0, 0.0)));
        assert!((-0.3..=0.3).contains(&synth.noise()));
    }
}
