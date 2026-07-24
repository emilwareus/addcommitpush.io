use std::env;
use std::num::ParseIntError;
use std::str::FromStr;

use base64::Engine as _;
use base64::engine::general_purpose::STANDARD;
use sqlx::postgres::PgConnectOptions;
use thiserror::Error;
use url::Url;

#[derive(Clone)]
pub struct Config {
    database_url: String,
    database_max_connections: u32,
    encryption_key: [u8; 32],
    allowed_origin: Url,
    public_base_url: Url,
    frontend_base_url: Url,
    openai_api_key: String,
    openai_reasoning_model: String,
    openai_embedding_model: String,
    openai_transcription_model: String,
    openai_speech_model: String,
    openai_realtime_model: String,
    openai_voice: String,
    github: Option<OAuthClientConfig>,
    linear: Option<OAuthClientConfig>,
    linear_webhook_secret: Option<String>,
    google: Option<OAuthClientConfig>,
    port: u16,
}

#[derive(Clone)]
pub struct OAuthClientConfig {
    pub client_id: String,
    pub client_secret: String,
}

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("required environment variable {0} is missing")]
    Missing(&'static str),
    #[error("environment variable {name} is invalid: {reason}")]
    Invalid { name: &'static str, reason: String },
    #[error("{0}_CLIENT_ID and {0}_CLIENT_SECRET must either both be set or both be absent")]
    IncompleteOAuth(&'static str),
}

impl Config {
    /// Loads the complete runtime contract from environment variables.
    ///
    /// # Errors
    /// Returns a precise error for every absent or malformed required value.
    pub fn from_env() -> Result<Self, ConfigError> {
        let config = Self {
            database_url: required("DATABASE_URL")?,
            database_max_connections: parse_or("DATABASE_MAX_CONNECTIONS", 10)?,
            encryption_key: decode_encryption_key(&required("LIFE_ENCRYPTION_KEY")?)?,
            allowed_origin: parse_url("LIFE_ALLOWED_ORIGIN")?,
            public_base_url: parse_url("LIFE_PUBLIC_BASE_URL")?,
            frontend_base_url: parse_url("LIFE_FRONTEND_BASE_URL")?,
            openai_api_key: required("OPENAI_API_KEY")?,
            openai_reasoning_model: value_or("OPENAI_REASONING_MODEL", "gpt-5.6-sol"),
            openai_embedding_model: value_or("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
            openai_transcription_model: value_or("OPENAI_TRANSCRIPTION_MODEL", "gpt-4o-transcribe"),
            openai_speech_model: value_or("OPENAI_SPEECH_MODEL", "gpt-4o-mini-tts"),
            openai_realtime_model: value_or("OPENAI_REALTIME_MODEL", "gpt-realtime-2.1"),
            openai_voice: value_or("OPENAI_VOICE", "marin"),
            github: oauth_config("GITHUB")?,
            linear: oauth_config("LINEAR")?,
            linear_webhook_secret: optional("LINEAR_WEBHOOK_SECRET"),
            google: oauth_config("GOOGLE")?,
            port: parse_or("PORT", 8080)?,
        };
        if config.database_max_connections == 0 {
            return Err(ConfigError::Invalid {
                name: "DATABASE_MAX_CONNECTIONS",
                reason: "must be greater than zero".to_owned(),
            });
        }
        if config.port == 0 {
            return Err(ConfigError::Invalid {
                name: "PORT",
                reason: "must be greater than zero".to_owned(),
            });
        }
        validate_http_url("LIFE_ALLOWED_ORIGIN", &config.allowed_origin, true)?;
        validate_http_url("LIFE_PUBLIC_BASE_URL", &config.public_base_url, false)?;
        validate_http_url("LIFE_FRONTEND_BASE_URL", &config.frontend_base_url, true)?;
        Ok(config)
    }

    pub fn database_options(&self) -> Result<PgConnectOptions, ConfigError> {
        PgConnectOptions::from_str(&self.database_url).map_err(|error| ConfigError::Invalid {
            name: "DATABASE_URL",
            reason: error.to_string(),
        })
    }

    pub const fn database_max_connections(&self) -> u32 {
        self.database_max_connections
    }

    pub const fn encryption_key(&self) -> &[u8; 32] {
        &self.encryption_key
    }

    pub const fn allowed_origin(&self) -> &Url {
        &self.allowed_origin
    }

    pub const fn public_base_url(&self) -> &Url {
        &self.public_base_url
    }

    pub const fn frontend_base_url(&self) -> &Url {
        &self.frontend_base_url
    }

    pub fn openai_api_key(&self) -> &str {
        &self.openai_api_key
    }

    pub fn openai_reasoning_model(&self) -> &str {
        &self.openai_reasoning_model
    }

    pub fn openai_embedding_model(&self) -> &str {
        &self.openai_embedding_model
    }

    pub fn openai_transcription_model(&self) -> &str {
        &self.openai_transcription_model
    }

    pub fn openai_speech_model(&self) -> &str {
        &self.openai_speech_model
    }

    pub fn openai_realtime_model(&self) -> &str {
        &self.openai_realtime_model
    }

    pub fn openai_voice(&self) -> &str {
        &self.openai_voice
    }

    pub const fn github(&self) -> Option<&OAuthClientConfig> {
        self.github.as_ref()
    }

    pub const fn linear(&self) -> Option<&OAuthClientConfig> {
        self.linear.as_ref()
    }

    pub fn linear_webhook_secret(&self) -> Option<&str> {
        self.linear_webhook_secret.as_deref()
    }

    pub const fn google(&self) -> Option<&OAuthClientConfig> {
        self.google.as_ref()
    }

    pub const fn port(&self) -> u16 {
        self.port
    }
}

fn required(name: &'static str) -> Result<String, ConfigError> {
    env::var(name)
        .ok()
        .filter(|value| !value.trim().is_empty())
        .ok_or(ConfigError::Missing(name))
}

fn optional(name: &'static str) -> Option<String> {
    env::var(name).ok().filter(|value| !value.trim().is_empty())
}

fn value_or(name: &'static str, default: &str) -> String {
    env::var(name)
        .ok()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| default.to_owned())
}

fn parse_or<T>(name: &'static str, default: T) -> Result<T, ConfigError>
where
    T: FromStr<Err = ParseIntError>,
{
    let Some(value) = env::var(name).ok().filter(|value| !value.trim().is_empty()) else {
        return Ok(default);
    };
    value.parse::<T>().map_err(|error| ConfigError::Invalid {
        name,
        reason: error.to_string(),
    })
}

fn parse_url(name: &'static str) -> Result<Url, ConfigError> {
    let value = required(name)?;
    Url::parse(&value).map_err(|error| ConfigError::Invalid {
        name,
        reason: error.to_string(),
    })
}

fn decode_encryption_key(value: &str) -> Result<[u8; 32], ConfigError> {
    let decoded = STANDARD
        .decode(value)
        .map_err(|error| ConfigError::Invalid {
            name: "LIFE_ENCRYPTION_KEY",
            reason: error.to_string(),
        })?;
    decoded
        .try_into()
        .map_err(|bytes: Vec<u8>| ConfigError::Invalid {
            name: "LIFE_ENCRYPTION_KEY",
            reason: format!("must decode to 32 bytes, decoded to {}", bytes.len()),
        })
}

fn validate_http_url(
    name: &'static str,
    url: &Url,
    require_origin_only: bool,
) -> Result<(), ConfigError> {
    if !matches!(url.scheme(), "http" | "https")
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
        || (require_origin_only && url.path() != "/")
    {
        return Err(ConfigError::Invalid {
            name,
            reason: if require_origin_only {
                "must be an HTTP(S) origin without credentials, path, query, or fragment".to_owned()
            } else {
                "must be an HTTP(S) URL without credentials, query, or fragment".to_owned()
            },
        });
    }
    Ok(())
}

fn oauth_config(prefix: &'static str) -> Result<Option<OAuthClientConfig>, ConfigError> {
    let client_id_name = format!("{prefix}_CLIENT_ID");
    let client_secret_name = format!("{prefix}_CLIENT_SECRET");
    let client_id = env::var(&client_id_name)
        .ok()
        .filter(|value| !value.trim().is_empty());
    let client_secret = env::var(&client_secret_name)
        .ok()
        .filter(|value| !value.trim().is_empty());
    match (client_id, client_secret) {
        (Some(client_id), Some(client_secret)) => Ok(Some(OAuthClientConfig {
            client_id,
            client_secret,
        })),
        (None, None) => Ok(None),
        _ => Err(ConfigError::IncompleteOAuth(prefix)),
    }
}

#[cfg(test)]
mod tests {
    use url::Url;

    use super::validate_http_url;

    #[test]
    fn allowed_origin_rejects_a_path() {
        let url = Url::parse("https://life.example/api").unwrap();

        assert!(validate_http_url("LIFE_ALLOWED_ORIGIN", &url, true).is_err());
    }

    #[test]
    fn public_base_url_accepts_a_path_prefix() {
        let url = Url::parse("https://life.example/backend").unwrap();

        assert!(validate_http_url("LIFE_PUBLIC_BASE_URL", &url, false).is_ok());
    }

    #[test]
    fn frontend_base_url_rejects_a_path() {
        let url = Url::parse("https://life-ui.example/app").unwrap();

        assert!(validate_http_url("LIFE_FRONTEND_BASE_URL", &url, true).is_err());
    }
}
