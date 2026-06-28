use std::time::Duration;

use async_trait::async_trait;
use reqwest::Url;
use serde::Deserialize;
use serde_json::json;

use crate::clients::{response_body_text, summarize_response_body};
use crate::error::{DrError, Result};

#[derive(Debug, Clone)]
pub struct CompletionRequest {
    pub model: String,
    pub system_prompt: String,
    pub user_prompt: String,
    pub temperature: f64,
    pub max_completion_tokens: u32,
    pub json_mode: bool,
}

#[async_trait]
pub trait LlmClient: Send + Sync {
    async fn complete(&self, request: CompletionRequest) -> Result<String>;
}

#[derive(Debug, Clone)]
pub struct OpenRouterClient {
    base_url: Url,
    api_key: String,
    client: reqwest::Client,
}

impl OpenRouterClient {
    pub fn new(base_url: String, api_key: String, timeout: Duration) -> Result<Self> {
        let normalized_base_url = format!("{}/", base_url.trim_end_matches('/'));
        let base_url = Url::parse(&normalized_base_url)
            .map_err(|error| DrError::InvalidCli(format!("invalid OpenRouter URL: {error}")))?;
        let client = reqwest::Client::builder()
            .timeout(timeout)
            .http1_only()
            .build()?;

        Ok(Self {
            base_url,
            api_key,
            client,
        })
    }

    fn chat_completions_url(&self) -> Result<Url> {
        self.base_url
            .join("chat/completions")
            .map_err(|error| DrError::InvalidCli(format!("invalid OpenRouter endpoint: {error}")))
    }
}

#[async_trait]
impl LlmClient for OpenRouterClient {
    async fn complete(&self, request: CompletionRequest) -> Result<String> {
        let mut body = json!({
            "model": request.model,
            "messages": [
                { "role": "system", "content": request.system_prompt },
                { "role": "user", "content": request.user_prompt }
            ],
            "temperature": request.temperature,
            "max_completion_tokens": request.max_completion_tokens,
            "stream": false
        });

        if request.json_mode {
            body["response_format"] = json!({ "type": "json_object" });
        }

        let response = self
            .client
            .post(self.chat_completions_url()?)
            .bearer_auth(&self.api_key)
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .header("Accept-Encoding", "identity")
            .header("HTTP-Referer", "https://addcommitpush.io")
            .header("X-OpenRouter-Title", "dr deep research CLI")
            .json(&body)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let body = response_body_text("OpenRouter", response).await?;
            return Err(DrError::Api {
                service: "OpenRouter",
                status,
                body: summarize_response_body(&body),
            });
        }

        let body = response_body_text("OpenRouter", response).await?;
        let completion =
            serde_json::from_str::<ChatCompletionResponse>(&body).map_err(|error| {
                DrError::InvalidOpenRouterResponse(format!(
                    "failed to decode response JSON: {error}; body: {}",
                    truncate_for_error(&body)
                ))
            })?;
        completion.into_text()
    }
}

fn truncate_for_error(value: &str) -> String {
    value.chars().take(1_000).collect()
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatChoice>,
}

impl ChatCompletionResponse {
    fn into_text(self) -> Result<String> {
        let Some(choice) = self.choices.into_iter().next() else {
            return Err(DrError::InvalidOpenRouterResponse(
                "choices array was empty".to_string(),
            ));
        };

        let content = choice
            .message
            .content
            .ok_or_else(|| {
                DrError::InvalidOpenRouterResponse(
                    "assistant message did not include content".to_string(),
                )
            })?
            .into_text();

        if content.trim().is_empty() {
            return Err(DrError::InvalidOpenRouterResponse(
                "assistant content was empty".to_string(),
            ));
        }

        Ok(content)
    }
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

#[derive(Debug, Deserialize)]
struct ChatMessage {
    #[serde(default)]
    content: Option<ChatContent>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum ChatContent {
    Text(String),
    Parts(Vec<ChatContentPart>),
}

impl ChatContent {
    fn into_text(self) -> String {
        match self {
            Self::Text(text) => text,
            Self::Parts(parts) => parts
                .into_iter()
                .filter_map(|part| part.text)
                .collect::<Vec<_>>()
                .join(""),
        }
    }
}

#[derive(Debug, Deserialize)]
struct ChatContentPart {
    text: Option<String>,
}
