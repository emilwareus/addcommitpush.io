use axum::Json;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Serialize;
use thiserror::Error;
use tracing::error;

use crate::config::ConfigError;
use crate::crypto::CryptoError;

#[derive(Debug, Error)]
pub enum AppError {
    #[error(transparent)]
    Config(#[from] ConfigError),
    #[error(transparent)]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Migration(#[from] sqlx::migrate::MigrateError),
    #[error(transparent)]
    HttpClient(#[from] reqwest::Error),
    #[error(transparent)]
    Crypto(#[from] CryptoError),
    #[error("authentication is required")]
    Unauthorized,
    #[error("{resource} was not found")]
    NotFound { resource: &'static str },
    #[error("invalid input: {0}")]
    InvalidInput(String),
    #[error("conflict: {0}")]
    Conflict(String),
    #[error("{provider} is not configured")]
    ProviderNotConfigured { provider: &'static str },
    #[error("{provider} returned HTTP {status}: {message}")]
    Upstream {
        provider: &'static str,
        status: StatusCode,
        message: String,
    },
    #[error("provider response was invalid: {0}")]
    InvalidProviderResponse(String),
}

#[derive(Serialize)]
struct ErrorEnvelope {
    error: ErrorBody,
}

#[derive(Serialize)]
struct ErrorBody {
    code: &'static str,
    message: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = match &self {
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, "unauthorized", self.to_string()),
            Self::NotFound { .. } => (StatusCode::NOT_FOUND, "not_found", self.to_string()),
            Self::InvalidInput(_) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "invalid_input",
                self.to_string(),
            ),
            Self::Conflict(_) => (StatusCode::CONFLICT, "conflict", self.to_string()),
            Self::ProviderNotConfigured { .. } => (
                StatusCode::SERVICE_UNAVAILABLE,
                "provider_not_configured",
                self.to_string(),
            ),
            Self::Upstream { .. } | Self::InvalidProviderResponse(_) => (
                StatusCode::BAD_GATEWAY,
                "upstream_error",
                "an external provider request failed".to_owned(),
            ),
            Self::Config(_)
            | Self::Database(_)
            | Self::Migration(_)
            | Self::HttpClient(_)
            | Self::Crypto(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal_error",
                "an internal error occurred".to_owned(),
            ),
        };

        if status.is_server_error() {
            error!(error = %self, "request failed");
        }

        (
            status,
            Json(ErrorEnvelope {
                error: ErrorBody { code, message },
            }),
        )
            .into_response()
    }
}
