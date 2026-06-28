use std::path::PathBuf;

use async_trait::async_trait;

use crate::clients::brave::SearchClient;
use crate::clients::fetch::DocumentClient;
use crate::clients::openrouter::LlmClient;
use crate::config::{EffortLimits, ModelSelection, ResearchConfig};
use crate::{Effort, Result, StrategyName};

mod source_mesh;

pub use source_mesh::SourceMeshStrategy;

#[derive(Debug, Clone)]
pub struct ResearchRequest {
    pub topic: String,
    pub output: Option<PathBuf>,
    pub output_dir: PathBuf,
    pub effort: Effort,
    pub strategy: StrategyName,
    pub limits: EffortLimits,
    pub models: ModelSelection,
    pub search_concurrency: usize,
    pub search_delay_ms: u64,
}

impl ResearchRequest {
    pub fn from_config(config: ResearchConfig) -> Self {
        Self {
            topic: config.topic,
            output: config.output,
            output_dir: config.output_dir,
            effort: config.effort,
            strategy: config.strategy,
            limits: config.limits,
            models: config.models,
            search_concurrency: config.search_concurrency,
            search_delay_ms: config.search_delay_ms,
        }
    }
}

#[derive(Debug, Clone)]
pub struct ResearchOutcome {
    pub path: PathBuf,
}

#[async_trait]
pub trait ResearchStrategy {
    fn name(&self) -> StrategyName;

    async fn run(
        &self,
        request: &ResearchRequest,
        llm: &dyn LlmClient,
        search: &dyn SearchClient,
        document: &dyn DocumentClient,
    ) -> Result<ResearchOutcome>;
}
