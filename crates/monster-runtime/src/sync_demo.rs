//! Cross-device sync demo — two in-process peer nodes exercising the
//! monster-sync protocol over TCP.
//!
//! TODO: Implement real p2p sync.

pub async fn run_demo(_port_a: u16, _port_b: u16) -> anyhow::Result<()> {
    tracing::info!("Sync demo started (stub mode)");
    Ok(())
}
