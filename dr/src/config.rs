use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::time::Duration;

use crate::cli::{Effort, ResearchArgs, StrategyName};
use crate::{DrError, Result};

pub const DEFAULT_PLANNER_MODEL: &str = "z-ai/glm-5.2";
pub const DEFAULT_WORKER_MODEL: &str = "deepseek/deepseek-v4-flash";
pub const DEFAULT_WRITER_MODEL: &str = "z-ai/glm-5.2";
pub const DEFAULT_OPENROUTER_BASE_URL: &str = "https://openrouter.ai/api/v1";
pub const DEFAULT_BRAVE_SEARCH_URL: &str = "https://api.search.brave.com/res/v1/web/search";

#[derive(Debug, Clone)]
pub struct ApiKeys {
    pub openrouter_api_key: String,
    pub brave_api_key: String,
}

impl ApiKeys {
    pub fn load(env_file: Option<&Path>) -> Result<Self> {
        let mut values = process_environment();

        if let Some(path) = env_file {
            values.extend(parse_env_file(path)?);
        }

        Ok(Self {
            openrouter_api_key: required_value(&values, "OPENROUTER_API_KEY")?,
            brave_api_key: required_value(&values, "BRAVE_API_KEY")?,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EffortLimits {
    pub max_subquestions: usize,
    pub max_searches: usize,
    pub results_per_search: u8,
    pub max_sources: usize,
    pub max_iterations: usize,
    pub max_content_chars: usize,
    pub evidence_chunk_size: usize,
    pub max_claims: usize,
    pub min_source_score: u8,
    pub max_plan_tokens: u32,
    pub max_evidence_tokens: u32,
    pub max_report_tokens: u32,
}

impl EffortLimits {
    pub fn for_effort(effort: Effort) -> Self {
        match effort {
            Effort::Light => Self {
                max_subquestions: 4,
                max_searches: 5,
                results_per_search: 5,
                max_sources: 12,
                max_iterations: 1,
                max_content_chars: 5_000,
                evidence_chunk_size: 6,
                max_claims: 12,
                min_source_score: 9,
                max_plan_tokens: 2_000,
                max_evidence_tokens: 5_000,
                max_report_tokens: 6_000,
            },
            Effort::Standard => Self {
                max_subquestions: 6,
                max_searches: 12,
                results_per_search: 7,
                max_sources: 36,
                max_iterations: 2,
                max_content_chars: 8_000,
                evidence_chunk_size: 8,
                max_claims: 24,
                min_source_score: 10,
                max_plan_tokens: 3_000,
                max_evidence_tokens: 10_000,
                max_report_tokens: 11_000,
            },
            Effort::Deep => Self {
                max_subquestions: 9,
                max_searches: 14,
                results_per_search: 10,
                max_sources: 40,
                max_iterations: 3,
                max_content_chars: 12_000,
                evidence_chunk_size: 10,
                max_claims: 32,
                min_source_score: 11,
                max_plan_tokens: 4_000,
                max_evidence_tokens: 12_000,
                max_report_tokens: 14_000,
            },
            Effort::Max => Self {
                max_subquestions: 12,
                max_searches: 20,
                results_per_search: 10,
                max_sources: 64,
                max_iterations: 4,
                max_content_chars: 18_000,
                evidence_chunk_size: 12,
                max_claims: 48,
                min_source_score: 12,
                max_plan_tokens: 5_000,
                max_evidence_tokens: 18_000,
                max_report_tokens: 20_000,
            },
        }
    }

    pub fn with_overrides(mut self, overrides: EffortLimitOverrides) -> Result<Self> {
        if let Some(value) = overrides.max_searches {
            if value == 0 {
                return Err(DrError::InvalidCli(
                    "--max-searches must be greater than zero".to_string(),
                ));
            }
            self.max_searches = value;
        }

        if let Some(value) = overrides.results_per_search {
            if value == 0 {
                return Err(DrError::InvalidCli(
                    "--results-per-search must be greater than zero".to_string(),
                ));
            }
            self.results_per_search = value;
        }

        if let Some(value) = overrides.max_sources {
            if value == 0 {
                return Err(DrError::InvalidCli(
                    "--max-sources must be greater than zero".to_string(),
                ));
            }
            self.max_sources = value;
        }

        if let Some(value) = overrides.max_iterations {
            if value == 0 {
                return Err(DrError::InvalidCli(
                    "--max-iterations must be greater than zero".to_string(),
                ));
            }
            self.max_iterations = value;
        }

        if let Some(value) = overrides.max_content_chars {
            if value == 0 {
                return Err(DrError::InvalidCli(
                    "--max-content-chars must be greater than zero".to_string(),
                ));
            }
            self.max_content_chars = value;
        }

        if let Some(value) = overrides.max_claims {
            if value == 0 {
                return Err(DrError::InvalidCli(
                    "--max-claims must be greater than zero".to_string(),
                ));
            }
            self.max_claims = value;
        }

        if let Some(value) = overrides.min_source_score {
            if value > 20 {
                return Err(DrError::InvalidCli(
                    "--min-source-score must be between 0 and 20".to_string(),
                ));
            }
            self.min_source_score = value;
        }

        Ok(self)
    }
}

#[derive(Debug, Clone, Copy, Default)]
pub struct EffortLimitOverrides {
    pub max_searches: Option<usize>,
    pub results_per_search: Option<u8>,
    pub max_sources: Option<usize>,
    pub max_iterations: Option<usize>,
    pub max_content_chars: Option<usize>,
    pub max_claims: Option<usize>,
    pub min_source_score: Option<u8>,
}

#[derive(Debug, Clone)]
pub struct ModelSelection {
    pub planner_model: String,
    pub worker_model: String,
    pub writer_model: String,
    pub temperature: f64,
}

#[derive(Debug, Clone)]
pub struct ResearchConfig {
    pub topic: String,
    pub output: Option<PathBuf>,
    pub output_dir: PathBuf,
    pub effort: Effort,
    pub strategy: StrategyName,
    pub limits: EffortLimits,
    pub models: ModelSelection,
    pub api_keys: ApiKeys,
    pub openrouter_base_url: String,
    pub brave_search_url: String,
    pub search_concurrency: usize,
    pub search_delay_ms: u64,
    pub timeout: Duration,
}

impl ResearchConfig {
    pub fn from_args(args: ResearchArgs, api_keys: ApiKeys) -> Result<Self> {
        let topic = args.topic.trim().to_string();
        if topic.is_empty() {
            return Err(DrError::InvalidCli("topic must not be empty".to_string()));
        }

        if !(0.0..=2.0).contains(&args.temperature) {
            return Err(DrError::InvalidCli(
                "--temperature must be between 0 and 2".to_string(),
            ));
        }

        let timeout = args.timeout()?;
        let limits =
            EffortLimits::for_effort(args.effort).with_overrides(EffortLimitOverrides {
                max_searches: args.max_searches,
                results_per_search: args.results_per_search,
                max_sources: args.max_sources,
                max_iterations: args.max_iterations,
                max_content_chars: args.max_content_chars,
                max_claims: args.max_claims,
                min_source_score: args.min_source_score,
            })?;

        Ok(Self {
            topic,
            output: args.output,
            output_dir: args.output_dir,
            effort: args.effort,
            strategy: args.strategy,
            limits,
            models: ModelSelection {
                planner_model: args.planner_model,
                worker_model: args.worker_model,
                writer_model: args.writer_model,
                temperature: args.temperature,
            },
            api_keys,
            openrouter_base_url: args.openrouter_base_url,
            brave_search_url: args.brave_search_url,
            search_concurrency: args.search_concurrency,
            search_delay_ms: args.search_delay_ms,
            timeout,
        })
    }
}

fn process_environment() -> BTreeMap<String, String> {
    std::env::vars().collect()
}

fn required_value(values: &BTreeMap<String, String>, name: &'static str) -> Result<String> {
    values
        .get(name)
        .filter(|value| !value.trim().is_empty())
        .cloned()
        .ok_or(DrError::MissingEnvironmentVariable(name))
}

fn parse_env_file(path: &Path) -> Result<BTreeMap<String, String>> {
    let content = std::fs::read_to_string(path).map_err(|source| DrError::EnvFileRead {
        path: path.to_path_buf(),
        source,
    })?;

    parse_env_content(path, &content)
}

fn parse_env_content(path: &Path, content: &str) -> Result<BTreeMap<String, String>> {
    let mut values = BTreeMap::new();

    for (index, raw_line) in content.lines().enumerate() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        let Some((key, value)) = line.split_once('=') else {
            return Err(DrError::InvalidEnvLine {
                path: path.to_path_buf(),
                line: index + 1,
                message: "expected KEY=VALUE".to_string(),
            });
        };

        let key = key.trim();
        if key.is_empty() {
            return Err(DrError::InvalidEnvLine {
                path: path.to_path_buf(),
                line: index + 1,
                message: "key must not be empty".to_string(),
            });
        }

        values.insert(key.to_string(), unquote(value.trim()));
    }

    Ok(values)
}

fn unquote(value: &str) -> String {
    if value.len() >= 2 {
        let bytes = value.as_bytes();
        if (bytes[0] == b'"' && bytes[value.len() - 1] == b'"')
            || (bytes[0] == b'\'' && bytes[value.len() - 1] == b'\'')
        {
            return value[1..value.len() - 1].to_string();
        }
    }

    value.to_string()
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::{EffortLimits, parse_env_content};
    use crate::Effort;

    #[test]
    fn effort_limits_should_increase_breadth_for_deep_effort() {
        let standard = EffortLimits::for_effort(Effort::Standard);
        let deep = EffortLimits::for_effort(Effort::Deep);

        assert!(deep.max_sources > standard.max_sources);
    }

    #[test]
    fn parse_env_content_should_strip_quotes_from_values() {
        let values = parse_env_content(
            Path::new("test.env"),
            "OPENROUTER_API_KEY=\"sk-test\"\nBRAVE_API_KEY='brave-test'\n",
        )
        .unwrap_or_else(|error| panic!("env should parse: {error}"));

        assert_eq!(
            values.get("OPENROUTER_API_KEY"),
            Some(&"sk-test".to_string())
        );
    }
}
