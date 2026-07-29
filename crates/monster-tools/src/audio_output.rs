//! Audio output tools — speaker playback.

pub struct AudioOutput;

impl AudioOutput {
    pub async fn play(data: &[u8]) -> anyhow::Result<()> {
        tracing::info!(len = data.len(), "audio play");
        Ok(())
    }
}
