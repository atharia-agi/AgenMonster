//! Audio input tools — microphone capture.

pub struct AudioInput;

impl AudioInput {
    pub async fn record(duration_secs: u32) -> anyhow::Result<Vec<u8>> {
        tracing::info!(duration_secs, "audio record");
        Ok(vec![])
    }
}
