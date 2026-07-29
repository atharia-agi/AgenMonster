//! WAV encoder — writes samples to WAV format.

pub struct WavEncoder {
    pub sample_rate: u32,
    pub channels: u16,
    pub bits_per_sample: u16,
}

impl WavEncoder {
    pub fn new(sample_rate: u32) -> Self {
        Self { sample_rate, channels: 1, bits_per_sample: 16 }
    }

    pub fn encode(&self, samples: &[f32]) -> Vec<u8> {
        let num_samples = samples.len();
        let data_size = (num_samples * 2) as u32; // 16-bit = 2 bytes per sample
        let file_size = 36 + data_size;

        let mut wav = Vec::with_capacity(file_size as usize + 8);

        // RIFF header
        wav.extend_from_slice(b"RIFF");
        wav.extend_from_slice(&file_size.to_le_bytes());
        wav.extend_from_slice(b"WAVE");

        // fmt chunk
        wav.extend_from_slice(b"fmt ");
        wav.extend_from_slice(&16u32.to_le_bytes()); // chunk size
        wav.extend_from_slice(&1u16.to_le_bytes()); // PCM
        wav.extend_from_slice(&self.channels.to_le_bytes());
        wav.extend_from_slice(&self.sample_rate.to_le_bytes());
        let byte_rate = self.sample_rate * self.channels as u32 * self.bits_per_sample as u32 / 8;
        wav.extend_from_slice(&byte_rate.to_le_bytes());
        let block_align = self.channels * self.bits_per_sample / 8;
        wav.extend_from_slice(&block_align.to_le_bytes());
        wav.extend_from_slice(&self.bits_per_sample.to_le_bytes());

        // data chunk
        wav.extend_from_slice(b"data");
        wav.extend_from_slice(&data_size.to_le_bytes());

        for &sample in samples {
            let clamped = sample.clamp(-1.0, 1.0);
            let val = (clamped * 32767.0) as i16;
            wav.extend_from_slice(&val.to_le_bytes());
        }

        wav
    }

    pub fn save(&self, samples: &[f32], path: &str) -> std::io::Result<()> {
        let wav = self.encode(samples);
        std::fs::write(path, wav)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wav_encode() {
        let encoder = WavEncoder::new(44100);
        let samples: Vec<f32> = (0..44100).map(|i| (i as f32 * 440.0 * 2.0 * std::f32::consts::PI / 44100.0).sin()).collect();
        let wav = encoder.encode(&samples);
        assert!(wav.starts_with(b"RIFF"));
        assert!(wav.len() > 44);
    }
}
