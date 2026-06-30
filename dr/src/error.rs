use std::path::PathBuf;

#[derive(Debug, thiserror::Error)]
pub enum DrError {
    #[error("missing required environment variable `{0}`")]
    MissingEnvironmentVariable(&'static str),

    #[error("failed to read env file `{}`: {source}", path.display())]
    EnvFileRead {
        path: PathBuf,
        source: std::io::Error,
    },

    #[error("invalid env file line {line} in `{}`: {message}", path.display())]
    InvalidEnvLine {
        path: PathBuf,
        line: usize,
        message: String,
    },

    #[error("invalid CLI arguments: {0}")]
    InvalidCli(String),

    #[error("failed HTTP request: {0}")]
    Http(#[from] reqwest::Error),

    #[error("{service} response body read failed: {message}")]
    HttpBodyRead {
        service: &'static str,
        message: String,
        #[source]
        source: reqwest::Error,
    },

    #[error("{service} API returned HTTP {status}: {body}")]
    Api {
        service: &'static str,
        status: reqwest::StatusCode,
        body: String,
    },

    #[error("failed to parse JSON: {0}")]
    Json(#[from] serde_json::Error),

    #[error("OpenRouter response did not contain assistant text: {0}")]
    InvalidOpenRouterResponse(String),

    #[error("invalid research plan: {0}")]
    InvalidPlan(String),

    #[error("invalid evidence batch: {0}")]
    InvalidEvidence(String),

    #[error("invalid generated report: {0}")]
    InvalidReport(String),

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
}

pub type Result<T> = std::result::Result<T, DrError>;
