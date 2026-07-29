//! Audio loop — long-running task that captures microphone input,
//! detects speech, and dispatches voice tasks via the event bus.
//!
//! TODO: Implement real audio capture and TTS playback.

pub struct AudioLoop;

impl AudioLoop {
    pub fn new() -> Self {
        Self
    }

    pub async fn run(self) -> anyhow::Result<()> {
        tracing::info!("Audio loop started (stub mode)");
        // Keep the loop alive
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(60)).await;
        }
    }
}
