use std::time::Duration;

use dr::clients::brave::{BraveSearchClient, SearchClient};
use dr::clients::fetch::{DocumentClient, HttpDocumentClient};
use dr::clients::openrouter::{CompletionRequest, LlmClient, OpenRouterClient};
use serde_json::json;
use wiremock::matchers::{body_json, header, method, path, query_param};
use wiremock::{Mock, MockServer, ResponseTemplate};

#[tokio::test]
async fn brave_search_client_should_send_expected_request_and_parse_results() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/res/v1/web/search"))
        .and(query_param("q", "deep research agents"))
        .and(query_param("count", "3"))
        .and(query_param("result_filter", "web"))
        .and(query_param("extra_snippets", "true"))
        .and(header("Accept-Encoding", "identity"))
        .and(header("X-Subscription-Token", "brave-key"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "web": {
                "results": [
                    {
                        "title": "Result One",
                        "url": "https://example.com/one",
                        "description": "First result",
                        "extra_snippets": ["Extra context"]
                    }
                ]
            }
        })))
        .mount(&server)
        .await;

    let client = BraveSearchClient::new(
        format!("{}/res/v1/web/search", server.uri()),
        "brave-key".to_string(),
        Duration::from_secs(5),
    )
    .unwrap_or_else(|error| panic!("client should build: {error}"));

    let results = client
        .search("deep research agents", 3)
        .await
        .unwrap_or_else(|error| panic!("search should succeed: {error}"));

    assert_eq!(results[0].extra_snippets, vec!["Extra context".to_string()]);
}

#[tokio::test]
async fn openrouter_client_should_request_json_mode_and_parse_text() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/api/v1/chat/completions"))
        .and(header("authorization", "Bearer openrouter-key"))
        .and(header("accept", "application/json"))
        .and(header("accept-encoding", "identity"))
        .and(body_json(json!({
            "model": "z-ai/glm-5.2",
            "messages": [
                { "role": "system", "content": "system" },
                { "role": "user", "content": "user" }
            ],
            "temperature": 0.2,
            "max_completion_tokens": 100,
            "stream": false,
            "response_format": { "type": "json_object" }
        })))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": "{\"ok\":true}"
                    }
                }
            ]
        })))
        .mount(&server)
        .await;

    let client = OpenRouterClient::new(
        format!("{}/api/v1", server.uri()),
        "openrouter-key".to_string(),
        Duration::from_secs(5),
    )
    .unwrap_or_else(|error| panic!("client should build: {error}"));

    let text = client
        .complete(CompletionRequest {
            model: "z-ai/glm-5.2".to_string(),
            system_prompt: "system".to_string(),
            user_prompt: "user".to_string(),
            temperature: 0.2,
            max_completion_tokens: 100,
            json_mode: true,
        })
        .await
        .unwrap_or_else(|error| panic!("completion should succeed: {error}"));

    assert_eq!(text, "{\"ok\":true}");
}

#[tokio::test]
async fn openrouter_client_should_parse_text_content_parts() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/api/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": [
                            { "type": "text", "text": "{\"ok\":" },
                            { "type": "text", "text": "true}" }
                        ]
                    }
                }
            ]
        })))
        .mount(&server)
        .await;

    let client = OpenRouterClient::new(
        format!("{}/api/v1", server.uri()),
        "openrouter-key".to_string(),
        Duration::from_secs(5),
    )
    .unwrap_or_else(|error| panic!("client should build: {error}"));

    let text = client
        .complete(CompletionRequest {
            model: "z-ai/glm-5.2".to_string(),
            system_prompt: "system".to_string(),
            user_prompt: "user".to_string(),
            temperature: 0.2,
            max_completion_tokens: 100,
            json_mode: false,
        })
        .await
        .unwrap_or_else(|error| panic!("completion should succeed: {error}"));

    assert_eq!(text, "{\"ok\":true}");
}

#[tokio::test]
async fn document_client_should_fetch_html_and_extract_readable_text() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/paper"))
        .respond_with(ResponseTemplate::new(200).set_body_string(
            "<html><head><style>.hidden{}</style></head><body><h1>Deep Research</h1><script>x()</script><p>Planning &amp; evidence.</p></body></html>",
        ))
        .mount(&server)
        .await;

    let client = HttpDocumentClient::new(Duration::from_secs(5))
        .unwrap_or_else(|error| panic!("client should build: {error}"));
    let document = client
        .fetch(&format!("{}/paper", server.uri()), 80)
        .await
        .unwrap_or_else(|error| panic!("document should fetch: {error}"));

    assert_eq!(document.text, "Deep Research Planning & evidence.");
}
