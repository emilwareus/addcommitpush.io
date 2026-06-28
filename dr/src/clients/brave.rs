use std::time::Duration;

use async_trait::async_trait;
use reqwest::Url;
use serde::Deserialize;

use crate::clients::{response_body_text, summarize_response_body};
use crate::error::{DrError, Result};
use crate::types::SearchHit;

#[async_trait]
pub trait SearchClient: Send + Sync {
    async fn search(&self, query: &str, count: u8) -> Result<Vec<SearchHit>>;
}

#[derive(Debug, Clone)]
pub struct BraveSearchClient {
    endpoint: Url,
    api_key: String,
    client: reqwest::Client,
}

impl BraveSearchClient {
    pub fn new(endpoint: String, api_key: String, timeout: Duration) -> Result<Self> {
        let endpoint = Url::parse(&endpoint)
            .map_err(|error| DrError::InvalidCli(format!("invalid Brave URL: {error}")))?;
        let client = reqwest::Client::builder()
            .timeout(timeout)
            .http1_only()
            .build()?;

        Ok(Self {
            endpoint,
            api_key,
            client,
        })
    }
}

#[async_trait]
impl SearchClient for BraveSearchClient {
    async fn search(&self, query: &str, count: u8) -> Result<Vec<SearchHit>> {
        let mut url = self.endpoint.clone();
        url.query_pairs_mut()
            .append_pair("q", query)
            .append_pair("count", &count.to_string())
            .append_pair("result_filter", "web")
            .append_pair("extra_snippets", "true")
            .append_pair("safesearch", "moderate");

        let response = self
            .client
            .get(url)
            .header("Accept", "application/json")
            .header("Accept-Encoding", "identity")
            .header("X-Subscription-Token", &self.api_key)
            .header("User-Agent", "dr/0.1 agent research CLI")
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let body = response_body_text("Brave Search", response).await?;
            return Err(DrError::Api {
                service: "Brave Search",
                status,
                body: summarize_response_body(&body),
            });
        }

        let body = response_body_text("Brave Search", response).await?;
        let body = serde_json::from_str::<BraveSearchResponse>(&body).map_err(|error| {
            DrError::InvalidEvidence(format!(
                "failed to decode Brave Search response JSON: {error}; body: {}",
                truncate_for_error(&body)
            ))
        })?;
        Ok(body
            .web
            .map(|web| {
                web.results
                    .into_iter()
                    .map(|result| SearchHit {
                        title: result.title,
                        url: result.url,
                        description: result.description,
                        extra_snippets: result.extra_snippets,
                    })
                    .collect()
            })
            .unwrap_or_default())
    }
}

fn truncate_for_error(value: &str) -> String {
    value.chars().take(1_000).collect()
}

#[derive(Debug, Deserialize)]
struct BraveSearchResponse {
    web: Option<BraveWebResults>,
}

#[derive(Debug, Deserialize)]
struct BraveWebResults {
    results: Vec<BraveResult>,
}

#[derive(Debug, Deserialize)]
struct BraveResult {
    title: String,
    url: String,
    description: String,
    #[serde(default)]
    extra_snippets: Vec<String>,
}
