use std::str::FromStr;

use chrono::{Duration, Utc};
use hmac::{Hmac, Mac};
use reqwest::{Client, RequestBuilder, Response, StatusCode};
use serde::Deserialize;
use serde::de::DeserializeOwned;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use url::Url;
use uuid::Uuid;

use crate::config::{Config, OAuthClientConfig};
use crate::crypto::{EncryptedSecret, TokenCipher};
use crate::db::Repository;
use crate::error::AppError;
use crate::models::{
    Connector, ConnectorCredentials, ImportedRecord, IngestionJob, OAuthStartResponse,
};
use crate::openai::OpenAiClient;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Provider {
    GitHub,
    Linear,
    Gmail,
}

impl Provider {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::GitHub => "github",
            Self::Linear => "linear",
            Self::Gmail => "gmail",
        }
    }

    const fn oauth_config(self, config: &Config) -> Option<&OAuthClientConfig> {
        match self {
            Self::GitHub => config.github(),
            Self::Linear => config.linear(),
            Self::Gmail => config.google(),
        }
    }

    const fn token_endpoint(self) -> &'static str {
        match self {
            Self::GitHub => "https://github.com/login/oauth/access_token",
            Self::Linear => "https://api.linear.app/oauth/token",
            Self::Gmail => "https://oauth2.googleapis.com/token",
        }
    }
}

impl FromStr for Provider {
    type Err = AppError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value {
            "github" => Ok(Self::GitHub),
            "linear" => Ok(Self::Linear),
            "gmail" => Ok(Self::Gmail),
            _ => Err(AppError::InvalidInput(format!(
                "unsupported connector provider: {value}"
            ))),
        }
    }
}

#[derive(Debug, Deserialize)]
struct OAuthTokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: Option<i64>,
    #[serde(default)]
    scope: String,
}

#[derive(Debug)]
struct ExternalIdentity {
    id: String,
    name: String,
}

#[derive(Clone)]
pub struct ConnectorService {
    http: Client,
    config: Config,
    cipher: TokenCipher,
    repository: Repository,
}

impl ConnectorService {
    pub const fn new(
        http: Client,
        config: Config,
        cipher: TokenCipher,
        repository: Repository,
    ) -> Self {
        Self {
            http,
            config,
            cipher,
            repository,
        }
    }

    pub async fn start_oauth(
        &self,
        owner_id: Uuid,
        provider: Provider,
    ) -> Result<OAuthStartResponse, AppError> {
        let client =
            provider
                .oauth_config(&self.config)
                .ok_or(AppError::ProviderNotConfigured {
                    provider: provider.as_str(),
                })?;
        let state = format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple());
        let state_hash = Sha256::digest(state.as_bytes());
        self.repository
            .create_oauth_state(owner_id, provider.as_str(), state_hash.as_slice())
            .await?;
        let redirect_uri = self.redirect_uri(provider);
        let authorization_url = authorization_url(provider, client, &redirect_uri, &state)?;
        Ok(OAuthStartResponse {
            provider: provider.as_str().to_owned(),
            authorization_url: authorization_url.to_string(),
        })
    }

    pub async fn finish_oauth(
        &self,
        provider: Provider,
        code: &str,
        state: &str,
    ) -> Result<Connector, AppError> {
        if code.trim().is_empty() || state.trim().is_empty() {
            return Err(AppError::InvalidInput(
                "OAuth code and state cannot be empty".to_owned(),
            ));
        }
        let state_hash = Sha256::digest(state.as_bytes());
        let owner_id = self
            .repository
            .consume_oauth_state(provider.as_str(), state_hash.as_slice())
            .await?;
        let connector_id = self
            .repository
            .connector_id(owner_id, provider.as_str())
            .await?;
        let token = self
            .exchange_authorization_code(provider, code, &self.redirect_uri(provider))
            .await?;
        if token.access_token.trim().is_empty() {
            return Err(AppError::InvalidProviderResponse(
                "OAuth access token was empty".to_owned(),
            ));
        }
        let identity = self
            .external_identity(provider, &token.access_token)
            .await?;
        let access = self
            .cipher
            .encrypt(&token.access_token, connector_id.as_bytes())?;
        let refresh = token
            .refresh_token
            .as_deref()
            .map(|secret| self.cipher.encrypt(secret, connector_id.as_bytes()))
            .transpose()?;
        let expires_at = token
            .expires_in
            .map(|seconds| Utc::now() + Duration::seconds(seconds));
        let scopes = parse_scopes(&token.scope);
        self.repository
            .connect_connector(
                owner_id,
                provider.as_str(),
                &identity.id,
                &identity.name,
                &scopes,
                &access,
                refresh.as_ref(),
                expires_at,
            )
            .await
    }

    pub async fn access_token(
        &self,
        credentials: &ConnectorCredentials,
    ) -> Result<String, AppError> {
        let provider = Provider::from_str(&credentials.provider)?;
        if !matches!(
            credentials.status.as_str(),
            "connected" | "syncing" | "error"
        ) {
            return Err(AppError::Conflict("connector is not connected".to_owned()));
        }
        let access = encrypted_secret(
            credentials.access_token_ciphertext.as_ref(),
            credentials.access_token_nonce.as_ref(),
            "access token",
        )?;
        if credentials
            .token_expires_at
            .is_none_or(|expires_at| expires_at > Utc::now() + Duration::seconds(90))
        {
            return self
                .cipher
                .decrypt(&access, credentials.id.as_bytes())
                .map_err(AppError::from);
        }
        let refresh = encrypted_secret(
            credentials.refresh_token_ciphertext.as_ref(),
            credentials.refresh_token_nonce.as_ref(),
            "refresh token",
        )?;
        let refresh = self.cipher.decrypt(&refresh, credentials.id.as_bytes())?;
        let token = self.exchange_refresh_token(provider, &refresh).await?;
        let encrypted_access = self
            .cipher
            .encrypt(&token.access_token, credentials.id.as_bytes())?;
        let encrypted_refresh = token
            .refresh_token
            .as_deref()
            .map(|secret| self.cipher.encrypt(secret, credentials.id.as_bytes()))
            .transpose()?;
        let expires_at = token
            .expires_in
            .map(|seconds| Utc::now() + Duration::seconds(seconds));
        self.repository
            .update_connector_tokens(
                credentials.id,
                &encrypted_access,
                encrypted_refresh.as_ref(),
                expires_at,
            )
            .await?;
        Ok(token.access_token)
    }

    pub async fn accept_linear_webhook(
        &self,
        signature: &str,
        body: &[u8],
    ) -> Result<Vec<IngestionJob>, AppError> {
        let secret =
            self.config
                .linear_webhook_secret()
                .ok_or(AppError::ProviderNotConfigured {
                    provider: "linear webhook",
                })?;
        let signature = hex::decode(signature).map_err(|_| AppError::Unauthorized)?;
        let mut verifier = Hmac::<Sha256>::new_from_slice(secret.as_bytes())
            .map_err(|_| AppError::Unauthorized)?;
        verifier.update(body);
        verifier
            .verify_slice(&signature)
            .map_err(|_| AppError::Unauthorized)?;
        let payload: Value = serde_json::from_slice(body)
            .map_err(|error| AppError::InvalidInput(error.to_string()))?;
        let timestamp = payload
            .get("webhookTimestamp")
            .and_then(Value::as_i64)
            .ok_or_else(|| {
                AppError::InvalidInput("Linear webhook omitted webhookTimestamp".to_owned())
            })?;
        let age_millis = (Utc::now().timestamp_millis() - timestamp).abs();
        if age_millis > 60_000 {
            return Err(AppError::Unauthorized);
        }
        let connectors = self.repository.connected_connector_owners("linear").await?;
        let mut jobs = Vec::with_capacity(connectors.len());
        for (owner_id, connector_id) in connectors {
            jobs.push(
                self.repository
                    .enqueue_connector_sync(owner_id, connector_id)
                    .await?,
            );
        }
        Ok(jobs)
    }

    fn redirect_uri(&self, provider: Provider) -> String {
        format!(
            "{}/v1/oauth/{}/callback",
            self.config.public_base_url().as_str().trim_end_matches('/'),
            provider.as_str()
        )
    }

    async fn exchange_authorization_code(
        &self,
        provider: Provider,
        code: &str,
        redirect_uri: &str,
    ) -> Result<OAuthTokenResponse, AppError> {
        let client =
            provider
                .oauth_config(&self.config)
                .ok_or(AppError::ProviderNotConfigured {
                    provider: provider.as_str(),
                })?;
        provider_json(
            provider.as_str(),
            self.http
                .post(provider.token_endpoint())
                .header("Accept", "application/json")
                .form(&[
                    ("grant_type", "authorization_code"),
                    ("client_id", client.client_id.as_str()),
                    ("client_secret", client.client_secret.as_str()),
                    ("code", code),
                    ("redirect_uri", redirect_uri),
                ]),
        )
        .await
    }

    async fn exchange_refresh_token(
        &self,
        provider: Provider,
        refresh_token: &str,
    ) -> Result<OAuthTokenResponse, AppError> {
        let client =
            provider
                .oauth_config(&self.config)
                .ok_or(AppError::ProviderNotConfigured {
                    provider: provider.as_str(),
                })?;
        provider_json(
            provider.as_str(),
            self.http
                .post(provider.token_endpoint())
                .header("Accept", "application/json")
                .form(&[
                    ("grant_type", "refresh_token"),
                    ("client_id", client.client_id.as_str()),
                    ("client_secret", client.client_secret.as_str()),
                    ("refresh_token", refresh_token),
                ]),
        )
        .await
    }

    async fn external_identity(
        &self,
        provider: Provider,
        access_token: &str,
    ) -> Result<ExternalIdentity, AppError> {
        match provider {
            Provider::GitHub => {
                let value: Value = provider_json(
                    "github",
                    self.http
                        .get("https://api.github.com/user")
                        .bearer_auth(access_token)
                        .header("Accept", "application/vnd.github+json")
                        .header("X-GitHub-Api-Version", "2026-03-10"),
                )
                .await?;
                Ok(ExternalIdentity {
                    id: json_scalar_string(&value, "id")?,
                    name: required_json_string(&value, "login")?.to_owned(),
                })
            }
            Provider::Linear => {
                let value: Value = provider_json(
                    "linear",
                    self.http
                        .post("https://api.linear.app/graphql")
                        .bearer_auth(access_token)
                        .json(&json!({"query": "query LifeViewer { viewer { id name email } }"})),
                )
                .await?;
                let viewer = value
                    .pointer("/data/viewer")
                    .ok_or_else(|| invalid_provider("Linear response omitted viewer"))?;
                Ok(ExternalIdentity {
                    id: required_json_string(viewer, "id")?.to_owned(),
                    name: required_json_string(viewer, "name")?.to_owned(),
                })
            }
            Provider::Gmail => {
                let value: Value = provider_json(
                    "gmail",
                    self.http
                        .get("https://gmail.googleapis.com/gmail/v1/users/me/profile")
                        .bearer_auth(access_token),
                )
                .await?;
                let email = required_json_string(&value, "emailAddress")?;
                Ok(ExternalIdentity {
                    id: email.to_owned(),
                    name: email.to_owned(),
                })
            }
        }
    }
}

#[derive(Clone)]
pub struct IngestionWorker {
    http: Client,
    connectors: ConnectorService,
    repository: Repository,
    openai: OpenAiClient,
}

impl IngestionWorker {
    pub const fn new(
        http: Client,
        connectors: ConnectorService,
        repository: Repository,
        openai: OpenAiClient,
    ) -> Self {
        Self {
            http,
            connectors,
            repository,
            openai,
        }
    }

    pub async fn execute(&self, job: &IngestionJob) -> Result<usize, AppError> {
        if job.job_kind != "connector_sync" {
            return Err(AppError::InvalidInput(format!(
                "worker does not implement job kind {}",
                job.job_kind
            )));
        }
        let connector_id = job.connector_id.ok_or_else(|| {
            AppError::InvalidInput("connector sync job has no connector".to_owned())
        })?;
        let credentials = self.repository.connector_credentials(connector_id).await?;
        if credentials.owner_id != job.owner_id {
            return Err(AppError::InvalidInput(
                "job and connector owners do not match".to_owned(),
            ));
        }
        let token = self.connectors.access_token(&credentials).await?;
        let provider = Provider::from_str(&credentials.provider)?;
        let (records, cursor) = self
            .fetch_records(
                provider,
                &token,
                &credentials.sync_cursor,
                credentials.external_account_name.as_deref(),
            )
            .await?;
        let inputs = records
            .iter()
            .map(|record| format!("{}\n{}", record.title, record.body_markdown))
            .collect::<Vec<_>>();
        let embeddings = if inputs.is_empty() {
            Vec::new()
        } else {
            self.openai.embed(&inputs).await?
        };
        self.repository
            .ingest_connector_records(
                job,
                connector_id,
                provider.as_str(),
                records,
                embeddings,
                &cursor,
            )
            .await
    }

    async fn fetch_records(
        &self,
        provider: Provider,
        access_token: &str,
        cursor: &Value,
        external_account_name: Option<&str>,
    ) -> Result<(Vec<ImportedRecord>, Value), AppError> {
        match provider {
            Provider::GitHub => {
                let login = external_account_name.ok_or_else(|| {
                    AppError::InvalidInput("GitHub connector has no account login".to_owned())
                })?;
                self.fetch_github(access_token, cursor, login).await
            }
            Provider::Linear => self.fetch_linear(access_token, cursor).await,
            Provider::Gmail => self.fetch_gmail(access_token, cursor).await,
        }
    }

    async fn fetch_github(
        &self,
        token: &str,
        cursor: &Value,
        login: &str,
    ) -> Result<(Vec<ImportedRecord>, Value), AppError> {
        let prior_id = cursor.get("last_event_id").and_then(Value::as_str);
        let mut next_id = None;
        let mut records = Vec::new();
        let mut reached_prior = false;
        for page in 1..=3 {
            let mut events_url = Url::parse("https://api.github.com/users/")
                .map_err(|error| AppError::InvalidInput(error.to_string()))?;
            events_url
                .path_segments_mut()
                .map_err(|()| AppError::InvalidInput("GitHub URL cannot be a base".to_owned()))?
                .push(login)
                .push("events");
            let events: Value = provider_json(
                "github",
                self.http
                    .get(events_url)
                    .query(&[("per_page", "100"), ("page", &page.to_string())])
                    .bearer_auth(token)
                    .header("Accept", "application/vnd.github+json")
                    .header("X-GitHub-Api-Version", "2026-03-10"),
            )
            .await?;
            let events = events
                .as_array()
                .ok_or_else(|| invalid_provider("GitHub events response was not an array"))?;
            if next_id.is_none() {
                next_id = events
                    .first()
                    .and_then(|event| event.get("id"))
                    .and_then(Value::as_str)
                    .map(ToOwned::to_owned);
            }
            for event in events {
                let id = required_json_string(event, "id")?;
                if Some(id) == prior_id {
                    reached_prior = true;
                    break;
                }
                let event_type = required_json_string(event, "type")?;
                let repository = event
                    .pointer("/repo/name")
                    .and_then(Value::as_str)
                    .ok_or_else(|| invalid_provider("GitHub event omitted repository"))?;
                let observed_at = parse_optional_timestamp(event.get("created_at"))?;
                let payload = event
                    .get("payload")
                    .cloned()
                    .ok_or_else(|| invalid_provider("GitHub event omitted payload"))?;
                records.push(ImportedRecord {
                    external_id: id.to_owned(),
                    uri: Some(format!("https://github.com/{repository}")),
                    title: format!("GitHub {event_type} in {repository}"),
                    body_markdown: format!(
                        "GitHub recorded **{event_type}** in [{repository}](https://github.com/{repository}).\n\n```json\n{}\n```",
                        serde_json::to_string_pretty(&payload)
                            .map_err(|error| invalid_provider(&error.to_string()))?
                    ),
                    payload: event.clone(),
                    observed_at,
                });
            }
            if reached_prior || events.len() < 100 {
                break;
            }
        }
        let next_id = next_id.or_else(|| prior_id.map(ToOwned::to_owned));
        Ok((records, json!({"last_event_id": next_id})))
    }

    async fn fetch_linear(
        &self,
        token: &str,
        cursor: &Value,
    ) -> Result<(Vec<ImportedRecord>, Value), AppError> {
        let prior = cursor.get("updated_at").and_then(Value::as_str);
        let mut newest = prior.map(ToOwned::to_owned);
        let mut records = Vec::new();
        let mut after: Option<String> = None;
        loop {
            let response: Value = provider_json(
                "linear",
                self.http
                    .post("https://api.linear.app/graphql")
                    .bearer_auth(token)
                    .json(&json!({
                        "query": "query LifeIssues($after: String) { viewer { issues(first: 100, after: $after, orderBy: updatedAt) { nodes { id identifier title description url createdAt updatedAt completedAt state { name } team { name } project { name } } pageInfo { hasNextPage endCursor } } } }",
                        "variables": {"after": after}
                    })),
            )
            .await?;
            reject_graphql_errors(&response, "linear")?;
            let issues = response
                .pointer("/data/viewer/issues/nodes")
                .and_then(Value::as_array)
                .ok_or_else(|| invalid_provider("Linear response omitted issue nodes"))?;
            for issue in issues {
                let updated_at = required_json_string(issue, "updatedAt")?;
                if prior.is_some_and(|value| updated_at <= value) {
                    continue;
                }
                if newest.as_deref().is_none_or(|value| updated_at > value) {
                    newest = Some(updated_at.to_owned());
                }
                let identifier = required_json_string(issue, "identifier")?;
                let title = required_json_string(issue, "title")?;
                let url = required_json_string(issue, "url")?;
                let state = issue
                    .pointer("/state/name")
                    .and_then(Value::as_str)
                    .ok_or_else(|| invalid_provider("Linear issue omitted state name"))?;
                let description = issue.get("description").and_then(Value::as_str);
                let mut body_markdown = format!("[{identifier}: {title}]({url}) is **{state}**.");
                if let Some(description) = description {
                    body_markdown.push_str("\n\n");
                    body_markdown.push_str(description);
                }
                records.push(ImportedRecord {
                    external_id: required_json_string(issue, "id")?.to_owned(),
                    uri: Some(url.to_owned()),
                    title: format!("Linear {identifier}: {title}"),
                    body_markdown,
                    payload: issue.clone(),
                    observed_at: parse_optional_timestamp(issue.get("updatedAt"))?,
                });
            }
            let has_next = response
                .pointer("/data/viewer/issues/pageInfo/hasNextPage")
                .and_then(Value::as_bool)
                .ok_or_else(|| invalid_provider("Linear response omitted hasNextPage"))?;
            if !has_next {
                break;
            }
            after = Some(
                response
                    .pointer("/data/viewer/issues/pageInfo/endCursor")
                    .and_then(Value::as_str)
                    .ok_or_else(|| invalid_provider("Linear response omitted endCursor"))?
                    .to_owned(),
            );
        }
        Ok((records, json!({"updated_at": newest})))
    }

    async fn fetch_gmail(
        &self,
        token: &str,
        cursor: &Value,
    ) -> Result<(Vec<ImportedRecord>, Value), AppError> {
        let profile: Value = provider_json(
            "gmail",
            self.http
                .get("https://gmail.googleapis.com/gmail/v1/users/me/profile")
                .bearer_auth(token),
        )
        .await?;
        let next_history_id = required_json_string(&profile, "historyId")?.to_owned();
        let message_ids = if let Some(history_id) = cursor.get("history_id").and_then(Value::as_str)
        {
            self.gmail_history_message_ids(token, history_id).await?
        } else {
            self.gmail_initial_message_ids(token).await?
        };
        let mut records = Vec::with_capacity(message_ids.len());
        for message_id in message_ids {
            let message: Value = provider_json(
                "gmail",
                self.http
                    .get(format!(
                        "https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}"
                    ))
                    .query(&[
                        ("format", "metadata"),
                        ("metadataHeaders", "Subject"),
                        ("metadataHeaders", "From"),
                        ("metadataHeaders", "To"),
                        ("metadataHeaders", "Date"),
                    ])
                    .bearer_auth(token),
            )
            .await?;
            records.push(gmail_record(&message)?);
        }
        Ok((records, json!({"history_id": next_history_id})))
    }

    async fn gmail_initial_message_ids(&self, token: &str) -> Result<Vec<String>, AppError> {
        let mut ids = Vec::new();
        let mut page_token: Option<String> = None;
        loop {
            let mut request = self
                .http
                .get("https://gmail.googleapis.com/gmail/v1/users/me/messages")
                .query(&[("maxResults", "100"), ("q", "newer_than:30d")])
                .bearer_auth(token);
            if let Some(token) = &page_token {
                request = request.query(&[("pageToken", token)]);
            }
            let response: Value = provider_json("gmail", request).await?;
            if let Some(messages) = response.get("messages").and_then(Value::as_array) {
                for message in messages {
                    ids.push(required_json_string(message, "id")?.to_owned());
                }
            } else if response.get("resultSizeEstimate").and_then(Value::as_u64) != Some(0) {
                return Err(invalid_provider(
                    "Gmail list response omitted messages for a non-empty result",
                ));
            }
            let Some(next) = response.get("nextPageToken").and_then(Value::as_str) else {
                break;
            };
            page_token = Some(next.to_owned());
        }
        Ok(ids)
    }

    async fn gmail_history_message_ids(
        &self,
        token: &str,
        history_id: &str,
    ) -> Result<Vec<String>, AppError> {
        let mut ids = Vec::new();
        let mut page_token: Option<String> = None;
        loop {
            let mut request = self
                .http
                .get("https://gmail.googleapis.com/gmail/v1/users/me/history")
                .query(&[
                    ("startHistoryId", history_id),
                    ("historyTypes", "messageAdded"),
                    ("maxResults", "100"),
                ])
                .bearer_auth(token);
            if let Some(token) = &page_token {
                request = request.query(&[("pageToken", token)]);
            }
            let response: Value = provider_json("gmail", request).await?;
            for history in response
                .get("history")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                for added in history
                    .get("messagesAdded")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                {
                    let id = added
                        .pointer("/message/id")
                        .and_then(Value::as_str)
                        .ok_or_else(|| invalid_provider("Gmail history item omitted message ID"))?;
                    if !ids.iter().any(|existing| existing == id) {
                        ids.push(id.to_owned());
                    }
                }
            }
            let Some(next) = response.get("nextPageToken").and_then(Value::as_str) else {
                break;
            };
            page_token = Some(next.to_owned());
        }
        Ok(ids)
    }
}

fn authorization_url(
    provider: Provider,
    client: &OAuthClientConfig,
    redirect_uri: &str,
    state: &str,
) -> Result<Url, AppError> {
    let (base, scope) = match provider {
        Provider::GitHub => (
            "https://github.com/login/oauth/authorize",
            "read:user user:email repo",
        ),
        Provider::Linear => ("https://linear.app/oauth/authorize", "read"),
        Provider::Gmail => (
            "https://accounts.google.com/o/oauth2/v2/auth",
            "openid email profile https://www.googleapis.com/auth/gmail.readonly",
        ),
    };
    let mut url = Url::parse(base).map_err(|error| AppError::InvalidInput(error.to_string()))?;
    url.query_pairs_mut()
        .append_pair("client_id", &client.client_id)
        .append_pair("redirect_uri", redirect_uri)
        .append_pair("response_type", "code")
        .append_pair("scope", scope)
        .append_pair("state", state);
    if provider == Provider::Linear {
        url.query_pairs_mut().append_pair("prompt", "consent");
    }
    if provider == Provider::Gmail {
        url.query_pairs_mut()
            .append_pair("access_type", "offline")
            .append_pair("prompt", "consent");
    }
    Ok(url)
}

async fn provider_json<T: DeserializeOwned>(
    provider: &'static str,
    request: RequestBuilder,
) -> Result<T, AppError> {
    let response = request.send().await?;
    let response = ensure_provider_success(provider, response).await?;
    response
        .json::<T>()
        .await
        .map_err(|error| AppError::InvalidProviderResponse(error.to_string()))
}

async fn ensure_provider_success(
    provider: &'static str,
    response: Response,
) -> Result<Response, AppError> {
    let status = response.status();
    if status.is_success() {
        return Ok(response);
    }
    let message = response.text().await?;
    Err(AppError::Upstream {
        provider,
        status: StatusCode::from_u16(status.as_u16())
            .map_err(|error| AppError::InvalidProviderResponse(error.to_string()))?,
        message,
    })
}

fn encrypted_secret(
    ciphertext: Option<&Vec<u8>>,
    nonce: Option<&Vec<u8>>,
    label: &str,
) -> Result<EncryptedSecret, AppError> {
    Ok(EncryptedSecret {
        ciphertext: ciphertext
            .cloned()
            .ok_or_else(|| AppError::Conflict(format!("connector has no {label}")))?,
        nonce: nonce
            .cloned()
            .ok_or_else(|| AppError::Conflict(format!("connector has no {label} nonce")))?,
    })
}

fn parse_scopes(scope: &str) -> Vec<String> {
    scope
        .split([',', ' '])
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .collect()
}

fn required_json_string<'a>(value: &'a Value, field: &str) -> Result<&'a str, AppError> {
    value
        .get(field)
        .and_then(Value::as_str)
        .ok_or_else(|| invalid_provider(&format!("provider response omitted {field}")))
}

fn json_scalar_string(value: &Value, field: &str) -> Result<String, AppError> {
    let value = value
        .get(field)
        .ok_or_else(|| invalid_provider(&format!("provider response omitted {field}")))?;
    match value {
        Value::String(value) => Ok(value.clone()),
        Value::Number(value) => Ok(value.to_string()),
        _ => Err(invalid_provider(&format!(
            "provider response field {field} was not scalar"
        ))),
    }
}

fn invalid_provider(message: &str) -> AppError {
    AppError::InvalidProviderResponse(message.to_owned())
}

fn parse_optional_timestamp(
    value: Option<&Value>,
) -> Result<Option<chrono::DateTime<Utc>>, AppError> {
    value
        .and_then(Value::as_str)
        .map(|timestamp| {
            chrono::DateTime::parse_from_rfc3339(timestamp)
                .map(|value| value.with_timezone(&Utc))
                .map_err(|error| invalid_provider(&error.to_string()))
        })
        .transpose()
}

fn reject_graphql_errors(value: &Value, provider: &'static str) -> Result<(), AppError> {
    if let Some(errors) = value.get("errors") {
        return Err(AppError::Upstream {
            provider,
            status: StatusCode::BAD_GATEWAY,
            message: errors.to_string(),
        });
    }
    Ok(())
}

fn gmail_record(message: &Value) -> Result<ImportedRecord, AppError> {
    let id = required_json_string(message, "id")?;
    let headers = message
        .pointer("/payload/headers")
        .and_then(Value::as_array)
        .ok_or_else(|| invalid_provider("Gmail message omitted metadata headers"))?;
    let header = |name: &str| {
        headers.iter().find_map(|header| {
            (header.get("name").and_then(Value::as_str) == Some(name))
                .then(|| header.get("value").and_then(Value::as_str))
                .flatten()
        })
    };
    let subject = header("Subject");
    let from = header("From");
    let to = header("To");
    let snippet = message.get("snippet").and_then(Value::as_str);
    let observed_at = message
        .get("internalDate")
        .and_then(Value::as_str)
        .map(|milliseconds| {
            milliseconds
                .parse::<i64>()
                .map_err(|error| invalid_provider(&error.to_string()))
                .and_then(|value| {
                    chrono::DateTime::from_timestamp_millis(value).ok_or_else(|| {
                        invalid_provider("Gmail internalDate is outside the timestamp range")
                    })
                })
        })
        .transpose()?;
    let title = subject.map_or_else(|| format!("Email {id}"), |value| format!("Email: {value}"));
    let mut body_markdown = String::new();
    for (label, value) in [("From", from), ("To", to), ("Subject", subject)] {
        if let Some(value) = value {
            body_markdown.push_str(&format!("**{label}:** {value}\n\n"));
        }
    }
    if let Some(snippet) = snippet {
        body_markdown.push_str(snippet);
    }
    Ok(ImportedRecord {
        external_id: id.to_owned(),
        uri: Some(format!("https://mail.google.com/mail/u/0/#all/{id}")),
        title,
        body_markdown,
        payload: message.clone(),
        observed_at,
    })
}

#[cfg(test)]
mod tests {
    use super::{Provider, authorization_url, gmail_record, parse_scopes};
    use crate::config::OAuthClientConfig;

    #[test]
    fn google_authorization_requests_offline_readonly_access() {
        let client = OAuthClientConfig {
            client_id: "client".to_owned(),
            client_secret: "secret".to_owned(),
        };

        let url = authorization_url(
            Provider::Gmail,
            &client,
            "https://life.test/v1/oauth/gmail/callback",
            "state",
        )
        .unwrap();

        assert!(url.as_str().contains("gmail.readonly"));
        assert!(url.as_str().contains("access_type=offline"));
    }

    #[test]
    fn scopes_support_space_and_comma_delimiters() {
        assert_eq!(
            parse_scopes("read:user,repo email"),
            ["read:user", "repo", "email"]
        );
    }

    #[test]
    fn gmail_metadata_becomes_a_provenance_record() {
        let message = serde_json::json!({
            "id": "abc",
            "internalDate": "1700000000000",
            "snippet": "Hello Emil",
            "payload": {"headers": [
                {"name": "Subject", "value": "Planning"},
                {"name": "From", "value": "Ada <ada@example.com>"},
                {"name": "To", "value": "Emil <emil@example.com>"}
            ]}
        });

        let record = gmail_record(&message).unwrap();

        assert_eq!(record.external_id, "abc");
        assert!(record.body_markdown.contains("Hello Emil"));
    }
}
