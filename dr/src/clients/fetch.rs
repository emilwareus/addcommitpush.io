use std::time::Duration;

use async_trait::async_trait;
use reqwest::Url;

use crate::clients::{response_body_text, summarize_response_body};
use crate::error::{DrError, Result};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Document {
    pub url: String,
    pub text: String,
}

#[async_trait]
pub trait DocumentClient: Send + Sync {
    async fn fetch(&self, url: &str, max_chars: usize) -> Result<Document>;
}

#[derive(Debug, Clone)]
pub struct HttpDocumentClient {
    client: reqwest::Client,
}

impl HttpDocumentClient {
    pub fn new(timeout: Duration) -> Result<Self> {
        let client = reqwest::Client::builder()
            .timeout(timeout)
            .redirect(reqwest::redirect::Policy::limited(5))
            .build()?;

        Ok(Self { client })
    }
}

#[async_trait]
impl DocumentClient for HttpDocumentClient {
    async fn fetch(&self, url: &str, max_chars: usize) -> Result<Document> {
        let parsed = Url::parse(url)
            .map_err(|error| DrError::InvalidCli(format!("invalid source URL `{url}`: {error}")))?;
        let response = self
            .client
            .get(parsed)
            .header("Accept", "text/html, text/plain;q=0.9, */*;q=0.5")
            .header("User-Agent", "dr/0.1 source reader")
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let body = response_body_text("Source fetch", response).await?;
            return Err(DrError::Api {
                service: "Source fetch",
                status,
                body: summarize_response_body(&body),
            });
        }

        let final_url = response.url().to_string();
        let raw = response_body_text("Source fetch", response).await?;
        let text = truncate_chars(&html_to_text(&raw), max_chars);

        if is_anti_bot_or_captcha_page(&text) {
            return Err(DrError::InvalidEvidence(format!(
                "source `{url}` appears to be an anti-bot or captcha page"
            )));
        }

        if text.trim().is_empty() {
            return Err(DrError::InvalidEvidence(format!(
                "source `{url}` did not yield readable text"
            )));
        }

        Ok(Document {
            url: final_url,
            text,
        })
    }
}

fn html_to_text(value: &str) -> String {
    let without_scripts = remove_tag_blocks(value, "script");
    let without_styles = remove_tag_blocks(&without_scripts, "style");
    collapse_whitespace(&strip_tags(&without_styles))
}

fn remove_tag_blocks(value: &str, tag: &str) -> String {
    let mut output = String::with_capacity(value.len());
    let lower = value.to_ascii_lowercase();
    let open = format!("<{tag}");
    let close = format!("</{tag}>");
    let mut cursor = 0;

    while let Some(relative_start) = lower[cursor..].find(&open) {
        let start = cursor + relative_start;
        output.push_str(&value[cursor..start]);

        let Some(relative_end) = lower[start..].find(&close) else {
            return output;
        };
        cursor = start + relative_end + close.len();
    }

    output.push_str(&value[cursor..]);
    output
}

fn strip_tags(value: &str) -> String {
    let mut output = String::with_capacity(value.len());
    let mut in_tag = false;

    for character in value.chars() {
        match character {
            '<' => {
                in_tag = true;
                output.push(' ');
            }
            '>' => {
                in_tag = false;
                output.push(' ');
            }
            _ if !in_tag => output.push(character),
            _ => {}
        }
    }

    html_unescape(&output)
}

fn html_unescape(value: &str) -> String {
    value
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
}

fn collapse_whitespace(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn truncate_chars(value: &str, max_chars: usize) -> String {
    value.chars().take(max_chars).collect()
}

fn is_anti_bot_or_captcha_page(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    let signals = [
        "are you a robot",
        "verify you are human",
        "please enable js",
        "please enable javascript",
        "disable any ad blocker",
        "captcha",
        "cloudflare",
        "access denied",
        "checking your browser",
    ];

    signals
        .iter()
        .filter(|signal| lower.contains(**signal))
        .count()
        >= 2
}

#[cfg(test)]
mod tests {
    use super::{html_to_text, is_anti_bot_or_captcha_page};

    #[test]
    fn html_to_text_should_remove_script_and_style_blocks() {
        let text = html_to_text(
            "<html><style>.x{}</style><body>Hello <b>world</b><script>x()</script></body></html>",
        );

        assert_eq!(text, "Hello world");
    }

    #[test]
    fn anti_bot_detection_should_reject_captcha_pages() {
        let text = "Please enable JS and disable any ad blocker. captcha delivery page.";

        assert!(is_anti_bot_or_captcha_page(text));
    }
}
