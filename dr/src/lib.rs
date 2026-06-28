mod cli;
pub mod clients;
mod config;
mod error;
mod report;
pub mod strategy;
pub mod types;

use clap::Parser;
use cli::{Cli, Command};
use clients::brave::BraveSearchClient;
use clients::fetch::HttpDocumentClient;
use clients::openrouter::OpenRouterClient;
use config::{ApiKeys, ResearchConfig};
use strategy::{ResearchRequest, ResearchStrategy, SourceMeshStrategy};

pub use cli::{Effort, ResearchArgs, StrategyName};
pub use config::{EffortLimits, ModelSelection};
pub use error::{DrError, Result};

pub async fn run_cli() -> Result<()> {
    run_command(Cli::parse()).await
}

async fn run_command(cli: Cli) -> Result<()> {
    match cli.command {
        Command::Research(args) => run_research(*args).await,
        Command::Strategies => {
            println!(
                "deep-agent-v1\tDefault. Perspective plan, parallel Brave fan-out, page reading, source admission, evidence compression, gap loop, citation verification, refinement, rubric evaluation."
            );
            println!(
                "recursive-gap-v1\tRecursive variant. Plan, Brave fan-out, read pages, extract evidence, analyze gaps, search follow-ups, synthesize, verify claims."
            );
            println!(
                "source-mesh-v1\tOne-pass variant: plan, Brave fan-out, read pages, extract evidence, synthesize, verify claims."
            );
            Ok(())
        }
        Command::Models => {
            println!("planner\t{}", config::DEFAULT_PLANNER_MODEL);
            println!("worker\t{}", config::DEFAULT_WORKER_MODEL);
            println!("writer\t{}", config::DEFAULT_WRITER_MODEL);
            Ok(())
        }
    }
}

async fn run_research(args: ResearchArgs) -> Result<()> {
    let api_keys = ApiKeys::load(args.env_file.as_deref())?;
    let config = ResearchConfig::from_args(args, api_keys)?;

    eprintln!(
        "dr: strategy={} effort={} timeout={}s",
        config.strategy,
        config.effort,
        config.timeout.as_secs()
    );
    eprintln!(
        "dr: models planner={} worker={} writer={}",
        config.models.planner_model, config.models.worker_model, config.models.writer_model
    );

    let llm = OpenRouterClient::new(
        config.openrouter_base_url.clone(),
        config.api_keys.openrouter_api_key.clone(),
        config.timeout,
    )?;
    let search = BraveSearchClient::new(
        config.brave_search_url.clone(),
        config.api_keys.brave_api_key.clone(),
        config.timeout,
    )?;
    let document = HttpDocumentClient::new(config.timeout)?;

    let strategy = SourceMeshStrategy;
    let request = ResearchRequest::from_config(config);
    let outcome = strategy.run(&request, &llm, &search, &document).await?;

    println!("{}", outcome.path.display());
    Ok(())
}
