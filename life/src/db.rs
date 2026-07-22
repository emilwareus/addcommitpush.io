use chrono::{DateTime, Utc};
use sha2::{Digest, Sha256};
use sqlx::postgres::PgPool;
use sqlx::{Postgres, Transaction};
use uuid::Uuid;

use crate::crypto::EncryptedSecret;
use crate::error::AppError;
use crate::models::{
    AgentResponse, AuditEvent, Connector, ConnectorCredentials, Conversation,
    ConversationTurnResponse, CreateConversationRequest, HealthMeasurement, HealthMeasurementInput,
    ImportedRecord, IngestionJob, ListMemoriesQuery, Memory, MemoryInput, Message, Owner,
    OwnerExport, RealtimeSession, ResearchMemoryCandidate, SearchHit, SourceRecord, TimelineQuery,
    UpdateOwnerRequest,
};

const GET_MEMORY_SQL: &str = r#"
    SELECT id, owner_id, kind, title, body_markdown, document_path, domain,
           subject, predicate, object_value, epistemic_status, confidence,
           importance, occurred_start, occurred_end,
           temporal_precision, source_id, source_message_id, evidence_excerpt,
           derived_from_id, supersedes_id, superseded_at, recorded_at, updated_at
    FROM memories
    WHERE owner_id = $1 AND id = $2
"#;

const LIST_MEMORIES_SQL: &str = r#"
    SELECT id, owner_id, kind, title, body_markdown, document_path, domain,
           subject, predicate, object_value, epistemic_status, confidence,
           importance, occurred_start, occurred_end,
           temporal_precision, source_id, source_message_id, evidence_excerpt,
           derived_from_id, supersedes_id, superseded_at, recorded_at, updated_at
    FROM memories
    WHERE owner_id = $1
      AND superseded_at IS NULL
      AND epistemic_status <> 'retracted'
      AND ($2::text IS NULL OR kind = $2)
      AND ($3::text IS NULL OR domain = $3)
    ORDER BY occurred_start DESC NULLS LAST, recorded_at DESC
    LIMIT $4 OFFSET $5
"#;

const INSERT_MEMORY_SQL: &str = r#"
    INSERT INTO memories (
        owner_id, kind, title, body_markdown, document_path, domain,
        subject, predicate, object_value, epistemic_status, confidence,
        importance, occurred_start, occurred_end,
        temporal_precision, source_id, source_message_id, evidence_excerpt,
        derived_from_id, supersedes_id, embedding
    )
    VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21::vector
    )
    RETURNING id, owner_id, kind, title, body_markdown, document_path, domain,
              subject, predicate, object_value, epistemic_status, confidence,
              importance, occurred_start, occurred_end,
              temporal_precision, source_id, source_message_id,
              evidence_excerpt, derived_from_id, supersedes_id, superseded_at,
              recorded_at, updated_at
"#;

#[derive(Clone)]
pub struct Repository {
    pool: PgPool,
}

impl Repository {
    pub const fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub const fn pool(&self) -> &PgPool {
        &self.pool
    }

    pub async fn ready(&self) -> Result<(), AppError> {
        sqlx::query("SELECT 1").execute(&self.pool).await?;
        Ok(())
    }

    pub async fn authenticate_api_token(&self, token: &str) -> Result<Uuid, AppError> {
        if token.len() < 32 {
            return Err(AppError::Unauthorized);
        }
        let token_hash = Sha256::digest(token.as_bytes());
        sqlx::query_scalar::<_, Uuid>(
            r"
            SELECT owner_id
            FROM api_credentials
            WHERE token_hash = $1
              AND revoked_at IS NULL
              AND (expires_at IS NULL OR expires_at > now())
            ",
        )
        .bind(token_hash.as_slice())
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::Unauthorized)
    }

    pub async fn owner(&self, owner_id: Uuid) -> Result<Owner, AppError> {
        sqlx::query_as::<_, Owner>(
            r#"
            SELECT id, display_name, timezone, locale, profile_markdown,
                   created_at, updated_at
            FROM owners
            WHERE id = $1
            "#,
        )
        .bind(owner_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::NotFound { resource: "owner" })
    }

    pub async fn update_owner(
        &self,
        owner_id: Uuid,
        request: &UpdateOwnerRequest,
    ) -> Result<Owner, AppError> {
        validate_nonempty("display name", &request.display_name)?;
        validate_nonempty("timezone", &request.timezone)?;
        validate_nonempty("locale", &request.locale)?;
        let mut transaction = self.pool.begin().await?;
        let owner = sqlx::query_as::<_, Owner>(
            r"
            UPDATE owners
            SET display_name = $1, timezone = $2, locale = $3,
                profile_markdown = $4, updated_at = now()
            WHERE id = $5
            RETURNING id, display_name, timezone, locale, profile_markdown,
                      created_at, updated_at
            ",
        )
        .bind(request.display_name.trim())
        .bind(request.timezone.trim())
        .bind(request.locale.trim())
        .bind(&request.profile_markdown)
        .bind(owner_id)
        .fetch_optional(&mut *transaction)
        .await?
        .ok_or(AppError::NotFound { resource: "owner" })?;
        audit(
            &mut transaction,
            Some(owner.id),
            "owner.updated",
            "owner",
            Some(owner.id),
            &serde_json::json!({}),
        )
        .await?;
        transaction.commit().await?;
        Ok(owner)
    }

    pub async fn create_memory(
        &self,
        owner_id: Uuid,
        input: &MemoryInput,
        embedding: &[f32],
    ) -> Result<Memory, AppError> {
        validate_memory(input)?;
        validate_embedding(embedding)?;
        let embedding = crate::openai::vector_literal(embedding);
        let mut transaction = self.pool.begin().await?;
        let memory = insert_memory(&mut *transaction, owner_id, input, &embedding, None).await?;
        audit(
            &mut transaction,
            Some(owner_id),
            "memory.created",
            "memory",
            Some(memory.id),
            &serde_json::json!({"kind": memory.kind}),
        )
        .await?;
        transaction.commit().await?;
        Ok(memory)
    }

    pub async fn memory(&self, owner_id: Uuid, memory_id: Uuid) -> Result<Memory, AppError> {
        sqlx::query_as::<_, Memory>(GET_MEMORY_SQL)
            .bind(owner_id)
            .bind(memory_id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or(AppError::NotFound { resource: "memory" })
    }

    pub async fn list_memories(
        &self,
        owner_id: Uuid,
        query: &ListMemoriesQuery,
    ) -> Result<Vec<Memory>, AppError> {
        if !(1..=200).contains(&query.limit) {
            return Err(AppError::InvalidInput(
                "limit must be between 1 and 200".to_owned(),
            ));
        }
        if query.offset < 0 {
            return Err(AppError::InvalidInput(
                "offset cannot be negative".to_owned(),
            ));
        }
        sqlx::query_as::<_, Memory>(LIST_MEMORIES_SQL)
            .bind(owner_id)
            .bind(query.kind.as_deref())
            .bind(query.domain.as_deref())
            .bind(query.limit)
            .bind(query.offset)
            .fetch_all(&self.pool)
            .await
            .map_err(AppError::from)
    }

    pub async fn timeline(
        &self,
        owner_id: Uuid,
        query: &TimelineQuery,
    ) -> Result<Vec<Memory>, AppError> {
        if !(1..=500).contains(&query.limit) {
            return Err(AppError::InvalidInput(
                "timeline limit must be between 1 and 500".to_owned(),
            ));
        }
        if let (Some(start), Some(end)) = (query.start, query.end)
            && end <= start
        {
            return Err(AppError::InvalidInput(
                "timeline end must follow its start".to_owned(),
            ));
        }
        sqlx::query_as::<_, Memory>(
            r"
            SELECT id, owner_id, kind, title, body_markdown, document_path, domain,
                   subject, predicate, object_value, epistemic_status, confidence,
                   importance, occurred_start, occurred_end,
                   temporal_precision, source_id, source_message_id, evidence_excerpt,
                   derived_from_id, supersedes_id, superseded_at, recorded_at, updated_at
            FROM memories
            WHERE owner_id = $1
              AND superseded_at IS NULL
              AND epistemic_status <> 'retracted'
              AND ($2::timestamptz IS NULL OR occurred_start >= $2)
              AND ($3::timestamptz IS NULL OR occurred_start < $3)
              AND ($4::text IS NULL OR domain = $4)
            ORDER BY occurred_start DESC NULLS LAST, recorded_at DESC
            LIMIT $5
            ",
        )
        .bind(owner_id)
        .bind(query.start)
        .bind(query.end)
        .bind(query.domain.as_deref())
        .bind(query.limit)
        .fetch_all(&self.pool)
        .await
        .map_err(AppError::from)
    }

    pub async fn document_by_path(
        &self,
        owner_id: Uuid,
        document_path: &str,
    ) -> Result<Memory, AppError> {
        sqlx::query_as::<_, Memory>(
            r"
            SELECT id, owner_id, kind, title, body_markdown, document_path, domain,
                   subject, predicate, object_value, epistemic_status, confidence,
                   importance, occurred_start, occurred_end,
                   temporal_precision, source_id, source_message_id, evidence_excerpt,
                   derived_from_id, supersedes_id, superseded_at, recorded_at, updated_at
            FROM memories
            WHERE owner_id = $1 AND document_path = $2
              AND superseded_at IS NULL AND epistemic_status <> 'retracted'
            ",
        )
        .bind(owner_id)
        .bind(document_path)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::NotFound {
            resource: "Markdown document",
        })
    }

    pub async fn revise_memory(
        &self,
        owner_id: Uuid,
        memory_id: Uuid,
        input: &MemoryInput,
        embedding: &[f32],
    ) -> Result<Memory, AppError> {
        validate_memory(input)?;
        validate_embedding(embedding)?;
        let mut transaction = self.pool.begin().await?;
        let updated = sqlx::query_scalar::<_, Uuid>(
            r#"
            UPDATE memories
            SET superseded_at = now(), updated_at = now()
            WHERE owner_id = $1 AND id = $2 AND superseded_at IS NULL
            RETURNING id
            "#,
        )
        .bind(owner_id)
        .bind(memory_id)
        .fetch_optional(&mut *transaction)
        .await?;
        if updated.is_none() {
            return Err(AppError::NotFound {
                resource: "active memory",
            });
        }
        let embedding = crate::openai::vector_literal(embedding);
        let memory = insert_memory(
            &mut *transaction,
            owner_id,
            input,
            &embedding,
            Some(memory_id),
        )
        .await?;
        audit(
            &mut transaction,
            Some(owner_id),
            "memory.revised",
            "memory",
            Some(memory.id),
            &serde_json::json!({"supersedes_id": memory_id}),
        )
        .await?;
        transaction.commit().await?;
        Ok(memory)
    }

    pub async fn retract_memory(
        &self,
        owner_id: Uuid,
        memory_id: Uuid,
        embedding: &[f32],
    ) -> Result<Memory, AppError> {
        let current = self.memory(owner_id, memory_id).await?;
        if current.superseded_at.is_some() {
            return Err(AppError::Conflict(
                "only the active revision can be retracted".to_owned(),
            ));
        }
        let input = MemoryInput {
            kind: current.kind,
            title: format!("Retraction: {}", current.title),
            body_markdown: format!(
                "This memory was retracted.\n\nPrior content:\n\n{}",
                current.body_markdown
            ),
            document_path: current.document_path,
            domain: current.domain,
            subject: current.subject,
            predicate: current.predicate,
            object_value: current.object_value,
            epistemic_status: "retracted".to_owned(),
            confidence: current.confidence,
            importance: current.importance,
            occurred_start: current.occurred_start,
            occurred_end: current.occurred_end,
            temporal_precision: current.temporal_precision,
            source_id: current.source_id,
            source_message_id: current.source_message_id,
            evidence_excerpt: current.evidence_excerpt,
            derived_from_id: Some(current.id),
        };
        self.revise_memory(owner_id, memory_id, &input, embedding)
            .await
    }

    pub async fn hybrid_search(
        &self,
        owner_id: Uuid,
        query_text: &str,
        embedding: &[f32],
        limit: i64,
    ) -> Result<Vec<SearchHit>, AppError> {
        validate_nonempty("query", query_text)?;
        validate_embedding(embedding)?;
        if !(1..=50).contains(&limit) {
            return Err(AppError::InvalidInput(
                "limit must be between 1 and 50".to_owned(),
            ));
        }
        let vector = crate::openai::vector_literal(embedding);
        let candidate_limit = limit * 4;
        let mut transaction = self.pool.begin().await?;
        sqlx::query("SET LOCAL hnsw.iterative_scan = 'strict_order'")
            .execute(&mut *transaction)
            .await?;
        let hits = sqlx::query_as::<_, SearchHit>(
            r#"
            WITH text_candidates AS MATERIALIZED (
                SELECT id,
                       row_number() OVER (
                           ORDER BY ts_rank_cd(
                               search_document,
                               websearch_to_tsquery('simple', $2)
                           ) DESC,
                           id
                       )::float8 AS rank
                FROM memories
                WHERE owner_id = $1
                  AND superseded_at IS NULL
                  AND epistemic_status <> 'retracted'
                  AND search_document @@ websearch_to_tsquery('simple', $2)
                ORDER BY ts_rank_cd(
                    search_document,
                    websearch_to_tsquery('simple', $2)
                ) DESC, id
                LIMIT $4
            ),
            vector_candidates AS MATERIALIZED (
                SELECT id,
                       row_number() OVER (ORDER BY distance, id)::float8 AS rank
                FROM (
                    SELECT id, embedding <=> $3::vector AS distance
                    FROM memories
                    WHERE owner_id = $1
                      AND superseded_at IS NULL
                      AND epistemic_status <> 'retracted'
                      AND embedding IS NOT NULL
                    ORDER BY embedding <=> $3::vector, id
                    LIMIT $4
                ) nearest
            ),
            fused AS (
                SELECT candidate_ids.id,
                       coalesce(1.0 / (60.0 + text_candidates.rank), 0.0)
                       + coalesce(1.0 / (60.0 + vector_candidates.rank), 0.0)
                       AS score
                FROM (
                    SELECT id FROM text_candidates
                    UNION
                    SELECT id FROM vector_candidates
                ) candidate_ids
                LEFT JOIN text_candidates USING (id)
                LEFT JOIN vector_candidates USING (id)
            )
            SELECT memories.id, memories.kind, memories.title,
                   memories.body_markdown, memories.domain, memories.occurred_start,
                   memories.epistemic_status,
                   memories.source_id, fused.score
            FROM fused
            JOIN memories USING (id)
            ORDER BY fused.score DESC, memories.importance DESC,
                     memories.recorded_at DESC
            LIMIT $5
            "#,
        )
        .bind(owner_id)
        .bind(query_text)
        .bind(vector)
        .bind(candidate_limit)
        .bind(limit)
        .fetch_all(&mut *transaction)
        .await?;
        transaction.commit().await?;
        Ok(hits)
    }

    pub async fn memories_by_ids(
        &self,
        owner_id: Uuid,
        memory_ids: &[Uuid],
    ) -> Result<Vec<SearchHit>, AppError> {
        if memory_ids.is_empty() {
            return Ok(Vec::new());
        }
        if memory_ids.len() > 50 {
            return Err(AppError::InvalidInput(
                "at most 50 cited memories are allowed".to_owned(),
            ));
        }
        sqlx::query_as::<_, SearchHit>(
            r"
            SELECT id, kind, title, body_markdown, domain, occurred_start,
                   epistemic_status, source_id, 1.0::float8 AS score
            FROM memories
            WHERE owner_id = $1
              AND id = ANY($2)
              AND superseded_at IS NULL
              AND epistemic_status <> 'retracted'
            ORDER BY recorded_at DESC, id
            ",
        )
        .bind(owner_id)
        .bind(memory_ids)
        .fetch_all(&self.pool)
        .await
        .map_err(AppError::from)
    }

    pub async fn exact_vector_search(
        &self,
        owner_id: Uuid,
        embedding: &[f32],
        limit: i64,
    ) -> Result<Vec<SearchHit>, AppError> {
        validate_embedding(embedding)?;
        if !(1..=50).contains(&limit) {
            return Err(AppError::InvalidInput(
                "limit must be between 1 and 50".to_owned(),
            ));
        }
        let vector = crate::openai::vector_literal(embedding);
        let mut transaction = self.pool.begin().await?;
        sqlx::query("SET LOCAL enable_indexscan = off")
            .execute(&mut *transaction)
            .await?;
        sqlx::query("SET LOCAL enable_bitmapscan = off")
            .execute(&mut *transaction)
            .await?;
        let hits = sqlx::query_as::<_, SearchHit>(
            r"
            SELECT id, kind, title, body_markdown, domain, occurred_start,
                   epistemic_status, source_id,
                   1.0 - (embedding <=> $2::vector) AS score
            FROM memories
            WHERE owner_id = $1 AND superseded_at IS NULL
              AND epistemic_status <> 'retracted'
              AND embedding IS NOT NULL
            ORDER BY embedding <=> $2::vector, id
            LIMIT $3
            ",
        )
        .bind(owner_id)
        .bind(vector)
        .bind(limit)
        .fetch_all(&mut *transaction)
        .await?;
        transaction.commit().await?;
        Ok(hits)
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn commit_research(
        &self,
        owner_id: Uuid,
        provider_response_id: &str,
        query: &str,
        report_markdown: &str,
        annotations: &serde_json::Value,
        content_hash: &str,
        candidates: Vec<ResearchMemoryCandidate>,
        embeddings: Vec<Vec<f32>>,
    ) -> Result<Vec<Memory>, AppError> {
        validate_nonempty("research query", query)?;
        validate_nonempty("research report", report_markdown)?;
        if candidates.len() != embeddings.len() {
            return Err(AppError::InvalidProviderResponse(format!(
                "received {} researched memories and {} embeddings",
                candidates.len(),
                embeddings.len()
            )));
        }
        let mut transaction = self.pool.begin().await?;
        let source_id = sqlx::query_scalar::<_, Uuid>(
            r"
            INSERT INTO source_records (
                owner_id, source_kind, external_id, title, payload, content_hash,
                observed_at
            )
            VALUES ($1, 'online_research', $2, $3, $4, $5, now())
            ON CONFLICT (owner_id, source_kind, external_id) DO UPDATE
            SET title = EXCLUDED.title,
                payload = EXCLUDED.payload,
                content_hash = EXCLUDED.content_hash,
                observed_at = EXCLUDED.observed_at,
                imported_at = now()
            RETURNING id
            ",
        )
        .bind(owner_id)
        .bind(provider_response_id)
        .bind(query)
        .bind(annotations)
        .bind(content_hash)
        .fetch_one(&mut *transaction)
        .await?;
        let mut memories = Vec::with_capacity(candidates.len());
        for (candidate, embedding) in candidates.into_iter().zip(embeddings) {
            validate_embedding(&embedding)?;
            let sources = candidate
                .source_urls
                .iter()
                .map(|url| format!("- <{url}>"))
                .collect::<Vec<_>>()
                .join("\n");
            let input = MemoryInput {
                kind: "research".to_owned(),
                title: candidate.title,
                body_markdown: format!("{}\n\n## Sources\n\n{sources}", candidate.body_markdown),
                document_path: None,
                domain: candidate.domain,
                subject: candidate.subject,
                predicate: candidate.predicate,
                object_value: candidate.object_value,
                epistemic_status: "researched".to_owned(),
                confidence: candidate.confidence,
                importance: candidate.importance,
                occurred_start: candidate.occurred_start,
                occurred_end: candidate.occurred_end,
                temporal_precision: candidate.temporal_precision,
                source_id: Some(source_id),
                source_message_id: None,
                evidence_excerpt: Some(candidate.evidence_excerpt),
                derived_from_id: None,
            };
            validate_memory(&input)?;
            let vector = crate::openai::vector_literal(&embedding);
            memories.push(insert_memory(&mut *transaction, owner_id, &input, &vector, None).await?);
        }
        audit(
            &mut transaction,
            Some(owner_id),
            "research.completed",
            "source_record",
            Some(source_id),
            &serde_json::json!({"memories_created": memories.len()}),
        )
        .await?;
        transaction.commit().await?;
        Ok(memories)
    }

    pub async fn create_conversation(
        &self,
        owner_id: Uuid,
        request: &CreateConversationRequest,
    ) -> Result<Conversation, AppError> {
        validate_nonempty("title", &request.title)?;
        if !matches!(request.mode.as_str(), "conversation" | "research") {
            return Err(AppError::InvalidInput(
                "conversation mode must be conversation or research".to_owned(),
            ));
        }
        let mut transaction = self.pool.begin().await?;
        let conversation = sqlx::query_as::<_, Conversation>(
            r"
            INSERT INTO conversations (owner_id, mode, title)
            VALUES ($1, $2, $3)
            RETURNING id, owner_id, mode, title, status, created_at, updated_at
            ",
        )
        .bind(owner_id)
        .bind(&request.mode)
        .bind(request.title.trim())
        .fetch_one(&mut *transaction)
        .await?;
        audit(
            &mut transaction,
            Some(owner_id),
            "conversation.created",
            "conversation",
            Some(conversation.id),
            &serde_json::json!({"mode": conversation.mode}),
        )
        .await?;
        transaction.commit().await?;
        Ok(conversation)
    }

    pub async fn create_realtime_session(
        &self,
        owner_id: Uuid,
        title: &str,
        openai_session_id: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(Conversation, RealtimeSession), AppError> {
        validate_nonempty("realtime session title", title)?;
        validate_nonempty("OpenAI session ID", openai_session_id)?;
        if expires_at <= Utc::now() {
            return Err(AppError::InvalidProviderResponse(
                "Realtime session expiry must be in the future".to_owned(),
            ));
        }

        let mut transaction = self.pool.begin().await?;
        let conversation = sqlx::query_as::<_, Conversation>(
            r"
            INSERT INTO conversations (owner_id, mode, title)
            VALUES ($1, 'conversation', $2)
            RETURNING id, owner_id, mode, title, status, created_at, updated_at
            ",
        )
        .bind(owner_id)
        .bind(title.trim())
        .fetch_one(&mut *transaction)
        .await?;
        let session = sqlx::query_as::<_, RealtimeSession>(
            r"
            INSERT INTO realtime_sessions (
                owner_id, conversation_id, openai_session_id, expires_at
            )
            VALUES ($1, $2, $3, $4)
            RETURNING id, owner_id, conversation_id, openai_session_id,
                      status, expires_at, created_at, closed_at
            ",
        )
        .bind(owner_id)
        .bind(conversation.id)
        .bind(openai_session_id)
        .bind(expires_at)
        .fetch_one(&mut *transaction)
        .await?;
        audit(
            &mut transaction,
            Some(owner_id),
            "realtime_session.created",
            "realtime_session",
            Some(session.id),
            &serde_json::json!({
                "conversation_id": conversation.id,
                "expires_at": session.expires_at
            }),
        )
        .await?;
        transaction.commit().await?;
        Ok((conversation, session))
    }

    pub async fn realtime_session(
        &self,
        owner_id: Uuid,
        session_id: Uuid,
    ) -> Result<RealtimeSession, AppError> {
        sqlx::query_as::<_, RealtimeSession>(
            r"
            SELECT id, owner_id, conversation_id, openai_session_id, status,
                   expires_at, created_at, closed_at
            FROM realtime_sessions
            WHERE owner_id = $1 AND id = $2
            ",
        )
        .bind(owner_id)
        .bind(session_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::NotFound {
            resource: "realtime session",
        })
    }

    pub async fn active_realtime_session(
        &self,
        owner_id: Uuid,
        session_id: Uuid,
    ) -> Result<RealtimeSession, AppError> {
        let session = self.realtime_session(owner_id, session_id).await?;
        if session.status != "active" || session.expires_at <= Utc::now() {
            return Err(AppError::Conflict(
                "realtime session is closed or expired".to_owned(),
            ));
        }
        Ok(session)
    }

    pub async fn close_realtime_session(
        &self,
        owner_id: Uuid,
        session_id: Uuid,
    ) -> Result<RealtimeSession, AppError> {
        let mut transaction = self.pool.begin().await?;
        let session = sqlx::query_as::<_, RealtimeSession>(
            r"
            UPDATE realtime_sessions
            SET status = 'closed', closed_at = now()
            WHERE owner_id = $1 AND id = $2 AND status = 'active'
            RETURNING id, owner_id, conversation_id, openai_session_id, status,
                      expires_at, created_at, closed_at
            ",
        )
        .bind(owner_id)
        .bind(session_id)
        .fetch_optional(&mut *transaction)
        .await?
        .ok_or(AppError::NotFound {
            resource: "active realtime session",
        })?;
        sqlx::query(
            "UPDATE conversations SET status = 'completed', updated_at = now() WHERE owner_id = $1 AND id = $2",
        )
        .bind(owner_id)
        .bind(session.conversation_id)
        .execute(&mut *transaction)
        .await?;
        audit(
            &mut transaction,
            Some(owner_id),
            "realtime_session.closed",
            "realtime_session",
            Some(session.id),
            &serde_json::json!({"conversation_id": session.conversation_id}),
        )
        .await?;
        transaction.commit().await?;
        Ok(session)
    }

    pub async fn list_conversations(&self, owner_id: Uuid) -> Result<Vec<Conversation>, AppError> {
        sqlx::query_as::<_, Conversation>(
            r"
            SELECT id, owner_id, mode, title, status, created_at, updated_at
            FROM conversations
            WHERE owner_id = $1
            ORDER BY updated_at DESC
            LIMIT 200
            ",
        )
        .bind(owner_id)
        .fetch_all(&self.pool)
        .await
        .map_err(AppError::from)
    }

    pub async fn conversation(
        &self,
        owner_id: Uuid,
        conversation_id: Uuid,
    ) -> Result<Conversation, AppError> {
        sqlx::query_as::<_, Conversation>(
            r"
            SELECT id, owner_id, mode, title, status, created_at, updated_at
            FROM conversations
            WHERE owner_id = $1 AND id = $2
            ",
        )
        .bind(owner_id)
        .bind(conversation_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::NotFound {
            resource: "conversation",
        })
    }

    pub async fn conversation_messages(
        &self,
        owner_id: Uuid,
        conversation_id: Uuid,
        limit: i64,
    ) -> Result<Vec<Message>, AppError> {
        if !(1..=100).contains(&limit) {
            return Err(AppError::InvalidInput(
                "message limit must be between 1 and 100".to_owned(),
            ));
        }
        let mut messages = sqlx::query_as::<_, Message>(
            r"
            SELECT id, owner_id, conversation_id, role, content, input_modality,
                   provider_response_id, cited_memory_ids, created_at
            FROM messages
            WHERE owner_id = $1 AND conversation_id = $2
            ORDER BY created_at DESC, id DESC
            LIMIT $3
            ",
        )
        .bind(owner_id)
        .bind(conversation_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;
        messages.reverse();
        Ok(messages)
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn commit_agent_turn(
        &self,
        owner_id: Uuid,
        conversation_id: Uuid,
        user_content: &str,
        input_modality: &str,
        provider_response_id: &str,
        output: AgentResponse,
        candidate_embeddings: Vec<Vec<f32>>,
    ) -> Result<ConversationTurnResponse, AppError> {
        validate_nonempty("user content", user_content)?;
        validate_nonempty("provider response ID", provider_response_id)?;
        if output.memory_candidates.len() != candidate_embeddings.len() {
            return Err(AppError::InvalidProviderResponse(format!(
                "received {} memory candidates and {} embeddings",
                output.memory_candidates.len(),
                candidate_embeddings.len()
            )));
        }
        let mut transaction = self.pool.begin().await?;
        let conversation_status = sqlx::query_scalar::<_, String>(
            r"
            SELECT status
            FROM conversations
            WHERE owner_id = $1 AND id = $2
            FOR UPDATE
            ",
        )
        .bind(owner_id)
        .bind(conversation_id)
        .fetch_optional(&mut *transaction)
        .await?
        .ok_or(AppError::NotFound {
            resource: "conversation",
        })?;
        if conversation_status != "active" {
            return Err(AppError::Conflict("conversation is not active".to_owned()));
        }
        let response_was_committed = sqlx::query_scalar::<_, bool>(
            r"
            SELECT EXISTS(
                SELECT 1
                FROM messages
                WHERE owner_id = $1
                  AND conversation_id = $2
                  AND provider_response_id = $3
            )
            ",
        )
        .bind(owner_id)
        .bind(conversation_id)
        .bind(provider_response_id)
        .fetch_one(&mut *transaction)
        .await?;
        if response_was_committed {
            return Err(AppError::Conflict(
                "provider response was already committed".to_owned(),
            ));
        }
        if !output.cited_memory_ids.is_empty() {
            let citations_are_owned = sqlx::query_scalar::<_, bool>(
                r"
                SELECT count(*) = cardinality($2::uuid[])
                FROM memories
                WHERE owner_id = $1
                  AND id = ANY($2)
                  AND superseded_at IS NULL
                  AND epistemic_status <> 'retracted'
                ",
            )
            .bind(owner_id)
            .bind(&output.cited_memory_ids)
            .fetch_one(&mut *transaction)
            .await?;
            if !citations_are_owned {
                return Err(AppError::InvalidProviderResponse(
                    "assistant citations contain an unavailable memory".to_owned(),
                ));
            }
        }

        let user_message = insert_message(
            &mut transaction,
            owner_id,
            conversation_id,
            "user",
            user_content,
            input_modality,
            None,
            &[],
        )
        .await?;
        let assistant_content = match &output.follow_up_question {
            Some(question) => format!("{}\n\n{}", output.answer, question),
            None => output.answer.clone(),
        };
        let assistant_message = insert_message(
            &mut transaction,
            owner_id,
            conversation_id,
            "assistant",
            &assistant_content,
            "system",
            Some(provider_response_id),
            &output.cited_memory_ids,
        )
        .await?;

        let mut created_memories = Vec::with_capacity(output.memory_candidates.len());
        for (candidate, embedding) in output
            .memory_candidates
            .into_iter()
            .zip(candidate_embeddings)
        {
            validate_embedding(&embedding)?;
            let input = candidate.into_memory_input(user_message.id);
            validate_memory(&input)?;
            let vector = crate::openai::vector_literal(&embedding);
            let memory = insert_memory(&mut *transaction, owner_id, &input, &vector, None).await?;
            created_memories.push(memory);
        }

        sqlx::query("UPDATE conversations SET updated_at = now() WHERE owner_id = $1 AND id = $2")
            .bind(owner_id)
            .bind(conversation_id)
            .execute(&mut *transaction)
            .await?;
        audit(
            &mut transaction,
            Some(owner_id),
            "conversation.turn_committed",
            "conversation",
            Some(conversation_id),
            &serde_json::json!({
                "assistant_message_id": assistant_message.id,
                "input_modality": input_modality,
                "memories_created": created_memories.len(),
                "user_message_id": user_message.id
            }),
        )
        .await?;
        transaction.commit().await?;

        Ok(ConversationTurnResponse {
            user_message,
            assistant_message,
            created_memories,
            answer: output.answer,
            follow_up_question: output.follow_up_question,
        })
    }

    pub async fn audit_events(&self, owner_id: Uuid) -> Result<Vec<AuditEvent>, AppError> {
        sqlx::query_as::<_, AuditEvent>(
            r"
            SELECT id, owner_id, action, resource_kind, resource_id, metadata,
                   occurred_at
            FROM audit_events
            WHERE owner_id = $1
            ORDER BY occurred_at DESC
            LIMIT 1000
            ",
        )
        .bind(owner_id)
        .fetch_all(&self.pool)
        .await
        .map_err(AppError::from)
    }

    pub async fn create_oauth_state(
        &self,
        owner_id: Uuid,
        provider: &str,
        state_hash: &[u8],
    ) -> Result<Uuid, AppError> {
        validate_provider(provider)?;
        let mut transaction = self.pool.begin().await?;
        let connector_id = sqlx::query_scalar::<_, Uuid>(
            r"
            INSERT INTO connectors (owner_id, provider, status)
            VALUES ($1, $2, 'pending')
            ON CONFLICT (owner_id, provider) DO UPDATE
            SET last_error = NULL, updated_at = now()
            RETURNING id
            ",
        )
        .bind(owner_id)
        .bind(provider)
        .fetch_one(&mut *transaction)
        .await?;
        sqlx::query(
            r"
            DELETE FROM oauth_states
            WHERE owner_id = $1 AND provider = $2
            ",
        )
        .bind(owner_id)
        .bind(provider)
        .execute(&mut *transaction)
        .await?;
        sqlx::query(
            r"
            INSERT INTO oauth_states (state_hash, owner_id, provider, expires_at)
            VALUES ($1, $2, $3, now() + interval '10 minutes')
            ",
        )
        .bind(state_hash)
        .bind(owner_id)
        .bind(provider)
        .execute(&mut *transaction)
        .await?;
        audit(
            &mut transaction,
            Some(owner_id),
            "oauth.started",
            "connector",
            Some(connector_id),
            &serde_json::json!({"provider": provider}),
        )
        .await?;
        transaction.commit().await?;
        Ok(connector_id)
    }

    pub async fn oauth_state_owner(
        &self,
        provider: &str,
        state_hash: &[u8],
    ) -> Result<Uuid, AppError> {
        validate_provider(provider)?;
        sqlx::query_scalar::<_, Uuid>(
            r"
            SELECT owner_id
            FROM oauth_states
            WHERE state_hash = $1 AND provider = $2 AND expires_at > now()
            ",
        )
        .bind(state_hash)
        .bind(provider)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| AppError::InvalidInput("OAuth state is invalid or expired".to_owned()))
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn connect_connector(
        &self,
        owner_id: Uuid,
        provider: &str,
        external_account_id: &str,
        external_account_name: &str,
        scopes: &[String],
        access: &EncryptedSecret,
        refresh: Option<&EncryptedSecret>,
        token_expires_at: Option<chrono::DateTime<chrono::Utc>>,
        state_hash: &[u8],
    ) -> Result<Connector, AppError> {
        validate_provider(provider)?;
        validate_nonempty("external account ID", external_account_id)?;
        let mut transaction = self.pool.begin().await?;
        sqlx::query_scalar::<_, Uuid>(
            r"
            SELECT id
            FROM connectors
            WHERE owner_id = $1 AND provider = $2
            FOR UPDATE
            ",
        )
        .bind(owner_id)
        .bind(provider)
        .fetch_optional(&mut *transaction)
        .await?
        .ok_or(AppError::NotFound {
            resource: "pending connector",
        })?;
        sqlx::query_scalar::<_, Uuid>(
            r"
            DELETE FROM oauth_states
            WHERE state_hash = $1 AND owner_id = $2 AND provider = $3
              AND expires_at > now()
            RETURNING owner_id
            ",
        )
        .bind(state_hash)
        .bind(owner_id)
        .bind(provider)
        .fetch_optional(&mut *transaction)
        .await?
        .ok_or_else(|| AppError::InvalidInput("OAuth state is invalid or expired".to_owned()))?;
        let connector = sqlx::query_as::<_, Connector>(
            r"
            UPDATE connectors
            SET external_account_id = $3,
                external_account_name = $4,
                status = 'connected',
                scopes = $5,
                access_token_ciphertext = $6,
                access_token_nonce = $7,
                refresh_token_ciphertext = $8,
                refresh_token_nonce = $9,
                token_expires_at = $10,
                last_error = NULL,
                updated_at = now()
            WHERE owner_id = $1 AND provider = $2
            RETURNING id, owner_id, provider, external_account_id,
                      external_account_name, status, scopes, token_expires_at,
                      sync_cursor, last_synced_at, last_error, created_at, updated_at
            ",
        )
        .bind(owner_id)
        .bind(provider)
        .bind(external_account_id)
        .bind(external_account_name)
        .bind(scopes)
        .bind(&access.ciphertext)
        .bind(&access.nonce)
        .bind(refresh.map(|secret| &secret.ciphertext))
        .bind(refresh.map(|secret| &secret.nonce))
        .bind(token_expires_at)
        .fetch_optional(&mut *transaction)
        .await?
        .ok_or(AppError::NotFound {
            resource: "pending connector",
        })?;
        audit(
            &mut transaction,
            Some(owner_id),
            "oauth.connected",
            "connector",
            Some(connector.id),
            &serde_json::json!({"provider": provider}),
        )
        .await?;
        transaction.commit().await?;
        Ok(connector)
    }

    pub async fn connector_credentials(
        &self,
        owner_id: Uuid,
        connector_id: Uuid,
    ) -> Result<ConnectorCredentials, AppError> {
        sqlx::query_as::<_, ConnectorCredentials>(
            r"
            SELECT id, owner_id, provider, external_account_name, status, access_token_ciphertext,
                   access_token_nonce, refresh_token_ciphertext,
                   refresh_token_nonce, token_expires_at, sync_cursor
            FROM connectors
            WHERE owner_id = $1 AND id = $2
            ",
        )
        .bind(owner_id)
        .bind(connector_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::NotFound {
            resource: "connector",
        })
    }

    pub async fn connector_id(&self, owner_id: Uuid, provider: &str) -> Result<Uuid, AppError> {
        validate_provider(provider)?;
        sqlx::query_scalar::<_, Uuid>(
            "SELECT id FROM connectors WHERE owner_id = $1 AND provider = $2",
        )
        .bind(owner_id)
        .bind(provider)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::NotFound {
            resource: "connector",
        })
    }

    pub async fn connected_connector_owners(
        &self,
        provider: &str,
    ) -> Result<Vec<(Uuid, Uuid)>, AppError> {
        validate_provider(provider)?;
        sqlx::query_as::<_, (Uuid, Uuid)>(
            r"
            SELECT owner_id, id
            FROM connectors
            WHERE provider = $1 AND status IN ('connected', 'error')
            ORDER BY owner_id, id
            ",
        )
        .bind(provider)
        .fetch_all(&self.pool)
        .await
        .map_err(AppError::from)
    }

    pub async fn list_connectors(&self, owner_id: Uuid) -> Result<Vec<Connector>, AppError> {
        sqlx::query_as::<_, Connector>(
            r"
            SELECT id, owner_id, provider, external_account_id,
                   external_account_name, status, scopes, token_expires_at,
                   sync_cursor, last_synced_at, last_error, created_at, updated_at
            FROM connectors
            WHERE owner_id = $1
            ORDER BY provider
            ",
        )
        .bind(owner_id)
        .fetch_all(&self.pool)
        .await
        .map_err(AppError::from)
    }

    pub async fn revoke_connector(
        &self,
        owner_id: Uuid,
        connector_id: Uuid,
    ) -> Result<Connector, AppError> {
        let mut transaction = self.pool.begin().await?;
        let connector = sqlx::query_as::<_, Connector>(
            r"
            UPDATE connectors
            SET status = 'revoked', access_token_ciphertext = NULL,
                access_token_nonce = NULL, refresh_token_ciphertext = NULL,
                refresh_token_nonce = NULL, token_expires_at = NULL,
                updated_at = now()
            WHERE id = $1 AND owner_id = $2
            RETURNING id, owner_id, provider, external_account_id,
                      external_account_name, status, scopes, token_expires_at,
                      sync_cursor, last_synced_at, last_error, created_at, updated_at
            ",
        )
        .bind(connector_id)
        .bind(owner_id)
        .fetch_optional(&mut *transaction)
        .await?
        .ok_or(AppError::NotFound {
            resource: "connector",
        })?;
        sqlx::query(
            r"
            DELETE FROM oauth_states
            WHERE owner_id = $1 AND provider = $2
            ",
        )
        .bind(owner_id)
        .bind(&connector.provider)
        .execute(&mut *transaction)
        .await?;
        sqlx::query(
            r"
            UPDATE ingestion_jobs
            SET status = 'failed', last_error = 'connector was revoked',
                completed_at = now()
            WHERE owner_id = $1 AND connector_id = $2 AND status = 'queued'
            ",
        )
        .bind(owner_id)
        .bind(connector_id)
        .execute(&mut *transaction)
        .await?;
        audit(
            &mut transaction,
            Some(owner_id),
            "connector.revoked",
            "connector",
            Some(connector.id),
            &serde_json::json!({"provider": connector.provider}),
        )
        .await?;
        transaction.commit().await?;
        Ok(connector)
    }

    pub async fn reset_connector_cursor(
        &self,
        owner_id: Uuid,
        connector_id: Uuid,
    ) -> Result<Connector, AppError> {
        let mut transaction = self.pool.begin().await?;
        let connector = sqlx::query_as::<_, Connector>(
            r"
            UPDATE connectors
            SET sync_cursor = '{}'::jsonb, status = 'connected',
                last_error = NULL, updated_at = now()
            WHERE id = $1 AND owner_id = $2
              AND status IN ('connected', 'error')
            RETURNING id, owner_id, provider, external_account_id,
                      external_account_name, status, scopes, token_expires_at,
                      sync_cursor, last_synced_at, last_error, created_at, updated_at
            ",
        )
        .bind(connector_id)
        .bind(owner_id)
        .fetch_optional(&mut *transaction)
        .await?
        .ok_or(AppError::NotFound {
            resource: "connected connector",
        })?;
        audit(
            &mut transaction,
            Some(owner_id),
            "connector.cursor_reset",
            "connector",
            Some(connector.id),
            &serde_json::json!({"provider": connector.provider}),
        )
        .await?;
        transaction.commit().await?;
        Ok(connector)
    }

    pub async fn update_connector_tokens(
        &self,
        owner_id: Uuid,
        connector_id: Uuid,
        access: &EncryptedSecret,
        refresh: Option<&EncryptedSecret>,
        token_expires_at: Option<chrono::DateTime<chrono::Utc>>,
    ) -> Result<(), AppError> {
        let updated = sqlx::query(
            r"
            UPDATE connectors
            SET access_token_ciphertext = $2,
                access_token_nonce = $3,
                refresh_token_ciphertext = coalesce($4, refresh_token_ciphertext),
                refresh_token_nonce = coalesce($5, refresh_token_nonce),
                token_expires_at = $6,
                updated_at = now()
            WHERE id = $1 AND owner_id = $7
              AND status IN ('connected', 'syncing', 'error')
            ",
        )
        .bind(connector_id)
        .bind(&access.ciphertext)
        .bind(&access.nonce)
        .bind(refresh.map(|secret| &secret.ciphertext))
        .bind(refresh.map(|secret| &secret.nonce))
        .bind(token_expires_at)
        .bind(owner_id)
        .execute(&self.pool)
        .await?;
        if updated.rows_affected() != 1 {
            return Err(AppError::NotFound {
                resource: "connector",
            });
        }
        Ok(())
    }

    pub async fn enqueue_connector_sync(
        &self,
        owner_id: Uuid,
        connector_id: Uuid,
    ) -> Result<IngestionJob, AppError> {
        let mut transaction = self.pool.begin().await?;
        sqlx::query_scalar::<_, Uuid>(
            r"
            SELECT id
            FROM connectors
            WHERE id = $1 AND owner_id = $2 AND status IN ('connected', 'error')
            FOR UPDATE
            ",
        )
        .bind(connector_id)
        .bind(owner_id)
        .fetch_optional(&mut *transaction)
        .await?
        .ok_or(AppError::NotFound {
            resource: "connected connector",
        })?;
        let pending = sqlx::query_as::<_, IngestionJob>(
            r"
            SELECT id, owner_id, connector_id, job_kind, payload, status,
                   attempts, available_at, locked_at, locked_by, last_error,
                   created_at, completed_at
            FROM ingestion_jobs
            WHERE connector_id = $1 AND job_kind = 'connector_sync'
              AND status IN ('queued', 'running')
            ORDER BY created_at DESC
            LIMIT 1
            ",
        )
        .bind(connector_id)
        .fetch_optional(&mut *transaction)
        .await?;
        if let Some(job) = pending {
            transaction.commit().await?;
            return Ok(job);
        }
        let job = sqlx::query_as::<_, IngestionJob>(
            r"
            INSERT INTO ingestion_jobs (owner_id, connector_id, job_kind)
            VALUES ($1, $2, 'connector_sync')
            RETURNING id, owner_id, connector_id, job_kind, payload, status,
                      attempts, available_at, locked_at, locked_by, last_error,
                      created_at, completed_at
            ",
        )
        .bind(owner_id)
        .bind(connector_id)
        .fetch_one(&mut *transaction)
        .await?;
        audit(
            &mut transaction,
            Some(owner_id),
            "connector.sync_queued",
            "ingestion_job",
            Some(job.id),
            &serde_json::json!({"connector_id": connector_id}),
        )
        .await?;
        transaction.commit().await?;
        Ok(job)
    }

    pub async fn claim_next_job(&self, worker_id: &str) -> Result<Option<IngestionJob>, AppError> {
        validate_nonempty("worker ID", worker_id)?;
        sqlx::query_as::<_, IngestionJob>(
            r"
            WITH next_job AS (
                SELECT id
                FROM ingestion_jobs
                WHERE status = 'queued' AND available_at <= now()
                ORDER BY available_at, created_at
                FOR UPDATE SKIP LOCKED
                LIMIT 1
            )
            UPDATE ingestion_jobs jobs
            SET status = 'running', attempts = attempts + 1,
                locked_at = now(), locked_by = $1
            FROM next_job
            WHERE jobs.id = next_job.id
            RETURNING jobs.id, jobs.owner_id, jobs.connector_id, jobs.job_kind,
                      jobs.payload, jobs.status, jobs.attempts, jobs.available_at,
                      jobs.locked_at, jobs.locked_by, jobs.last_error,
                      jobs.created_at, jobs.completed_at
            ",
        )
        .bind(worker_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(AppError::from)
    }

    pub async fn fail_stale_jobs(&self) -> Result<u64, AppError> {
        let mut transaction = self.pool.begin().await?;
        let connector_ids = sqlx::query_scalar::<_, Option<Uuid>>(
            r"
            UPDATE ingestion_jobs
            SET status = 'failed', completed_at = now(),
                last_error = 'worker lease expired after 15 minutes'
            WHERE status = 'running'
              AND locked_at < now() - interval '15 minutes'
            RETURNING connector_id
            ",
        )
        .fetch_all(&mut *transaction)
        .await?;
        for connector_id in connector_ids.iter().flatten() {
            sqlx::query(
                r"
                UPDATE connectors
                SET status = 'error',
                    last_error = 'worker lease expired after 15 minutes',
                    updated_at = now()
                WHERE id = $1 AND status <> 'revoked'
                ",
            )
            .bind(connector_id)
            .execute(&mut *transaction)
            .await?;
        }
        transaction.commit().await?;
        u64::try_from(connector_ids.len())
            .map_err(|error| AppError::InvalidProviderResponse(error.to_string()))
    }

    pub async fn job(&self, owner_id: Uuid, job_id: Uuid) -> Result<IngestionJob, AppError> {
        sqlx::query_as::<_, IngestionJob>(
            r"
            SELECT id, owner_id, connector_id, job_kind, payload, status,
                   attempts, available_at, locked_at, locked_by, last_error,
                   created_at, completed_at
            FROM ingestion_jobs
            WHERE owner_id = $1 AND id = $2
            ",
        )
        .bind(owner_id)
        .bind(job_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(AppError::NotFound {
            resource: "ingestion job",
        })
    }

    pub async fn retry_job(&self, owner_id: Uuid, job_id: Uuid) -> Result<IngestionJob, AppError> {
        let mut transaction = self.pool.begin().await?;
        let connector_id = sqlx::query_scalar::<_, Uuid>(
            r"
            SELECT connectors.id
            FROM connectors
            JOIN ingestion_jobs ON ingestion_jobs.connector_id = connectors.id
            WHERE ingestion_jobs.owner_id = $1 AND ingestion_jobs.id = $2
              AND ingestion_jobs.status = 'failed'
              AND connectors.owner_id = $1
              AND connectors.status IN ('connected', 'error')
            FOR UPDATE OF connectors
            ",
        )
        .bind(owner_id)
        .bind(job_id)
        .fetch_optional(&mut *transaction)
        .await?
        .ok_or(AppError::NotFound {
            resource: "retryable ingestion job",
        })?;
        let has_active_job = sqlx::query_scalar::<_, bool>(
            r"
            SELECT EXISTS(
                SELECT 1
                FROM ingestion_jobs
                WHERE connector_id = $1 AND id <> $2
                  AND status IN ('queued', 'running')
            )
            ",
        )
        .bind(connector_id)
        .bind(job_id)
        .fetch_one(&mut *transaction)
        .await?;
        if has_active_job {
            return Err(AppError::Conflict(
                "connector already has an active sync job".to_owned(),
            ));
        }
        let job = sqlx::query_as::<_, IngestionJob>(
            r"
            UPDATE ingestion_jobs
            SET status = 'queued', available_at = now(), locked_at = NULL,
                locked_by = NULL, last_error = NULL, completed_at = NULL
            WHERE owner_id = $1 AND id = $2 AND status = 'failed'
            RETURNING id, owner_id, connector_id, job_kind, payload, status,
                      attempts, available_at, locked_at, locked_by, last_error,
                      created_at, completed_at
            ",
        )
        .bind(owner_id)
        .bind(job_id)
        .fetch_optional(&mut *transaction)
        .await?
        .ok_or(AppError::NotFound {
            resource: "retryable ingestion job",
        })?;
        audit(
            &mut transaction,
            Some(owner_id),
            "ingestion.retry_queued",
            "ingestion_job",
            Some(job.id),
            &serde_json::json!({"attempts": job.attempts}),
        )
        .await?;
        transaction.commit().await?;
        Ok(job)
    }

    pub async fn fail_job(&self, job: &IngestionJob, error: &str) -> Result<(), AppError> {
        let mut transaction = self.pool.begin().await?;
        let job_update = sqlx::query(
            r"
            UPDATE ingestion_jobs
            SET status = 'failed', last_error = $2, completed_at = now()
            WHERE id = $1 AND owner_id = $4
              AND status = 'running' AND locked_by = $3
            ",
        )
        .bind(job.id)
        .bind(error)
        .bind(job.locked_by.as_deref())
        .bind(job.owner_id)
        .execute(&mut *transaction)
        .await?;
        if job_update.rows_affected() != 1 {
            return Err(AppError::Conflict(
                "ingestion job lease is no longer active".to_owned(),
            ));
        }
        if let Some(connector_id) = job.connector_id {
            sqlx::query(
                r"
                UPDATE connectors
                SET status = 'error', last_error = $2, updated_at = now()
                WHERE id = $1 AND owner_id = $3 AND status <> 'revoked'
                ",
            )
            .bind(connector_id)
            .bind(error)
            .bind(job.owner_id)
            .execute(&mut *transaction)
            .await?;
        }
        audit(
            &mut transaction,
            Some(job.owner_id),
            "ingestion.failed",
            "ingestion_job",
            Some(job.id),
            &serde_json::json!({"error": error}),
        )
        .await?;
        transaction.commit().await?;
        Ok(())
    }

    pub async fn ingest_connector_records(
        &self,
        job: &IngestionJob,
        connector_id: Uuid,
        provider: &str,
        records: Vec<ImportedRecord>,
        embeddings: Vec<Vec<f32>>,
        next_cursor: &serde_json::Value,
    ) -> Result<usize, AppError> {
        validate_provider(provider)?;
        if records.len() != embeddings.len() {
            return Err(AppError::InvalidProviderResponse(format!(
                "received {} imported records and {} embeddings",
                records.len(),
                embeddings.len()
            )));
        }
        if job.connector_id != Some(connector_id) {
            return Err(AppError::Conflict(
                "ingestion job does not belong to the supplied connector".to_owned(),
            ));
        }
        let mut transaction = self.pool.begin().await?;
        let connector_matches_job = sqlx::query_scalar::<_, Uuid>(
            r"
            SELECT id
            FROM connectors
            WHERE owner_id = $1 AND id = $2 AND provider = $3
              AND status IN ('connected', 'syncing', 'error')
            FOR UPDATE
            ",
        )
        .bind(job.owner_id)
        .bind(connector_id)
        .bind(provider)
        .fetch_optional(&mut *transaction)
        .await?;
        if connector_matches_job.is_none() {
            return Err(AppError::Conflict(
                "ingestion connector does not match the job owner and provider".to_owned(),
            ));
        }
        let mut changed = 0;
        for (record, embedding) in records.into_iter().zip(embeddings) {
            validate_embedding(&embedding)?;
            let content_hash = imported_content_hash(&record)?;
            let existing = sqlx::query_as::<_, (Uuid, String)>(
                r"
                SELECT id, content_hash
                FROM source_records
                WHERE owner_id = $1 AND source_kind = $2 AND external_id = $3
                FOR UPDATE
                ",
            )
            .bind(job.owner_id)
            .bind(provider)
            .bind(&record.external_id)
            .fetch_optional(&mut *transaction)
            .await?;
            let (source_id, supersedes_id) = if let Some((source_id, existing_hash)) = existing {
                if existing_hash == content_hash {
                    sqlx::query(
                        "UPDATE source_records SET imported_at = now() WHERE id = $1 AND owner_id = $2",
                    )
                        .bind(source_id)
                        .bind(job.owner_id)
                        .execute(&mut *transaction)
                        .await?;
                    continue;
                }
                sqlx::query(
                    r"
                    UPDATE source_records
                    SET uri = $2, title = $3, payload = $4, content_hash = $5,
                        observed_at = $6, imported_at = now()
                    WHERE id = $1 AND owner_id = $7
                    ",
                )
                .bind(source_id)
                .bind(record.uri.as_deref())
                .bind(&record.title)
                .bind(&record.payload)
                .bind(&content_hash)
                .bind(record.observed_at)
                .bind(job.owner_id)
                .execute(&mut *transaction)
                .await?;
                let supersedes_id = sqlx::query_scalar::<_, Uuid>(
                    r"
                    UPDATE memories
                    SET superseded_at = now(), updated_at = now()
                    WHERE owner_id = $1 AND source_id = $2 AND superseded_at IS NULL
                    RETURNING id
                    ",
                )
                .bind(job.owner_id)
                .bind(source_id)
                .fetch_optional(&mut *transaction)
                .await?;
                (source_id, supersedes_id)
            } else {
                let source_id = sqlx::query_scalar::<_, Uuid>(
                    r"
                    INSERT INTO source_records (
                        owner_id, source_kind, external_id, uri, title, payload,
                        content_hash, observed_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING id
                    ",
                )
                .bind(job.owner_id)
                .bind(provider)
                .bind(&record.external_id)
                .bind(record.uri.as_deref())
                .bind(&record.title)
                .bind(&record.payload)
                .bind(&content_hash)
                .bind(record.observed_at)
                .fetch_one(&mut *transaction)
                .await?;
                (source_id, None)
            };
            let input = MemoryInput {
                kind: "event".to_owned(),
                title: record.title,
                body_markdown: record.body_markdown,
                document_path: None,
                domain: provider.to_owned(),
                subject: None,
                predicate: None,
                object_value: None,
                epistemic_status: "imported".to_owned(),
                confidence: 1.0,
                importance: 4,
                occurred_start: record.observed_at,
                occurred_end: None,
                temporal_precision: if record.observed_at.is_some() {
                    "minute".to_owned()
                } else {
                    "unknown".to_owned()
                },
                source_id: Some(source_id),
                source_message_id: None,
                evidence_excerpt: None,
                derived_from_id: None,
            };
            let vector = crate::openai::vector_literal(&embedding);
            insert_memory(
                &mut *transaction,
                job.owner_id,
                &input,
                &vector,
                supersedes_id,
            )
            .await?;
            changed += 1;
        }
        let connector_update = sqlx::query(
            r"
            UPDATE connectors
            SET status = 'connected', sync_cursor = $2, last_synced_at = now(),
                last_error = NULL, updated_at = now()
            WHERE id = $1 AND owner_id = $3
              AND status IN ('connected', 'syncing', 'error')
            ",
        )
        .bind(connector_id)
        .bind(next_cursor)
        .bind(job.owner_id)
        .execute(&mut *transaction)
        .await?;
        if connector_update.rows_affected() != 1 {
            return Err(AppError::NotFound {
                resource: "connector",
            });
        }
        let job_update = sqlx::query(
            r"
            UPDATE ingestion_jobs
            SET status = 'completed', completed_at = now(), last_error = NULL
            WHERE id = $1 AND owner_id = $3
              AND status = 'running' AND locked_by = $2
            ",
        )
        .bind(job.id)
        .bind(job.locked_by.as_deref())
        .bind(job.owner_id)
        .execute(&mut *transaction)
        .await?;
        if job_update.rows_affected() != 1 {
            return Err(AppError::Conflict(
                "ingestion job lease is no longer active".to_owned(),
            ));
        }
        audit(
            &mut transaction,
            Some(job.owner_id),
            "ingestion.completed",
            "ingestion_job",
            Some(job.id),
            &serde_json::json!({"records_changed": changed, "provider": provider}),
        )
        .await?;
        transaction.commit().await?;
        Ok(changed)
    }

    pub async fn create_health_measurement(
        &self,
        owner_id: Uuid,
        input: &HealthMeasurementInput,
    ) -> Result<HealthMeasurement, AppError> {
        validate_nonempty("metric code", &input.metric_code)?;
        validate_nonempty("unit", &input.unit)?;
        if let Some(ended_at) = input.ended_at
            && ended_at <= input.measured_at
        {
            return Err(AppError::InvalidInput(
                "health measurement end must follow its start".to_owned(),
            ));
        }
        let mut transaction = self.pool.begin().await?;
        let measurement = sqlx::query_as::<_, HealthMeasurement>(
            r"
            INSERT INTO health_measurements (
                owner_id, source_id, metric_code, value, unit, measured_at,
                ended_at, dimensions
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, owner_id, source_id, metric_code, value, unit,
                      measured_at, ended_at, dimensions, created_at
            ",
        )
        .bind(owner_id)
        .bind(input.source_id)
        .bind(input.metric_code.trim())
        .bind(input.value)
        .bind(input.unit.trim())
        .bind(input.measured_at)
        .bind(input.ended_at)
        .bind(&input.dimensions)
        .fetch_one(&mut *transaction)
        .await?;
        audit(
            &mut transaction,
            Some(owner_id),
            "health_measurement.created",
            "health_measurement",
            Some(measurement.id),
            &serde_json::json!({"metric_code": measurement.metric_code}),
        )
        .await?;
        transaction.commit().await?;
        Ok(measurement)
    }

    pub async fn list_health_measurements(
        &self,
        owner_id: Uuid,
    ) -> Result<Vec<HealthMeasurement>, AppError> {
        sqlx::query_as::<_, HealthMeasurement>(
            r"
            SELECT id, owner_id, source_id, metric_code, value, unit,
                   measured_at, ended_at, dimensions, created_at
            FROM health_measurements
            WHERE owner_id = $1
            ORDER BY measured_at DESC
            LIMIT 1000
            ",
        )
        .bind(owner_id)
        .fetch_all(&self.pool)
        .await
        .map_err(AppError::from)
    }

    pub async fn export_owner(&self, owner_id: Uuid) -> Result<OwnerExport, AppError> {
        let owner = self.owner(owner_id).await?;
        let memories = sqlx::query_as::<_, Memory>(
            r"
            SELECT id, owner_id, kind, title, body_markdown, document_path, domain,
                   subject, predicate, object_value, epistemic_status, confidence,
                   importance, occurred_start, occurred_end,
                   temporal_precision, source_id, source_message_id, evidence_excerpt,
                   derived_from_id, supersedes_id, superseded_at, recorded_at, updated_at
            FROM memories WHERE owner_id = $1 ORDER BY recorded_at, id
            ",
        )
        .bind(owner_id)
        .fetch_all(&self.pool)
        .await?;
        let source_records = sqlx::query_as::<_, SourceRecord>(
            r"
            SELECT id, owner_id, source_kind, external_id, uri, title, payload,
                   content_hash, observed_at, imported_at
            FROM source_records WHERE owner_id = $1 ORDER BY imported_at, id
            ",
        )
        .bind(owner_id)
        .fetch_all(&self.pool)
        .await?;
        let conversations = sqlx::query_as::<_, Conversation>(
            r"
            SELECT id, owner_id, mode, title, status, created_at, updated_at
            FROM conversations WHERE owner_id = $1 ORDER BY created_at, id
            ",
        )
        .bind(owner_id)
        .fetch_all(&self.pool)
        .await?;
        let realtime_sessions = sqlx::query_as::<_, RealtimeSession>(
            r"
            SELECT id, owner_id, conversation_id, openai_session_id, status,
                   expires_at, created_at, closed_at
            FROM realtime_sessions
            WHERE owner_id = $1
            ORDER BY created_at, id
            ",
        )
        .bind(owner_id)
        .fetch_all(&self.pool)
        .await?;
        let messages = sqlx::query_as::<_, Message>(
            r"
            SELECT id, owner_id, conversation_id, role, content, input_modality,
                   provider_response_id, cited_memory_ids, created_at
            FROM messages WHERE owner_id = $1 ORDER BY created_at, id
            ",
        )
        .bind(owner_id)
        .fetch_all(&self.pool)
        .await?;
        let connectors = self.list_connectors(owner_id).await?;
        let ingestion_jobs = sqlx::query_as::<_, IngestionJob>(
            r"
            SELECT id, owner_id, connector_id, job_kind, payload, status,
                   attempts, available_at, locked_at, locked_by, last_error,
                   created_at, completed_at
            FROM ingestion_jobs WHERE owner_id = $1 ORDER BY created_at, id
            ",
        )
        .bind(owner_id)
        .fetch_all(&self.pool)
        .await?;
        let health_measurements = self.list_health_measurements(owner_id).await?;
        let audit_events = self.audit_events(owner_id).await?;
        Ok(OwnerExport {
            exported_at: chrono::Utc::now(),
            owner,
            memories,
            source_records,
            conversations,
            realtime_sessions,
            messages,
            connectors,
            ingestion_jobs,
            health_measurements,
            audit_events,
        })
    }
}

async fn audit(
    transaction: &mut Transaction<'_, Postgres>,
    owner_id: Option<Uuid>,
    action: &str,
    resource_kind: &str,
    resource_id: Option<Uuid>,
    metadata: &serde_json::Value,
) -> Result<(), AppError> {
    sqlx::query(
        r"
        INSERT INTO audit_events (
            owner_id, action, resource_kind, resource_id, metadata
        )
        VALUES ($1, $2, $3, $4, $5)
        ",
    )
    .bind(owner_id)
    .bind(action)
    .bind(resource_kind)
    .bind(resource_id)
    .bind(metadata)
    .execute(&mut **transaction)
    .await?;
    Ok(())
}

fn imported_content_hash(record: &ImportedRecord) -> Result<String, AppError> {
    let payload = serde_json::to_vec(&record.payload)
        .map_err(|error| AppError::InvalidProviderResponse(error.to_string()))?;
    let mut hash = Sha256::new();
    hash.update(record.title.as_bytes());
    hash.update([0]);
    hash.update(record.body_markdown.as_bytes());
    hash.update([0]);
    hash.update(payload);
    Ok(hex::encode(hash.finalize()))
}

fn validate_provider(provider: &str) -> Result<(), AppError> {
    if matches!(provider, "github" | "linear" | "gmail") {
        return Ok(());
    }
    Err(AppError::InvalidInput(format!(
        "unsupported connector provider: {provider}"
    )))
}

#[allow(clippy::too_many_arguments)]
async fn insert_message(
    transaction: &mut Transaction<'_, Postgres>,
    owner_id: Uuid,
    conversation_id: Uuid,
    role: &str,
    content: &str,
    input_modality: &str,
    provider_response_id: Option<&str>,
    cited_memory_ids: &[Uuid],
) -> Result<Message, AppError> {
    sqlx::query_as::<_, Message>(
        r"
        INSERT INTO messages (
            owner_id, conversation_id, role, content, input_modality,
            provider_response_id, cited_memory_ids
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, owner_id, conversation_id, role, content, input_modality,
                  provider_response_id, cited_memory_ids, created_at
        ",
    )
    .bind(owner_id)
    .bind(conversation_id)
    .bind(role)
    .bind(content)
    .bind(input_modality)
    .bind(provider_response_id)
    .bind(cited_memory_ids)
    .fetch_one(&mut **transaction)
    .await
    .map_err(AppError::from)
}

async fn insert_memory<'e, E>(
    executor: E,
    owner_id: Uuid,
    input: &MemoryInput,
    embedding: &str,
    supersedes_id: Option<Uuid>,
) -> Result<Memory, AppError>
where
    E: sqlx::Executor<'e, Database = Postgres>,
{
    sqlx::query_as::<_, Memory>(INSERT_MEMORY_SQL)
        .bind(owner_id)
        .bind(&input.kind)
        .bind(input.title.trim())
        .bind(&input.body_markdown)
        .bind(input.document_path.as_deref())
        .bind(input.domain.trim())
        .bind(input.subject.as_deref())
        .bind(input.predicate.as_deref())
        .bind(&input.object_value)
        .bind(&input.epistemic_status)
        .bind(input.confidence)
        .bind(input.importance)
        .bind(input.occurred_start)
        .bind(input.occurred_end)
        .bind(&input.temporal_precision)
        .bind(input.source_id)
        .bind(input.source_message_id)
        .bind(input.evidence_excerpt.as_deref())
        .bind(input.derived_from_id)
        .bind(supersedes_id)
        .bind(embedding)
        .fetch_one(executor)
        .await
        .map_err(AppError::from)
}

fn validate_memory(input: &MemoryInput) -> Result<(), AppError> {
    validate_nonempty("kind", &input.kind)?;
    validate_nonempty("title", &input.title)?;
    validate_nonempty("body_markdown", &input.body_markdown)?;
    validate_nonempty("domain", &input.domain)?;
    if !matches!(
        input.kind.as_str(),
        "document"
            | "event"
            | "fact"
            | "identity"
            | "relationship"
            | "belief"
            | "emotion"
            | "goal"
            | "regret"
            | "secret"
            | "journal"
            | "reflection"
            | "health"
            | "research"
            | "life_period"
            | "person"
            | "place"
            | "project"
            | "decision"
            | "achievement"
            | "habit"
            | "preference"
            | "value"
    ) {
        return Err(AppError::InvalidInput("invalid memory kind".to_owned()));
    }
    if !matches!(
        input.epistemic_status.as_str(),
        "user_stated"
            | "observed"
            | "imported"
            | "researched"
            | "inferred"
            | "disputed"
            | "retracted"
            | "superseded"
    ) {
        return Err(AppError::InvalidInput(
            "invalid epistemic status".to_owned(),
        ));
    }
    if !matches!(
        input.temporal_precision.as_str(),
        "unknown" | "year" | "month" | "day" | "minute" | "interval"
    ) {
        return Err(AppError::InvalidInput(
            "invalid temporal precision".to_owned(),
        ));
    }
    if input.document_path.is_some() && !matches!(input.kind.as_str(), "document" | "journal") {
        return Err(AppError::InvalidInput(
            "only documents and journals can have a document path".to_owned(),
        ));
    }
    if !(0.0..=1.0).contains(&input.confidence) {
        return Err(AppError::InvalidInput(
            "confidence must be between 0 and 1".to_owned(),
        ));
    }
    if !(0..=10).contains(&input.importance) {
        return Err(AppError::InvalidInput(
            "importance must be between 0 and 10".to_owned(),
        ));
    }
    if let (Some(start), Some(end)) = (input.occurred_start, input.occurred_end)
        && end <= start
    {
        return Err(AppError::InvalidInput(
            "occurred_end must be after occurred_start".to_owned(),
        ));
    }
    Ok(())
}

fn validate_embedding(embedding: &[f32]) -> Result<(), AppError> {
    if embedding.len() != 1536 || embedding.iter().any(|value| !value.is_finite()) {
        return Err(AppError::InvalidProviderResponse(
            "embedding must contain exactly 1536 finite values".to_owned(),
        ));
    }
    Ok(())
}

fn validate_nonempty(field: &str, value: &str) -> Result<(), AppError> {
    if value.trim().is_empty() {
        return Err(AppError::InvalidInput(format!("{field} cannot be empty")));
    }
    Ok(())
}
