use std::env;

use anyhow::Context as _;
use life_agent::config::Config;
use life_agent::shutdown::shutdown_signal;
use life_agent::{AppState, api};
use tokio::net::TcpListener;
use tracing::info;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    init_tracing()?;
    let config = Config::from_env().context("load runtime configuration")?;
    let address = format!("0.0.0.0:{}", config.port());
    let state = AppState::initialize(config).await?;

    if env::args().any(|argument| argument == "--migrate-only") {
        info!("database migrations completed");
        return Ok(());
    }

    let listener = TcpListener::bind(&address)
        .await
        .with_context(|| format!("bind HTTP listener to {address}"))?;
    let shutdown = shutdown_signal().context("install shutdown signal handlers")?;
    info!(address, "life API listening");
    axum::serve(listener, api::router(state)?)
        .with_graceful_shutdown(shutdown)
        .await
        .context("serve HTTP API")?;
    Ok(())
}

fn init_tracing() -> anyhow::Result<()> {
    let filter = EnvFilter::try_from_default_env().context("parse RUST_LOG")?;
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(filter)
        .try_init()
        .map_err(|error| anyhow::anyhow!("initialize tracing: {error}"))
}
