//! Cron tools — schedule tasks.

pub struct CronTools;

impl CronTools {
    pub async fn schedule(name: &str, interval_secs: u64) -> anyhow::Result<()> {
        tracing::info!(name, interval_secs, "cron schedule");
        Ok(())
    }
}
