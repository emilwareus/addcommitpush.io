use std::str::FromStr;

use chrono::Utc;
use hmac::{Hmac, Mac};
use imap::types::Fetch;
use reqwest::{Client, RequestBuilder, Response, StatusCode};
use rustls_connector::RustlsConnector;
use serde::de::DeserializeOwned;
use serde_json::{Value, json};
use sha2::Sha256;
use uuid::Uuid;

use crate::config::Config;
use crate::crypto::{EncryptedSecret, TokenCipher};
use crate::db::Repository;
use crate::error::AppError;
use crate::models::{
    ConnectConnectorRequest, Connector, ConnectorCredential, ConnectorCredentials, ImportedRecord,
    IngestionJob, UpdateConnectorRequest,
};
use crate::openai::OpenAiClient;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Provider {
    GitHub,
    Linear,
    Slack,
    Email,
}

impl Provider {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::GitHub => "github",
            Self::Linear => "linear",
            Self::Slack => "slack",
            Self::Email => "email",
        }
    }
}

impl FromStr for Provider {
    type Err = AppError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value {
            "github" => Ok(Self::GitHub),
            "linear" => Ok(Self::Linear),
            "slack" => Ok(Self::Slack),
            "email" => Ok(Self::Email),
            _ => Err(AppError::InvalidInput(format!(
                "unsupported connector provider: {value}"
            ))),
        }
    }
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

    pub async fn connect(
        &self,
        owner_id: Uuid,
        request: ConnectConnectorRequest,
    ) -> Result<Connector, AppError> {
        validate_label(&request.label)?;
        let provider = Provider::from_str(request.provider.trim())?;
        validate_credential_for_provider(provider, &request.credential)?;
        let identity = self
            .validate_credential_live(provider, &request.credential)
            .await?;
        let connector_id = Uuid::new_v4();
        let encrypted = self.encrypt_credential(connector_id, &request.credential)?;
        let connector = self
            .repository
            .create_connector(
                owner_id,
                connector_id,
                provider.as_str(),
                &request.label,
                &identity.id,
                &identity.name,
                &encrypted,
            )
            .await?;
        self.repository
            .enqueue_connector_sync(owner_id, connector.id)
            .await?;
        Ok(connector)
    }

    pub async fn update(
        &self,
        owner_id: Uuid,
        connector_id: Uuid,
        request: UpdateConnectorRequest,
    ) -> Result<Connector, AppError> {
        if request.label.is_none() && request.credential.is_none() {
            return Err(AppError::InvalidInput(
                "at least one of label or credential must be provided".to_owned(),
            ));
        }
        let mut connector = if let Some(label) = request.label.as_ref() {
            validate_label(label)?;
            Some(
                self.repository
                    .update_connector_label(owner_id, connector_id, label)
                    .await?,
            )
        } else {
            None
        };
        if let Some(credential) = request.credential {
            let existing = self
                .repository
                .connector_credentials(owner_id, connector_id)
                .await?;
            let provider = Provider::from_str(&existing.provider)?;
            validate_credential_for_provider(provider, &credential)?;
            let identity = self.validate_credential_live(provider, &credential).await?;
            let encrypted = self.encrypt_credential(connector_id, &credential)?;
            connector = Some(
                self.repository
                    .update_connector_credential(
                        owner_id,
                        connector_id,
                        &identity.id,
                        &identity.name,
                        &encrypted,
                    )
                    .await?,
            );
            self.repository
                .enqueue_connector_sync(owner_id, connector_id)
                .await?;
        }
        connector.ok_or(AppError::NotFound {
            resource: "connector",
        })
    }

    pub fn credential(
        &self,
        credentials: &ConnectorCredentials,
    ) -> Result<ConnectorCredential, AppError> {
        if !matches!(credentials.status.as_str(), "connected" | "error") {
            return Err(AppError::Conflict("connector is not connected".to_owned()));
        }
        let encrypted = encrypted_secret(
            credentials.credential_ciphertext.as_ref(),
            credentials.credential_nonce.as_ref(),
            "credential",
        )?;
        let plaintext = self.cipher.decrypt(&encrypted, credentials.id.as_bytes())?;
        serde_json::from_str(&plaintext)
            .map_err(|error| AppError::InvalidProviderResponse(error.to_string()))
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
        let organization_id = payload
            .get("organizationId")
            .and_then(Value::as_str)
            .or_else(|| {
                payload
                    .pointer("/data/organizationId")
                    .and_then(Value::as_str)
            });
        let connectors = self
            .repository
            .connected_connectors_for_provider("linear", organization_id)
            .await?;
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

    fn encrypt_credential(
        &self,
        connector_id: Uuid,
        credential: &ConnectorCredential,
    ) -> Result<EncryptedSecret, AppError> {
        let plaintext = serde_json::to_string(credential)
            .map_err(|error| AppError::InvalidProviderResponse(error.to_string()))?;
        self.cipher
            .encrypt(&plaintext, connector_id.as_bytes())
            .map_err(AppError::from)
    }

    async fn validate_credential_live(
        &self,
        provider: Provider,
        credential: &ConnectorCredential,
    ) -> Result<ExternalIdentity, AppError> {
        match provider {
            Provider::GitHub => {
                let ConnectorCredential::ApiKey { api_key } = credential else {
                    return Err(AppError::InvalidInput(
                        "GitHub requires an API key credential".to_owned(),
                    ));
                };
                self.github_identity(api_key).await
            }
            Provider::Linear => {
                let ConnectorCredential::ApiKey { api_key } = credential else {
                    return Err(AppError::InvalidInput(
                        "Linear requires an API key credential".to_owned(),
                    ));
                };
                self.linear_identity(api_key).await
            }
            Provider::Slack => {
                let ConnectorCredential::ApiKey { api_key } = credential else {
                    return Err(AppError::InvalidInput(
                        "Slack requires a bot token credential".to_owned(),
                    ));
                };
                self.slack_identity(api_key).await
            }
            Provider::Email => {
                let ConnectorCredential::Imap {
                    username,
                    password,
                    imap_host,
                    imap_port,
                } = credential
                else {
                    return Err(AppError::InvalidInput(
                        "email requires an IMAP credential".to_owned(),
                    ));
                };
                self.imap_identity(username, password, imap_host, *imap_port)
                    .await
            }
        }
    }

    async fn github_identity(&self, token: &str) -> Result<ExternalIdentity, AppError> {
        let value: Value = provider_json(
            "github",
            self.http
                .get("https://api.github.com/user")
                .bearer_auth(token)
                .header("Accept", "application/vnd.github+json")
                .header("X-GitHub-Api-Version", "2026-03-10"),
        )
        .await?;
        Ok(ExternalIdentity {
            id: json_scalar_string(&value, "id")?,
            name: required_json_string(&value, "login")?.to_owned(),
        })
    }

    async fn linear_identity(&self, token: &str) -> Result<ExternalIdentity, AppError> {
        let value: Value = provider_json(
            "linear",
            self.http
                .post("https://api.linear.app/graphql")
                .bearer_auth(token)
                .json(&json!({
                    "query": "query LifeViewer { viewer { id name email organization { id name } } }"
                })),
        )
        .await?;
        reject_graphql_errors(&value, "linear")?;
        let viewer = value
            .pointer("/data/viewer")
            .ok_or_else(|| invalid_provider("Linear response omitted viewer"))?;
        let organization = viewer
            .get("organization")
            .ok_or_else(|| invalid_provider("Linear response omitted organization"))?;
        Ok(ExternalIdentity {
            id: required_json_string(organization, "id")?.to_owned(),
            name: required_json_string(organization, "name")?.to_owned(),
        })
    }

    async fn slack_identity(&self, token: &str) -> Result<ExternalIdentity, AppError> {
        let value: Value = provider_json(
            "slack",
            self.http
                .post("https://slack.com/api/auth.test")
                .bearer_auth(token)
                .header("Content-Type", "application/x-www-form-urlencoded"),
        )
        .await?;
        ensure_slack_ok(&value)?;
        Ok(ExternalIdentity {
            id: required_json_string(&value, "team_id")?.to_owned(),
            name: required_json_string(&value, "team")?.to_owned(),
        })
    }

    async fn imap_identity(
        &self,
        username: &str,
        password: &str,
        imap_host: &str,
        imap_port: u16,
    ) -> Result<ExternalIdentity, AppError> {
        let username = username.to_owned();
        let password = password.to_owned();
        let imap_host = imap_host.to_owned();
        tokio::task::spawn_blocking(move || {
            let client = imap_client(&imap_host, imap_port)?;
            client
                .login(&username, &password)
                .map_err(|(error, _)| AppError::Upstream {
                    provider: "email",
                    status: StatusCode::UNAUTHORIZED,
                    message: error.to_string(),
                })?;
            Ok(ExternalIdentity {
                id: username.clone(),
                name: username,
            })
        })
        .await
        .map_err(|error| AppError::InvalidProviderResponse(error.to_string()))?
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
        let credentials = self
            .repository
            .connector_credentials(job.owner_id, connector_id)
            .await?;
        let credential = self.connectors.credential(&credentials)?;
        let provider = Provider::from_str(&credentials.provider)?;
        let (records, cursor) = self
            .fetch_records(
                provider,
                &credential,
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
        credential: &ConnectorCredential,
        cursor: &Value,
        external_account_name: Option<&str>,
    ) -> Result<(Vec<ImportedRecord>, Value), AppError> {
        match provider {
            Provider::GitHub => {
                let ConnectorCredential::ApiKey { api_key } = credential else {
                    return Err(AppError::Conflict(
                        "GitHub connector has no API key credential".to_owned(),
                    ));
                };
                let login = external_account_name.ok_or_else(|| {
                    AppError::InvalidInput("GitHub connector has no account login".to_owned())
                })?;
                self.fetch_github(api_key, cursor, login).await
            }
            Provider::Linear => {
                let ConnectorCredential::ApiKey { api_key } = credential else {
                    return Err(AppError::Conflict(
                        "Linear connector has no API key credential".to_owned(),
                    ));
                };
                self.fetch_linear(api_key, cursor).await
            }
            Provider::Slack => {
                let ConnectorCredential::ApiKey { api_key } = credential else {
                    return Err(AppError::Conflict(
                        "Slack connector has no bot token credential".to_owned(),
                    ));
                };
                self.fetch_slack(api_key, cursor).await
            }
            Provider::Email => {
                let ConnectorCredential::Imap {
                    username,
                    password,
                    imap_host,
                    imap_port,
                } = credential
                else {
                    return Err(AppError::Conflict(
                        "email connector has no IMAP credential".to_owned(),
                    ));
                };
                self.fetch_email(username, password, imap_host, *imap_port, cursor)
                    .await
            }
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
            let mut events_url = url::Url::parse("https://api.github.com/users/")
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

    async fn fetch_slack(
        &self,
        token: &str,
        cursor: &Value,
    ) -> Result<(Vec<ImportedRecord>, Value), AppError> {
        let prior_channels = cursor
            .get("channels")
            .and_then(Value::as_object)
            .cloned()
            .unwrap_or_default();
        let mut next_channels = prior_channels.clone();
        let mut records = Vec::new();
        let mut channel_cursor: Option<String> = None;
        for _ in 0..5 {
            let mut request = self
                .http
                .get("https://slack.com/api/conversations.list")
                .bearer_auth(token)
                .query(&[
                    ("types", "public_channel,private_channel"),
                    ("limit", "100"),
                ]);
            if let Some(cursor_value) = &channel_cursor {
                request = request.query(&[("cursor", cursor_value.as_str())]);
            }
            let response: Value = provider_json("slack", request).await?;
            ensure_slack_ok(&response)?;
            let channels = response
                .get("channels")
                .and_then(Value::as_array)
                .ok_or_else(|| invalid_provider("Slack response omitted channels"))?;
            for channel in channels {
                let channel_id = required_json_string(channel, "id")?.to_owned();
                let channel_name = required_json_string(channel, "name")?.to_owned();
                let prior_ts = prior_channels.get(&channel_id).and_then(Value::as_str);
                let mut history_cursor: Option<String> = None;
                let mut newest_ts = prior_ts.map(ToOwned::to_owned);
                for _ in 0..3 {
                    let mut history_request = self
                        .http
                        .get("https://slack.com/api/conversations.history")
                        .bearer_auth(token)
                        .query(&[("channel", channel_id.as_str()), ("limit", "100")]);
                    if let Some(oldest) = prior_ts {
                        history_request = history_request.query(&[("oldest", oldest)]);
                    }
                    if let Some(cursor_value) = &history_cursor {
                        history_request =
                            history_request.query(&[("cursor", cursor_value.as_str())]);
                    }
                    let history: Value = provider_json("slack", history_request).await?;
                    ensure_slack_ok(&history)?;
                    let messages = history
                        .get("messages")
                        .and_then(Value::as_array)
                        .ok_or_else(|| invalid_provider("Slack history omitted messages"))?;
                    for message in messages {
                        let ts = required_json_string(message, "ts")?.to_owned();
                        if prior_ts.is_some_and(|value| ts.as_str() <= value) {
                            continue;
                        }
                        if newest_ts.as_deref().is_none_or(|value| ts.as_str() > value) {
                            newest_ts = Some(ts.clone());
                        }
                        let text = message.get("text").and_then(Value::as_str).unwrap_or("");
                        let user = message
                            .get("user")
                            .and_then(Value::as_str)
                            .unwrap_or("unknown");
                        records.push(ImportedRecord {
                            external_id: format!("{channel_id}:{ts}"),
                            uri: None,
                            title: format!("Slack #{channel_name}"),
                            body_markdown: format!("**{user}** in #{channel_name}: {text}"),
                            payload: message.clone(),
                            observed_at: parse_slack_timestamp(&ts)?,
                        });
                    }
                    let next = history
                        .pointer("/response_metadata/next_cursor")
                        .and_then(Value::as_str)
                        .filter(|value| !value.is_empty());
                    history_cursor = next.map(ToOwned::to_owned);
                    if history_cursor.is_none() {
                        break;
                    }
                }
                if let Some(ts) = newest_ts.or_else(|| prior_ts.map(ToOwned::to_owned)) {
                    next_channels.insert(channel_id, Value::String(ts));
                }
            }
            let next = response
                .pointer("/response_metadata/next_cursor")
                .and_then(Value::as_str)
                .filter(|value| !value.is_empty());
            channel_cursor = next.map(ToOwned::to_owned);
            if channel_cursor.is_none() {
                break;
            }
        }
        Ok((records, json!({"channels": next_channels})))
    }

    async fn fetch_email(
        &self,
        username: &str,
        password: &str,
        imap_host: &str,
        imap_port: u16,
        cursor: &Value,
    ) -> Result<(Vec<ImportedRecord>, Value), AppError> {
        let prior_uidvalidity = cursor.get("uidvalidity").and_then(Value::as_u64);
        let prior_uid = cursor.get("uid").and_then(Value::as_u64);
        let username = username.to_owned();
        let password = password.to_owned();
        let imap_host = imap_host.to_owned();
        let fetched = tokio::task::spawn_blocking(move || {
            fetch_email_blocking(
                &username,
                &password,
                &imap_host,
                imap_port,
                prior_uidvalidity,
                prior_uid,
            )
        })
        .await
        .map_err(|error| AppError::InvalidProviderResponse(error.to_string()))??;
        Ok(fetched)
    }
}

fn imap_client(
    imap_host: &str,
    imap_port: u16,
) -> Result<imap::Client<rustls_connector::TlsStream<std::net::TcpStream>>, AppError> {
    use std::net::TcpStream;
    let stream =
        TcpStream::connect((imap_host, imap_port)).map_err(|error| AppError::Upstream {
            provider: "email",
            status: StatusCode::BAD_GATEWAY,
            message: error.to_string(),
        })?;
    let tls =
        RustlsConnector::new_with_platform_verifier().map_err(|error| AppError::Upstream {
            provider: "email",
            status: StatusCode::BAD_GATEWAY,
            message: error.to_string(),
        })?;
    let tls_stream = tls
        .connect(imap_host, stream)
        .map_err(|error| AppError::Upstream {
            provider: "email",
            status: StatusCode::BAD_GATEWAY,
            message: error.to_string(),
        })?;
    let mut client = imap::Client::new(tls_stream);
    client.read_greeting().map_err(|error| AppError::Upstream {
        provider: "email",
        status: StatusCode::BAD_GATEWAY,
        message: error.to_string(),
    })?;
    Ok(client)
}

fn fetch_email_blocking(
    username: &str,
    password: &str,
    imap_host: &str,
    imap_port: u16,
    prior_uidvalidity: Option<u64>,
    prior_uid: Option<u64>,
) -> Result<(Vec<ImportedRecord>, Value), AppError> {
    let client = imap_client(imap_host, imap_port)?;
    let mut session =
        client
            .login(username, password)
            .map_err(|(error, _)| AppError::Upstream {
                provider: "email",
                status: StatusCode::UNAUTHORIZED,
                message: error.to_string(),
            })?;
    let mailbox = session
        .select("INBOX")
        .map_err(|error| AppError::Upstream {
            provider: "email",
            status: StatusCode::BAD_GATEWAY,
            message: error.to_string(),
        })?;
    let uidvalidity = u64::from(
        mailbox
            .uid_validity
            .ok_or_else(|| invalid_provider("IMAP mailbox omitted UIDVALIDITY"))?,
    );
    let search_from_uid = if prior_uidvalidity == Some(uidvalidity) {
        prior_uid.map_or(1, |uid| uid.saturating_add(1))
    } else {
        1_u64
    };
    let uid_set = if search_from_uid == 1 {
        "1:*".to_owned()
    } else {
        format!("{search_from_uid}:*")
    };
    let messages = session
        .fetch(
            uid_set,
            "(UID BODY.PEEK[HEADER.FIELDS (SUBJECT FROM TO DATE)] BODY.PEEK[TEXT]<0.512>)",
        )
        .map_err(|error| AppError::Upstream {
            provider: "email",
            status: StatusCode::BAD_GATEWAY,
            message: error.to_string(),
        })?;
    let mut records = Vec::new();
    let mut highest_uid = prior_uid.unwrap_or(0);
    for message in messages.iter() {
        let uid = message
            .uid
            .ok_or_else(|| invalid_provider("IMAP message omitted UID"))?;
        highest_uid = highest_uid.max(u64::from(uid));
        records.push(imap_record(message, uid)?);
    }
    let _ = session.logout();
    Ok((
        records,
        json!({"uidvalidity": uidvalidity, "uid": highest_uid}),
    ))
}

fn imap_record(message: &Fetch, uid: u32) -> Result<ImportedRecord, AppError> {
    let header = message.header().unwrap_or_default();
    let header_text = std::str::from_utf8(header).unwrap_or_default();
    let subject = header_field(header_text, "Subject");
    let from = header_field(header_text, "From");
    let to = header_field(header_text, "To");
    let date = header_field(header_text, "Date");
    let snippet = message
        .body()
        .map(|bytes| std::str::from_utf8(bytes).unwrap_or_default().trim())
        .filter(|value| !value.is_empty());
    let external_id = format!("{uid}");
    let title = subject
        .as_deref()
        .map(|value| format!("Email: {value}"))
        .unwrap_or_else(|| format!("Email UID {uid}"));
    let mut body_markdown = String::new();
    for (label, value) in [
        ("From", from.as_deref()),
        ("To", to.as_deref()),
        ("Subject", subject.as_deref()),
        ("Date", date.as_deref()),
    ] {
        if let Some(value) = value {
            body_markdown.push_str(&format!("**{label}:** {value}\n\n"));
        }
    }
    if let Some(snippet) = snippet {
        body_markdown.push_str(snippet);
    }
    Ok(ImportedRecord {
        external_id,
        uri: None,
        title,
        body_markdown,
        payload: json!({
            "uid": uid,
            "subject": subject,
            "from": from,
            "to": to,
            "date": date,
            "snippet": snippet,
        }),
        observed_at: date.as_deref().and_then(parse_email_date),
    })
}

fn header_field(headers: &str, name: &str) -> Option<String> {
    headers.lines().find_map(|line| {
        let (field, value) = line.split_once(':')?;
        (field.trim().eq_ignore_ascii_case(name)).then(|| value.trim().to_owned())
    })
}

fn parse_email_date(value: &str) -> Option<chrono::DateTime<Utc>> {
    chrono::DateTime::parse_from_rfc2822(value)
        .ok()
        .map(|date| date.with_timezone(&Utc))
        .or_else(|| {
            chrono::DateTime::parse_from_rfc3339(value)
                .ok()
                .map(|date| date.with_timezone(&Utc))
        })
}

fn validate_label(label: &str) -> Result<(), AppError> {
    if label.trim().is_empty() {
        return Err(AppError::InvalidInput("label cannot be empty".to_owned()));
    }
    Ok(())
}

fn validate_credential_for_provider(
    provider: Provider,
    credential: &ConnectorCredential,
) -> Result<(), AppError> {
    match provider {
        Provider::GitHub | Provider::Linear => {
            let ConnectorCredential::ApiKey { api_key } = credential else {
                return Err(AppError::InvalidInput(format!(
                    "{} requires an API key credential",
                    provider.as_str()
                )));
            };
            if api_key.trim().is_empty() {
                return Err(AppError::InvalidInput("api_key cannot be empty".to_owned()));
            }
        }
        Provider::Slack => {
            let ConnectorCredential::ApiKey { api_key } = credential else {
                return Err(AppError::InvalidInput(
                    "slack requires a bot token credential".to_owned(),
                ));
            };
            if !api_key.starts_with("xoxb-") {
                return Err(AppError::InvalidInput(
                    "slack bot token must start with xoxb-".to_owned(),
                ));
            }
        }
        Provider::Email => {
            let ConnectorCredential::Imap {
                username,
                password,
                imap_host,
                imap_port,
            } = credential
            else {
                return Err(AppError::InvalidInput(
                    "email requires an IMAP credential".to_owned(),
                ));
            };
            if username.trim().is_empty()
                || password.trim().is_empty()
                || imap_host.trim().is_empty()
            {
                return Err(AppError::InvalidInput(
                    "IMAP username, password, and host cannot be empty".to_owned(),
                ));
            }
            if *imap_port == 0 {
                return Err(AppError::InvalidInput(
                    "IMAP port must be greater than zero".to_owned(),
                ));
            }
        }
    }
    Ok(())
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

fn parse_slack_timestamp(ts: &str) -> Result<Option<chrono::DateTime<Utc>>, AppError> {
    let seconds = ts
        .split('.')
        .next()
        .ok_or_else(|| invalid_provider("Slack timestamp was empty"))?
        .parse::<i64>()
        .map_err(|error| invalid_provider(&error.to_string()))?;
    Ok(chrono::DateTime::from_timestamp(seconds, 0))
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

fn ensure_slack_ok(value: &Value) -> Result<(), AppError> {
    if value.get("ok").and_then(Value::as_bool) != Some(true) {
        let message = value
            .get("error")
            .and_then(Value::as_str)
            .unwrap_or("unknown Slack error");
        return Err(AppError::Upstream {
            provider: "slack",
            status: StatusCode::BAD_GATEWAY,
            message: message.to_owned(),
        });
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{Provider, validate_credential_for_provider};
    use crate::models::ConnectorCredential;

    #[test]
    fn slack_requires_bot_token_prefix() {
        let result = validate_credential_for_provider(
            Provider::Slack,
            &ConnectorCredential::ApiKey {
                api_key: "xoxp-not-a-bot".to_owned(),
            },
        );

        assert!(result.is_err());
    }

    #[test]
    fn email_requires_imap_fields() {
        let result = validate_credential_for_provider(
            Provider::Email,
            &ConnectorCredential::Imap {
                username: "user".to_owned(),
                password: "pass".to_owned(),
                imap_host: "imap.example.com".to_owned(),
                imap_port: 993,
            },
        );

        assert!(result.is_ok());
    }
}
