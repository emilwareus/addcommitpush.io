use std::future::Future;

use anyhow::Context as _;
use tokio::signal::unix::{SignalKind, signal};

/// Waits for the process termination signals used by local terminals and Cloud Run.
///
/// # Errors
/// Returns an error when the operating-system signal handlers cannot be installed.
pub fn shutdown_signal() -> anyhow::Result<impl Future<Output = ()>> {
    let mut interrupt = signal(SignalKind::interrupt()).context("install SIGINT handler")?;
    let mut terminate = signal(SignalKind::terminate()).context("install SIGTERM handler")?;
    Ok(async move {
        tokio::select! {
            _ = interrupt.recv() => {}
            _ = terminate.recv() => {}
        }
    })
}
