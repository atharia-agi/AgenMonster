use marketplace_registry::{router, Registry};
use std::sync::Arc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter("info")
        .init();

    let db_path = std::env::var("REGISTRY_DB")
        .unwrap_or_else(|_| "registry.db".into());
    let reg = Arc::new(Registry::open(&db_path)?);
    let app = router(reg);

    let addr = std::env::var("REGISTRY_ADDR")
        .unwrap_or_else(|_| "0.0.0.0:7777".into());
    tracing::info!("listening on {addr}");
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
