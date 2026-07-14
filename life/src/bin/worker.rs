use anyhow::Context as _;
use life_agent::AppState;
use life_agent::config::Config;
use life_agent::connectors::IngestionWorker;
use life_agent::models::IngestionJob;
use reqwest::Client;
use tokio::time::{Duration, MissedTickBehavior};
use tracing::{error, info, warn};
use tracing_subscriber::EnvFilter;
use uuid::Uuid;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let filter = EnvFilter::try_from_default_env().context("parse RUST_LOG")?;
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(filter)
        .try_init()
        .map_err(|error| anyhow::anyhow!("initialize tracing: {error}"))?;
    let config = Config::from_env().context("load runtime configuration")?;
    let state = AppState::initialize(config).await?;
    let stale_jobs = state.repository.fail_stale_jobs().await?;
    if stale_jobs > 0 {
        warn!(stale_jobs, "marked expired worker leases as failed");
    }
    let http = Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .timeout(Duration::from_secs(90))
        .user_agent(concat!("life-worker/", env!("CARGO_PKG_VERSION")))
        .build()?;
    let worker = IngestionWorker::new(
        http,
        state.connectors.clone(),
        state.repository.clone(),
        state.openai.clone(),
    );
    let worker_id = Uuid::new_v4().to_string();
    if std::env::args().any(|argument| argument == "--drain") {
        info!(worker_id, "life worker draining queued jobs");
        while let Some(job) = state.repository.claim_next_job(&worker_id).await? {
            execute_job(&state, &worker, &job).await?;
        }
        info!(worker_id, "life worker queue is empty");
        return Ok(());
    }
    let mut interval = tokio::time::interval(Duration::from_secs(2));
    interval.set_missed_tick_behavior(MissedTickBehavior::Delay);
    info!(worker_id, "life worker started");

    loop {
        tokio::select! {
            _ = interval.tick() => {
                let Some(job) = state.repository.claim_next_job(&worker_id).await? else {
                    continue;
                };
                execute_job(&state, &worker, &job).await?;
            }
            signal = tokio::signal::ctrl_c() => {
                signal.context("listen for shutdown signal")?;
                info!("life worker shutting down");
                return Ok(());
            }
        }
    }
}

async fn execute_job(
    state: &AppState,
    worker: &IngestionWorker,
    job: &IngestionJob,
) -> anyhow::Result<()> {
    info!(job_id = %job.id, job_kind = job.job_kind, "claimed ingestion job");
    match worker.execute(job).await {
        Ok(changed) => {
            info!(job_id = %job.id, changed, "completed ingestion job");
        }
        Err(job_error) => {
            error!(job_id = %job.id, error = %job_error, "ingestion job failed");
            state
                .repository
                .fail_job(job, &job_error.to_string())
                .await?;
        }
    }
    Ok(())
}
