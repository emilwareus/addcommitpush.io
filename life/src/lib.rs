//! Backend services for the personal life knowledge agent.

pub mod agent;
pub mod api;
pub mod config;
pub mod connectors;
pub mod crypto;
pub mod db;
pub mod error;
pub mod models;
pub mod openai;
pub mod research;
pub mod shutdown;

use std::time::Duration;

use reqwest::Client;
use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;

use crate::config::Config;
use crate::crypto::TokenCipher;
use crate::db::Repository;
use crate::error::AppError;
use crate::openai::OpenAiClient;

#[derive(Clone)]
pub struct AppState {
    pub config: Config,
    pub repository: Repository,
    pub openai: OpenAiClient,
    pub cipher: TokenCipher,
    pub agent: agent::LifeAgent,
    pub research: research::ResearchService,
    pub connectors: connectors::ConnectorService,
}

impl AppState {
    /// Connects to PostgreSQL, runs migrations, and constructs provider clients.
    ///
    /// # Errors
    /// Returns an error when configuration is invalid, PostgreSQL is unavailable,
    /// migrations fail, or the HTTP client cannot be constructed.
    pub async fn initialize(config: Config) -> Result<Self, AppError> {
        let pool = PgPoolOptions::new()
            .max_connections(config.database_max_connections())
            .acquire_timeout(Duration::from_secs(10))
            .connect_with(config.database_options()?)
            .await?;
        sqlx::migrate!().run(&pool).await?;
        Self::from_pool(config, pool)
    }

    /// Constructs application state around an already connected pool.
    ///
    /// # Errors
    /// Returns an error when cryptographic or HTTP client initialization fails.
    pub fn from_pool(config: Config, pool: PgPool) -> Result<Self, AppError> {
        let http = Client::builder()
            .connect_timeout(Duration::from_secs(10))
            .timeout(Duration::from_secs(90))
            .user_agent(concat!("life-agent/", env!("CARGO_PKG_VERSION")))
            .build()?;
        let cipher = TokenCipher::new(config.encryption_key())?;
        let openai = OpenAiClient::new(http.clone(), &config);
        let agent = agent::LifeAgent::new(openai.clone(), Repository::new(pool.clone()));
        let research =
            research::ResearchService::new(openai.clone(), Repository::new(pool.clone()));
        let connectors = connectors::ConnectorService::new(
            http,
            config.clone(),
            cipher.clone(),
            Repository::new(pool.clone()),
        );

        Ok(Self {
            config,
            repository: Repository::new(pool),
            openai,
            cipher,
            agent,
            research,
            connectors,
        })
    }
}
