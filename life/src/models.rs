use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct Owner {
    pub id: Uuid,
    pub display_name: String,
    pub timezone: String,
    pub locale: String,
    pub profile_markdown: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateOwnerRequest {
    pub display_name: String,
    pub timezone: String,
    pub locale: String,
    pub profile_markdown: String,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct Memory {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub kind: String,
    pub title: String,
    pub body_markdown: String,
    pub document_path: Option<String>,
    pub domain: String,
    pub subject: Option<String>,
    pub predicate: Option<String>,
    pub object_value: Option<Value>,
    pub epistemic_status: String,
    pub confidence: f64,
    pub importance: i16,
    pub occurred_start: Option<DateTime<Utc>>,
    pub occurred_end: Option<DateTime<Utc>>,
    pub temporal_precision: String,
    pub source_id: Option<Uuid>,
    pub source_message_id: Option<Uuid>,
    pub evidence_excerpt: Option<String>,
    pub derived_from_id: Option<Uuid>,
    pub supersedes_id: Option<Uuid>,
    pub superseded_at: Option<DateTime<Utc>>,
    pub recorded_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MemoryInput {
    pub kind: String,
    pub title: String,
    pub body_markdown: String,
    pub document_path: Option<String>,
    pub domain: String,
    pub subject: Option<String>,
    pub predicate: Option<String>,
    pub object_value: Option<Value>,
    #[serde(default = "default_user_stated")]
    pub epistemic_status: String,
    #[serde(default = "default_confidence")]
    pub confidence: f64,
    #[serde(default = "default_importance")]
    pub importance: i16,
    pub occurred_start: Option<DateTime<Utc>>,
    pub occurred_end: Option<DateTime<Utc>>,
    #[serde(default = "default_temporal_precision")]
    pub temporal_precision: String,
    pub source_id: Option<Uuid>,
    pub source_message_id: Option<Uuid>,
    pub evidence_excerpt: Option<String>,
    pub derived_from_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct ListMemoriesQuery {
    pub kind: Option<String>,
    pub domain: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
}

#[derive(Debug, Deserialize)]
pub struct SearchRequest {
    pub query: String,
    #[serde(default = "default_search_limit")]
    pub limit: i64,
}

#[derive(Debug, Deserialize)]
pub struct TimelineQuery {
    pub start: Option<DateTime<Utc>>,
    pub end: Option<DateTime<Utc>>,
    pub domain: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: i64,
}

#[derive(Debug, Deserialize)]
pub struct MarkdownDocumentInput {
    pub title: String,
    pub body_markdown: String,
    pub domain: String,
    pub occurred_start: Option<DateTime<Utc>>,
    pub occurred_end: Option<DateTime<Utc>>,
    #[serde(default = "default_temporal_precision")]
    pub temporal_precision: String,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct SearchHit {
    pub id: Uuid,
    pub kind: String,
    pub title: String,
    pub body_markdown: String,
    pub domain: String,
    pub occurred_start: Option<DateTime<Utc>>,
    pub epistemic_status: String,
    pub source_id: Option<Uuid>,
    pub score: f64,
}

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct Conversation {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub mode: String,
    pub title: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateConversationRequest {
    #[serde(default = "default_conversation_mode")]
    pub mode: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct RealtimeSession {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub conversation_id: Uuid,
    pub openai_session_id: String,
    pub status: String,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub closed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRealtimeSessionRequest {
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RealtimeClientSecret {
    pub value: String,
    pub expires_at: i64,
    pub session: Value,
}

#[derive(Debug, Serialize)]
pub struct CreateRealtimeSessionResponse {
    pub realtime_session: RealtimeSession,
    pub conversation: Conversation,
    pub client_secret: RealtimeClientSecret,
}

#[derive(Debug, Deserialize)]
pub struct RealtimeMemorySearchRequest {
    pub query: String,
    #[serde(default = "default_search_limit")]
    pub limit: i64,
}

#[derive(Debug, Deserialize)]
pub struct RealtimeMemoryRecordRequest {
    pub kind: String,
    pub title: String,
    pub body_markdown: String,
    pub domain: String,
    pub occurred_start: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct RealtimeMemoryExploreRequest {
    pub kind: Option<String>,
    pub domain: Option<String>,
    #[serde(default = "default_search_limit")]
    pub limit: i64,
}

#[derive(Debug, Deserialize)]
pub struct RealtimeTurnRequest {
    pub user_transcript: String,
    pub assistant_transcript: String,
    pub provider_response_id: String,
    #[serde(default)]
    pub cited_memory_ids: Vec<Uuid>,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct Message {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub conversation_id: Uuid,
    pub role: String,
    pub content: String,
    pub input_modality: String,
    pub provider_response_id: Option<String>,
    pub cited_memory_ids: Vec<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ConversationTurnRequest {
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMemoryCandidate {
    pub kind: String,
    pub title: String,
    pub body_markdown: String,
    pub domain: String,
    pub subject: Option<String>,
    pub predicate: Option<String>,
    pub object_value: Option<Value>,
    pub confidence: f64,
    pub importance: i16,
    pub occurred_start: Option<DateTime<Utc>>,
    pub occurred_end: Option<DateTime<Utc>>,
    pub temporal_precision: String,
    pub evidence_excerpt: String,
}

impl AgentMemoryCandidate {
    pub fn into_memory_input(self, source_message_id: Uuid) -> MemoryInput {
        MemoryInput {
            kind: self.kind,
            title: self.title,
            body_markdown: self.body_markdown,
            document_path: None,
            domain: self.domain,
            subject: self.subject,
            predicate: self.predicate,
            object_value: self.object_value,
            epistemic_status: "user_stated".to_owned(),
            confidence: self.confidence,
            importance: self.importance,
            occurred_start: self.occurred_start,
            occurred_end: self.occurred_end,
            temporal_precision: self.temporal_precision,
            source_id: None,
            source_message_id: Some(source_message_id),
            evidence_excerpt: Some(self.evidence_excerpt),
            derived_from_id: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResponse {
    pub answer: String,
    pub memory_candidates: Vec<AgentMemoryCandidate>,
    pub cited_memory_ids: Vec<Uuid>,
    pub follow_up_question: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ConversationTurnResponse {
    pub user_message: Message,
    pub assistant_message: Message,
    pub created_memories: Vec<Memory>,
    pub answer: String,
    pub follow_up_question: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct VoiceTurnResponse {
    pub transcript: String,
    pub turn: ConversationTurnResponse,
    pub audio_base64: String,
    pub audio_media_type: &'static str,
}

#[derive(Debug, Deserialize)]
pub struct ResearchRequest {
    pub query: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResearchMemoryCandidate {
    pub title: String,
    pub body_markdown: String,
    pub domain: String,
    pub subject: Option<String>,
    pub predicate: Option<String>,
    pub object_value: Option<Value>,
    pub confidence: f64,
    pub importance: i16,
    pub occurred_start: Option<DateTime<Utc>>,
    pub occurred_end: Option<DateTime<Utc>>,
    pub temporal_precision: String,
    pub evidence_excerpt: String,
    pub source_urls: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResearchExtraction {
    pub memories: Vec<ResearchMemoryCandidate>,
}

#[derive(Debug, Serialize)]
pub struct ResearchCitation {
    pub url: String,
    pub title: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ResearchResponse {
    pub report_markdown: String,
    pub citations: Vec<ResearchCitation>,
    pub memories: Vec<Memory>,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct Connector {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub provider: String,
    pub external_account_id: Option<String>,
    pub external_account_name: Option<String>,
    pub status: String,
    pub scopes: Vec<String>,
    pub token_expires_at: Option<DateTime<Utc>>,
    pub sync_cursor: Value,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub last_error: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, sqlx::FromRow)]
pub struct ConnectorCredentials {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub provider: String,
    pub external_account_name: Option<String>,
    pub status: String,
    pub access_token_ciphertext: Option<Vec<u8>>,
    pub access_token_nonce: Option<Vec<u8>>,
    pub refresh_token_ciphertext: Option<Vec<u8>>,
    pub refresh_token_nonce: Option<Vec<u8>>,
    pub token_expires_at: Option<DateTime<Utc>>,
    pub sync_cursor: Value,
}

#[derive(Debug, Serialize)]
pub struct OAuthStartResponse {
    pub provider: String,
    pub authorization_url: String,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct IngestionJob {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub connector_id: Option<Uuid>,
    pub job_kind: String,
    pub payload: Value,
    pub status: String,
    pub attempts: i32,
    pub available_at: DateTime<Utc>,
    pub locked_at: Option<DateTime<Utc>>,
    pub locked_by: Option<String>,
    pub last_error: Option<String>,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct AuditEvent {
    pub id: Uuid,
    pub owner_id: Option<Uuid>,
    pub action: String,
    pub resource_kind: String,
    pub resource_id: Option<Uuid>,
    pub metadata: Value,
    pub occurred_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct ImportedRecord {
    pub external_id: String,
    pub uri: Option<String>,
    pub title: String,
    pub payload: Value,
    pub body_markdown: String,
    pub observed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct SourceRecord {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub source_kind: String,
    pub external_id: String,
    pub uri: Option<String>,
    pub title: Option<String>,
    pub payload: Value,
    pub content_hash: String,
    pub observed_at: Option<DateTime<Utc>>,
    pub imported_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct OwnerExport {
    pub exported_at: DateTime<Utc>,
    pub owner: Owner,
    pub memories: Vec<Memory>,
    pub source_records: Vec<SourceRecord>,
    pub conversations: Vec<Conversation>,
    pub realtime_sessions: Vec<RealtimeSession>,
    pub messages: Vec<Message>,
    pub connectors: Vec<Connector>,
    pub ingestion_jobs: Vec<IngestionJob>,
    pub health_measurements: Vec<HealthMeasurement>,
    pub audit_events: Vec<AuditEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct HealthMeasurement {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub source_id: Option<Uuid>,
    pub metric_code: String,
    pub value: f64,
    pub unit: String,
    pub measured_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub dimensions: Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct HealthMeasurementInput {
    pub source_id: Option<Uuid>,
    pub metric_code: String,
    pub value: f64,
    pub unit: String,
    pub measured_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    #[serde(default = "empty_json_object")]
    pub dimensions: Value,
}

fn empty_json_object() -> Value {
    Value::Object(serde_json::Map::new())
}

fn default_user_stated() -> String {
    "user_stated".to_owned()
}

const fn default_confidence() -> f64 {
    1.0
}

const fn default_importance() -> i16 {
    5
}

fn default_temporal_precision() -> String {
    "unknown".to_owned()
}

const fn default_limit() -> i64 {
    50
}

const fn default_search_limit() -> i64 {
    12
}

fn default_conversation_mode() -> String {
    "conversation".to_owned()
}
