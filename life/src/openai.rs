use reqwest::multipart::{Form, Part};
use reqwest::{Client, StatusCode};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::config::Config;
use crate::error::AppError;
use crate::models::RealtimeClientSecret;

const OPENAI_BASE_URL: &str = "https://api.openai.com/v1";

#[derive(Clone)]
pub struct OpenAiClient {
    http: Client,
    api_key: String,
    reasoning_model: String,
    embedding_model: String,
    transcription_model: String,
    speech_model: String,
    realtime_model: String,
    voice: String,
}

#[derive(Serialize)]
struct EmbeddingRequest<'a> {
    model: &'a str,
    input: &'a [String],
    encoding_format: &'static str,
}

#[derive(Deserialize)]
struct EmbeddingResponse {
    data: Vec<EmbeddingDatum>,
}

#[derive(Deserialize)]
struct EmbeddingDatum {
    index: usize,
    embedding: Vec<f32>,
}

#[derive(Deserialize)]
struct ErrorEnvelope {
    error: ProviderError,
}

#[derive(Deserialize)]
struct ProviderError {
    message: String,
}

#[derive(Deserialize)]
struct TranscriptionResponse {
    text: String,
}

#[derive(Debug, Deserialize)]
struct ResponsesEnvelope {
    id: String,
    output: Vec<ResponseItem>,
}

#[derive(Debug, Deserialize)]
struct ResponseItem {
    #[serde(rename = "type")]
    item_type: String,
    #[serde(default)]
    content: Vec<ResponseContent>,
}

#[derive(Debug, Deserialize)]
struct ResponseContent {
    #[serde(rename = "type")]
    content_type: String,
    text: Option<String>,
    refusal: Option<String>,
    #[serde(default)]
    annotations: Vec<Value>,
}

#[derive(Debug, Clone)]
pub struct StructuredResponse<T> {
    pub response_id: String,
    pub value: T,
}

#[derive(Debug, Clone)]
pub struct TextResponse {
    pub response_id: String,
    pub text: String,
    pub annotations: Vec<Value>,
}

impl OpenAiClient {
    pub fn new(http: Client, config: &Config) -> Self {
        Self {
            http,
            api_key: config.openai_api_key().to_owned(),
            reasoning_model: config.openai_reasoning_model().to_owned(),
            embedding_model: config.openai_embedding_model().to_owned(),
            transcription_model: config.openai_transcription_model().to_owned(),
            speech_model: config.openai_speech_model().to_owned(),
            realtime_model: config.openai_realtime_model().to_owned(),
            voice: config.openai_voice().to_owned(),
        }
    }

    /// Embeds every input in bounded provider batches and preserves input order.
    ///
    /// # Errors
    /// Returns an error for an empty batch, provider failure, malformed response,
    /// dimension mismatch, missing item, or reordered/duplicate item.
    pub async fn embed(&self, input: &[String]) -> Result<Vec<Vec<f32>>, AppError> {
        if input.is_empty() {
            return Err(AppError::InvalidInput(
                "embedding input cannot be empty".to_owned(),
            ));
        }

        let mut embeddings = Vec::with_capacity(input.len());
        for chunk in input.chunks(64) {
            embeddings.extend(self.embed_batch(chunk).await?);
        }
        Ok(embeddings)
    }

    async fn embed_batch(&self, input: &[String]) -> Result<Vec<Vec<f32>>, AppError> {
        let response = self
            .http
            .post(format!("{OPENAI_BASE_URL}/embeddings"))
            .bearer_auth(&self.api_key)
            .json(&EmbeddingRequest {
                model: &self.embedding_model,
                input,
                encoding_format: "float",
            })
            .send()
            .await?;
        let response = checked_response(response, "openai").await?;
        let mut data = response.json::<EmbeddingResponse>().await?.data;
        data.sort_unstable_by_key(|item| item.index);
        if data.len() != input.len() {
            return Err(AppError::InvalidProviderResponse(format!(
                "expected {} embeddings, received {}",
                input.len(),
                data.len()
            )));
        }

        data.into_iter()
            .enumerate()
            .map(|(expected_index, item)| {
                if item.index != expected_index {
                    return Err(AppError::InvalidProviderResponse(
                        "embedding indexes were not contiguous".to_owned(),
                    ));
                }
                if item.embedding.len() != 1536 {
                    return Err(AppError::InvalidProviderResponse(format!(
                        "embedding dimension must be 1536, received {}",
                        item.embedding.len()
                    )));
                }
                Ok(item.embedding)
            })
            .collect()
    }

    /// Requests a JSON-schema-constrained response and deserializes its only text item.
    ///
    /// # Errors
    /// Returns an error when the provider rejects the request, refuses the prompt,
    /// violates the response shape, or emits JSON that does not match `T`.
    pub async fn structured_response<T: DeserializeOwned>(
        &self,
        safety_identifier: &str,
        instructions: &str,
        input: &str,
        schema_name: &str,
        schema: Value,
    ) -> Result<StructuredResponse<T>, AppError> {
        let body = json!({
            "model": self.reasoning_model,
            "instructions": instructions,
            "input": [{
                "role": "user",
                "content": [{"type": "input_text", "text": input}]
            }],
            "reasoning": {"effort": "medium"},
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": schema_name,
                    "strict": true,
                    "schema": schema
                }
            },
            "safety_identifier": safety_identifier,
            "store": false
        });
        let response = self.post_responses(&body).await?;
        let response_id = response.id.clone();
        let output = only_output_text(response)?;
        let value = serde_json::from_str(&output.text)
            .map_err(|error| AppError::InvalidProviderResponse(error.to_string()))?;
        Ok(StructuredResponse { response_id, value })
    }

    /// Runs an explicit web-search-enabled Responses request.
    ///
    /// # Errors
    /// Returns an error on provider failure, refusal, or an invalid response shape.
    pub async fn web_search(
        &self,
        safety_identifier: &str,
        instructions: &str,
        input: &str,
    ) -> Result<TextResponse, AppError> {
        let body = json!({
            "model": self.reasoning_model,
            "instructions": instructions,
            "input": input,
            "tools": [{"type": "web_search"}],
            "reasoning": {"effort": "medium"},
            "safety_identifier": safety_identifier,
            "store": false
        });
        let response = self.post_responses(&body).await?;
        let response_id = response.id.clone();
        let output = only_output_text(response)?;
        Ok(TextResponse {
            response_id,
            text: output.text,
            annotations: output.annotations,
        })
    }

    /// Transcribes one complete audio turn into durable text.
    ///
    /// # Errors
    /// Returns an error when the audio metadata is invalid, the provider fails,
    /// or the provider returns an empty transcript.
    pub async fn transcribe(
        &self,
        file_name: &str,
        media_type: &str,
        audio: Vec<u8>,
    ) -> Result<String, AppError> {
        if file_name.trim().is_empty() || !media_type.starts_with("audio/") || audio.is_empty() {
            return Err(AppError::InvalidInput(
                "voice input requires a file name, audio media type, and audio bytes".to_owned(),
            ));
        }
        let part = Part::bytes(audio)
            .file_name(file_name.to_owned())
            .mime_str(media_type)
            .map_err(|error| AppError::InvalidInput(error.to_string()))?;
        let form = Form::new()
            .text("model", self.transcription_model.clone())
            .part("file", part);
        let response = self
            .http
            .post(format!("{OPENAI_BASE_URL}/audio/transcriptions"))
            .bearer_auth(&self.api_key)
            .multipart(form)
            .send()
            .await?;
        let transcript = checked_response(response, "openai")
            .await?
            .json::<TranscriptionResponse>()
            .await?
            .text;
        if transcript.trim().is_empty() {
            return Err(AppError::InvalidProviderResponse(
                "transcription was empty".to_owned(),
            ));
        }
        Ok(transcript)
    }

    /// Synthesizes an assistant answer as MPEG audio.
    ///
    /// # Errors
    /// Returns an error for empty text or a provider/transport failure.
    pub async fn synthesize_speech(&self, text: &str) -> Result<Vec<u8>, AppError> {
        if text.trim().is_empty() {
            return Err(AppError::InvalidInput(
                "speech input cannot be empty".to_owned(),
            ));
        }
        let body = json!({
            "model": self.speech_model,
            "voice": self.voice,
            "input": text,
            "response_format": "mp3"
        });
        let response = self
            .http
            .post(format!("{OPENAI_BASE_URL}/audio/speech"))
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await?;
        let speech = checked_response(response, "openai")
            .await?
            .bytes()
            .await?
            .to_vec();
        if speech.is_empty() {
            return Err(AppError::InvalidProviderResponse(
                "speech response was empty".to_owned(),
            ));
        }
        Ok(speech)
    }

    /// Mints a short-lived, owner-bound Realtime client secret for a browser.
    ///
    /// # Errors
    /// Returns an error when the provider fails or emits invalid JSON.
    pub async fn realtime_client_secret(
        &self,
        safety_identifier: &str,
        instructions: &str,
    ) -> Result<RealtimeClientSecret, AppError> {
        let body = realtime_client_secret_request(
            &self.realtime_model,
            &self.transcription_model,
            &self.voice,
            instructions,
        );
        let response = self
            .http
            .post(format!("{OPENAI_BASE_URL}/realtime/client_secrets"))
            .bearer_auth(&self.api_key)
            .header("OpenAI-Safety-Identifier", safety_identifier)
            .json(&body)
            .send()
            .await?;
        checked_response(response, "openai")
            .await?
            .json::<RealtimeClientSecret>()
            .await
            .map_err(AppError::from)
    }

    pub fn reasoning_model(&self) -> &str {
        &self.reasoning_model
    }

    pub fn transcription_model(&self) -> &str {
        &self.transcription_model
    }

    pub fn speech_model(&self) -> &str {
        &self.speech_model
    }

    pub fn realtime_model(&self) -> &str {
        &self.realtime_model
    }

    pub fn voice(&self) -> &str {
        &self.voice
    }

    async fn post_responses(&self, body: &Value) -> Result<ResponsesEnvelope, AppError> {
        let response = self
            .http
            .post(format!("{OPENAI_BASE_URL}/responses"))
            .bearer_auth(&self.api_key)
            .json(body)
            .send()
            .await?;
        checked_response(response, "openai")
            .await?
            .json::<ResponsesEnvelope>()
            .await
            .map_err(AppError::from)
    }
}

fn realtime_client_secret_request(
    realtime_model: &str,
    transcription_model: &str,
    voice: &str,
    instructions: &str,
) -> Value {
    json!({
        "expires_after": {
            "anchor": "created_at",
            "seconds": 600
        },
        "session": {
            "type": "realtime",
            "model": realtime_model,
            "instructions": instructions,
            "audio": {
                "input": {
                    "transcription": {"model": transcription_model},
                    "turn_detection": {
                        "type": "semantic_vad",
                        "eagerness": "low",
                        "create_response": true,
                        "interrupt_response": true
                    }
                },
                "output": {"voice": voice}
            },
            "tools": [{
                "type": "function",
                "name": "search_life_memory",
                "description": "Search the authenticated person's private life memory. Call this before making a claim about their history, identity, relationships, goals, feelings, or prior statements.",
                "parameters": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["query", "limit"],
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "A concise semantic and keyword search query."
                        },
                        "limit": {
                            "type": "integer",
                            "minimum": 1,
                            "maximum": 20
                        }
                    }
                }
            }],
            "tool_choice": "auto",
            "max_output_tokens": 1200
        }
    })
}

struct ParsedOutput {
    text: String,
    annotations: Vec<Value>,
}

fn only_output_text(response: ResponsesEnvelope) -> Result<ParsedOutput, AppError> {
    let contents = response
        .output
        .into_iter()
        .filter(|item| item.item_type == "message")
        .flat_map(|item| item.content)
        .collect::<Vec<_>>();
    if let Some(refusal) = contents
        .iter()
        .find(|content| content.content_type == "refusal")
    {
        return Err(AppError::InvalidProviderResponse(format!(
            "model refused the request: {}",
            refusal.refusal.as_deref().ok_or_else(|| {
                AppError::InvalidProviderResponse("refusal omitted its explanation".to_owned())
            })?
        )));
    }
    let mut output_texts = contents
        .into_iter()
        .filter(|content| content.content_type == "output_text");
    let output = output_texts.next().ok_or_else(|| {
        AppError::InvalidProviderResponse("response did not contain output_text".to_owned())
    })?;
    if output_texts.next().is_some() {
        return Err(AppError::InvalidProviderResponse(
            "response contained multiple output_text items".to_owned(),
        ));
    }
    let text = output.text.ok_or_else(|| {
        AppError::InvalidProviderResponse("output_text did not contain text".to_owned())
    })?;
    Ok(ParsedOutput {
        text,
        annotations: output.annotations,
    })
}

pub(crate) async fn checked_response(
    response: reqwest::Response,
    provider: &'static str,
) -> Result<reqwest::Response, AppError> {
    let status = response.status();
    if status.is_success() {
        return Ok(response);
    }
    let message = response
        .json::<ErrorEnvelope>()
        .await
        .map_err(|error| AppError::InvalidProviderResponse(error.to_string()))?
        .error
        .message;
    Err(AppError::Upstream {
        provider,
        status: StatusCode::from_u16(status.as_u16())
            .map_err(|error| AppError::InvalidProviderResponse(error.to_string()))?,
        message,
    })
}

pub fn vector_literal(values: &[f32]) -> String {
    let mut output = String::with_capacity(values.len() * 12 + 2);
    output.push('[');
    for (index, value) in values.iter().enumerate() {
        if index > 0 {
            output.push(',');
        }
        output.push_str(&value.to_string());
    }
    output.push(']');
    output
}

#[cfg(test)]
mod tests {
    use super::{
        ResponseContent, ResponseItem, ResponsesEnvelope, only_output_text,
        realtime_client_secret_request, vector_literal,
    };

    #[test]
    fn vector_literal_should_use_pgvector_syntax() {
        assert_eq!(vector_literal(&[1.0, -2.5, 0.25]), "[1,-2.5,0.25]");
    }

    #[test]
    fn responses_parser_preserves_annotations() {
        let response = ResponsesEnvelope {
            id: "resp_1".to_owned(),
            output: vec![ResponseItem {
                item_type: "message".to_owned(),
                content: vec![ResponseContent {
                    content_type: "output_text".to_owned(),
                    text: Some("answer".to_owned()),
                    refusal: None,
                    annotations: vec![serde_json::json!({"type": "url_citation"})],
                }],
            }],
        };

        let output = only_output_text(response).unwrap();

        assert_eq!(output.text, "answer");
        assert_eq!(output.annotations.len(), 1);
    }

    #[test]
    fn responses_parser_rejects_refusal_content() {
        let response = ResponsesEnvelope {
            id: "resp_1".to_owned(),
            output: vec![ResponseItem {
                item_type: "message".to_owned(),
                content: vec![ResponseContent {
                    content_type: "refusal".to_owned(),
                    text: None,
                    refusal: Some("cannot answer".to_owned()),
                    annotations: Vec::new(),
                }],
            }],
        };

        assert!(only_output_text(response).is_err());
    }

    #[test]
    fn realtime_secret_request_fixes_voice_tools_transcription_and_vad() {
        let request = realtime_client_secret_request(
            "gpt-realtime-2.1",
            "gpt-4o-transcribe",
            "marin",
            "owner-scoped instructions",
        );

        assert_eq!(request["expires_after"]["seconds"], 600);
        assert_eq!(request["session"]["model"], "gpt-realtime-2.1");
        assert_eq!(
            request["session"]["audio"]["input"]["transcription"]["model"],
            "gpt-4o-transcribe"
        );
        assert_eq!(
            request["session"]["audio"]["input"]["turn_detection"]["type"],
            "semantic_vad"
        );
        assert_eq!(request["session"]["audio"]["output"]["voice"], "marin");
        assert_eq!(request["session"]["tools"][0]["name"], "search_life_memory");
    }
}
