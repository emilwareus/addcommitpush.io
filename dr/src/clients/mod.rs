pub mod brave;
pub mod fetch;
pub mod openrouter;

use crate::error::{DrError, Result};

pub(crate) async fn response_body_text(
    service: &'static str,
    response: reqwest::Response,
) -> Result<String> {
    let bytes = response.bytes().await.map_err(|source| {
        let message = describe_body_error(&source);
        DrError::HttpBodyRead {
            service,
            message,
            source,
        }
    })?;

    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

pub(crate) fn summarize_response_body(body: &str) -> String {
    const MAX_CHARS: usize = 600;

    let collapsed = body.split_whitespace().collect::<Vec<_>>().join(" ");
    let mut summary = collapsed.chars().take(MAX_CHARS).collect::<String>();
    if collapsed.chars().count() > MAX_CHARS {
        summary.push_str("...");
    }
    summary
}

fn describe_body_error(error: &reqwest::Error) -> String {
    if error.is_timeout() {
        return "timed out while reading the response body".to_string();
    }

    if error.is_decode() {
        return format!("could not decode the response body: {error}");
    }

    error.to_string()
}
