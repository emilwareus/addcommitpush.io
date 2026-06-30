use std::path::PathBuf;
use std::str::FromStr;
use std::time::Duration;

use clap::{Args, Parser, Subcommand, ValueEnum};

use crate::DrError;

#[derive(Debug, Parser)]
#[command(name = "dr")]
#[command(about = "Deep research CLI for coding agents.")]
#[command(version)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Command,
}

#[derive(Debug, Subcommand)]
pub enum Command {
    /// Research a topic and write a cited Markdown report.
    Research(Box<ResearchArgs>),
    /// List available research strategies.
    Strategies,
    /// Print default OpenRouter model choices.
    Models,
}

#[derive(Debug, Args, Clone)]
pub struct ResearchArgs {
    /// Topic or question to research.
    pub topic: String,

    /// Explicit .env file containing OPENROUTER_API_KEY and BRAVE_API_KEY.
    #[arg(long)]
    pub env_file: Option<PathBuf>,

    /// Write the report to this exact Markdown path.
    #[arg(short, long)]
    pub output: Option<PathBuf>,

    /// Directory for generated reports when --output is not provided.
    #[arg(long, default_value = "research-reports")]
    pub output_dir: PathBuf,

    /// Research effort controls search breadth, reading depth, and validation.
    #[arg(long, value_enum, default_value_t = Effort::Standard)]
    pub effort: Effort,

    /// Research strategy to use.
    #[arg(long, value_enum, default_value_t = StrategyName::DeepAgentV1)]
    pub strategy: StrategyName,

    /// Model used to create the research plan.
    #[arg(long, default_value = crate::config::DEFAULT_PLANNER_MODEL)]
    pub planner_model: String,

    /// Model used to extract source-grounded evidence.
    #[arg(long, default_value = crate::config::DEFAULT_WORKER_MODEL)]
    pub worker_model: String,

    /// Model used to write the final report.
    #[arg(long, default_value = crate::config::DEFAULT_WRITER_MODEL)]
    pub writer_model: String,

    /// OpenRouter sampling temperature.
    #[arg(long, default_value_t = 0.2)]
    pub temperature: f64,

    /// Override the effort-derived search query limit.
    #[arg(long)]
    pub max_searches: Option<usize>,

    /// Override the effort-derived result count per Brave search.
    #[arg(long)]
    pub results_per_search: Option<u8>,

    /// Override the effort-derived unique source cap.
    #[arg(long)]
    pub max_sources: Option<usize>,

    /// Override the effort-derived recursive evidence pass limit.
    #[arg(long)]
    pub max_iterations: Option<usize>,

    /// Override the effort-derived readable text cap per source.
    #[arg(long)]
    pub max_content_chars: Option<usize>,

    /// Override the effort-derived material claim audit cap.
    #[arg(long)]
    pub max_claims: Option<usize>,

    /// Override the effort-derived minimum admitted-source quality score.
    #[arg(long)]
    pub min_source_score: Option<u8>,

    /// Maximum concurrent Brave search requests. Keep at 1 for Brave free-plan rate limits.
    #[arg(long, default_value_t = 1)]
    pub search_concurrency: usize,

    /// Delay between Brave search requests in milliseconds when concurrency is 1.
    #[arg(long, default_value_t = 1100)]
    pub search_delay_ms: u64,

    /// OpenRouter API base URL.
    #[arg(long, default_value = crate::config::DEFAULT_OPENROUTER_BASE_URL)]
    pub openrouter_base_url: String,

    /// Brave web-search endpoint URL.
    #[arg(long, default_value = crate::config::DEFAULT_BRAVE_SEARCH_URL)]
    pub brave_search_url: String,

    /// Per-request timeout in seconds.
    #[arg(long, default_value_t = 300)]
    pub timeout_seconds: u64,
}

impl ResearchArgs {
    pub fn timeout(&self) -> Result<Duration, DrError> {
        if self.timeout_seconds == 0 {
            return Err(DrError::InvalidCli(
                "--timeout-seconds must be greater than zero".to_string(),
            ));
        }

        if self.search_concurrency == 0 {
            return Err(DrError::InvalidCli(
                "--search-concurrency must be greater than zero".to_string(),
            ));
        }

        Ok(Duration::from_secs(self.timeout_seconds))
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, ValueEnum)]
pub enum Effort {
    Light,
    Standard,
    Deep,
    Max,
}

impl std::fmt::Display for Effort {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(match self {
            Self::Light => "light",
            Self::Standard => "standard",
            Self::Deep => "deep",
            Self::Max => "max",
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, ValueEnum)]
pub enum StrategyName {
    DeepAgentV1,
    RecursiveGapV1,
    SourceMeshV1,
}

impl std::fmt::Display for StrategyName {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(match self {
            Self::DeepAgentV1 => "deep-agent-v1",
            Self::RecursiveGapV1 => "recursive-gap-v1",
            Self::SourceMeshV1 => "source-mesh-v1",
        })
    }
}

impl FromStr for StrategyName {
    type Err = DrError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value {
            "deep-agent-v1" => Ok(Self::DeepAgentV1),
            "recursive-gap-v1" => Ok(Self::RecursiveGapV1),
            "source-mesh-v1" => Ok(Self::SourceMeshV1),
            _ => Err(DrError::InvalidCli(format!("unknown strategy `{value}`"))),
        }
    }
}
