use std::env;

use chrono::{Duration, Utc};
use life_agent::crypto::TokenCipher;
use life_agent::db::Repository;
use life_agent::models::{
    AgentMemoryCandidate, AgentResponse, CreateConversationRequest, HealthMeasurementInput,
    ImportedRecord, ListMemoriesQuery, MemoryInput, Owner, ResearchMemoryCandidate, TimelineQuery,
};
use serde_json::json;
use sqlx::postgres::PgPoolOptions;
use sqlx::{AssertSqlSafe, PgPool, Row};
use url::Url;
use uuid::Uuid;

const EMBEDDING_DIMENSIONS: usize = 1536;

#[tokio::test]
async fn postgres_lifecycle_is_append_only_searchable_and_idempotent() {
    let database = TestDatabase::create().await;
    let repository = Repository::new(database.pool.clone());
    let token = "test-owner-token-00000000000000000000000000000000";
    let owner = provision_owner(&database.pool, "Test Owner", token).await;
    assert_eq!(
        repository.authenticate_api_token(token).await.unwrap(),
        owner.id
    );

    let original = repository
        .create_memory(
            owner.id,
            &memory_input("Studied physics", "I studied physics in Lund."),
            &zero_embedding(),
        )
        .await
        .unwrap();
    let hits = repository
        .hybrid_search(
            owner.id,
            "physics Lund",
            &zero_embedding(),
            &["private".to_owned()],
            10,
        )
        .await
        .unwrap();
    assert_eq!(hits.first().map(|hit| hit.id), Some(original.id));

    let revision = repository
        .revise_memory(
            owner.id,
            original.id,
            &memory_input(
                "Studied theoretical physics",
                "I studied theoretical physics in Lund.",
            ),
            &zero_embedding(),
        )
        .await
        .unwrap();
    assert_eq!(revision.supersedes_id, Some(original.id));
    assert!(
        repository
            .memory(owner.id, original.id)
            .await
            .unwrap()
            .superseded_at
            .is_some()
    );
    let active = repository
        .list_memories(
            owner.id,
            &ListMemoriesQuery {
                kind: None,
                domain: None,
                limit: 50,
                offset: 0,
            },
        )
        .await
        .unwrap();
    assert_eq!(active.len(), 1);

    let conversation = repository
        .create_conversation(
            owner.id,
            &CreateConversationRequest {
                mode: "conversation".to_owned(),
                title: "Getting acquainted".to_owned(),
            },
        )
        .await
        .unwrap();
    let turn = repository
        .commit_agent_turn(
            owner.id,
            conversation.id,
            "My goal is to build a durable company.",
            "text",
            "resp_test",
            AgentResponse {
                answer: "That goal is now recorded.".to_owned(),
                memory_candidates: vec![AgentMemoryCandidate {
                    kind: "goal".to_owned(),
                    title: "Build a durable company".to_owned(),
                    body_markdown: "The owner wants to build a durable company.".to_owned(),
                    domain: "work".to_owned(),
                    subject: Some("owner".to_owned()),
                    predicate: Some("goal".to_owned()),
                    object_value: Some(json!("build a durable company")),
                    sensitivity: "private".to_owned(),
                    confidence: 1.0,
                    importance: 8,
                    occurred_start: None,
                    occurred_end: None,
                    temporal_precision: "unknown".to_owned(),
                    evidence_excerpt: "My goal is to build a durable company.".to_owned(),
                }],
                contradictions: Vec::new(),
                cited_memory_ids: Vec::new(),
                follow_up_question: None,
            },
            vec![zero_embedding()],
        )
        .await
        .unwrap();
    assert_eq!(turn.created_memories.len(), 1);
    assert!(
        repository
            .commit_agent_turn(
                owner.id,
                conversation.id,
                "A duplicate delivery must not be stored.",
                "text",
                "resp_test",
                AgentResponse {
                    answer: "A duplicate delivery must not be stored.".to_owned(),
                    memory_candidates: Vec::new(),
                    contradictions: Vec::new(),
                    cited_memory_ids: Vec::new(),
                    follow_up_question: None,
                },
                Vec::new(),
            )
            .await
            .is_err()
    );
    assert_eq!(
        repository
            .conversation_messages(owner.id, conversation.id, 100)
            .await
            .unwrap()
            .len(),
        2
    );

    let measurement_time = Utc::now();
    let measurement_input = HealthMeasurementInput {
        source_id: None,
        metric_code: "resting_heart_rate".to_owned(),
        value: 54.0,
        unit: "beats/minute".to_owned(),
        measured_at: measurement_time,
        ended_at: None,
        dimensions: json!({"device": "future-device"}),
    };
    let measurement = repository
        .create_health_measurement(owner.id, &measurement_input)
        .await
        .unwrap();
    assert_eq!(measurement.metric_code, "resting_heart_rate");
    assert!(
        repository
            .create_health_measurement(owner.id, &measurement_input)
            .await
            .is_err()
    );
    assert!(
        !repository
            .timeline(
                owner.id,
                &TimelineQuery {
                    start: None,
                    end: None,
                    domain: None,
                    limit: 100,
                },
            )
            .await
            .unwrap()
            .is_empty()
    );

    let researched_memories = repository
        .commit_research(
            owner.id,
            "resp_research_test",
            "Test Owner public profile",
            "The owner founded Example AB and spoke at RustConf.",
            &json!({"citations": [{"url": "https://example.com/profile"}]}),
            "research-content-hash",
            "standard",
            vec![
                research_candidate(
                    "Founded Example AB",
                    "The owner founded Example AB.",
                    "founded Example AB",
                ),
                research_candidate(
                    "Spoke at RustConf",
                    "The owner spoke at RustConf.",
                    "spoke at RustConf",
                ),
            ],
            vec![unit_embedding(), unit_embedding()],
        )
        .await
        .unwrap();
    assert_eq!(researched_memories.len(), 2);
    assert_eq!(
        researched_memories[0].source_id,
        researched_memories[1].source_id
    );
    let exact_hits = repository
        .exact_vector_search(owner.id, &unit_embedding(), &["standard".to_owned()], 10)
        .await
        .unwrap();
    assert_eq!(exact_hits.len(), 2);

    let state_hash = [11_u8; 32];
    let connector_id = repository
        .create_oauth_state(owner.id, "github", &state_hash)
        .await
        .unwrap();
    assert_eq!(
        repository
            .consume_oauth_state("github", &state_hash)
            .await
            .unwrap(),
        owner.id
    );
    assert!(
        repository
            .consume_oauth_state("github", &state_hash)
            .await
            .is_err()
    );
    let cipher = TokenCipher::new(&[9_u8; 32]).unwrap();
    let access = cipher
        .encrypt("github-access-token", connector_id.as_bytes())
        .unwrap();
    repository
        .connect_connector(
            owner.id,
            "github",
            "42",
            "test-owner",
            &["repo".to_owned()],
            &access,
            None,
            None,
        )
        .await
        .unwrap();
    let queued = repository
        .enqueue_connector_sync(owner.id, connector_id)
        .await
        .unwrap();
    let claimed = repository
        .claim_next_job("integration-worker")
        .await
        .unwrap()
        .unwrap();
    assert_eq!(queued.id, claimed.id);
    let record = ImportedRecord {
        external_id: "event-1".to_owned(),
        uri: Some("https://github.com/example/repository".to_owned()),
        title: "GitHub PushEvent in example/repository".to_owned(),
        payload: json!({"type": "PushEvent"}),
        body_markdown: "Pushed a commit to example/repository.".to_owned(),
        observed_at: Some(Utc::now()),
    };
    let changed = repository
        .ingest_connector_records(
            &claimed,
            connector_id,
            "github",
            vec![record.clone()],
            vec![zero_embedding()],
            &json!({"last_event_id": "event-1"}),
        )
        .await
        .unwrap();
    assert_eq!(changed, 1);
    assert_eq!(
        repository.job(owner.id, claimed.id).await.unwrap().status,
        "completed"
    );
    let initial_imported_memory_id: Uuid = sqlx::query_scalar(
        r"
        SELECT memories.id
        FROM memories
        JOIN source_records ON source_records.id = memories.source_id
        WHERE source_records.external_id = 'event-1' AND memories.superseded_at IS NULL
        ",
    )
    .fetch_one(&database.pool)
    .await
    .unwrap();

    let queued_second = repository
        .enqueue_connector_sync(owner.id, connector_id)
        .await
        .unwrap();
    let second = repository
        .claim_next_job("integration-worker")
        .await
        .unwrap()
        .unwrap();
    assert_eq!(queued_second.id, second.id);
    let changed = repository
        .ingest_connector_records(
            &second,
            connector_id,
            "github",
            vec![record.clone()],
            vec![zero_embedding()],
            &json!({"last_event_id": "event-1"}),
        )
        .await
        .unwrap();
    assert_eq!(changed, 0);

    let queued_third = repository
        .enqueue_connector_sync(owner.id, connector_id)
        .await
        .unwrap();
    let third = repository
        .claim_next_job("integration-worker")
        .await
        .unwrap()
        .unwrap();
    assert_eq!(queued_third.id, third.id);
    let mut changed_record = record;
    changed_record.body_markdown = "Pushed two commits to example/repository.".to_owned();
    repository
        .ingest_connector_records(
            &third,
            connector_id,
            "github",
            vec![changed_record],
            vec![zero_embedding()],
            &json!({"last_event_id": "event-1"}),
        )
        .await
        .unwrap();
    let revised_imported_memory: (Uuid, Option<Uuid>) = sqlx::query_as(
        r"
        SELECT memories.id, memories.supersedes_id
        FROM memories
        JOIN source_records ON source_records.id = memories.source_id
        WHERE source_records.external_id = 'event-1' AND memories.superseded_at IS NULL
        ",
    )
    .fetch_one(&database.pool)
    .await
    .unwrap();
    assert_ne!(revised_imported_memory.0, initial_imported_memory_id);
    assert_eq!(revised_imported_memory.1, Some(initial_imported_memory_id));

    let export = repository.export_owner(owner.id).await.unwrap();
    assert!(export.memories.len() >= 5);
    assert!(export.source_records.len() >= 2);
    assert_eq!(export.connectors.len(), 1);
    assert_eq!(export.ingestion_jobs.len(), 3);
    assert_eq!(export.health_measurements.len(), 1);
    assert!(
        export
            .audit_events
            .iter()
            .any(|event| event.action == "owner.created")
    );
    assert!(
        export
            .audit_events
            .iter()
            .any(|event| event.action == "conversation.turn_committed")
    );
    assert!(
        export
            .audit_events
            .iter()
            .any(|event| event.action == "health_measurement.created")
    );
    let extension_count: i64 =
        sqlx::query("SELECT count(*) FROM pg_extension WHERE extname = 'vector'")
            .fetch_one(&database.pool)
            .await
            .unwrap()
            .get(0);
    assert_eq!(extension_count, 1);

    repository.delete_owner(owner.id).await.unwrap();
    let remaining_owner_rows: i64 = sqlx::query_scalar(
        r"
        SELECT
            (SELECT count(*) FROM owners)
          + (SELECT count(*) FROM memories)
          + (SELECT count(*) FROM audit_events)
          + (SELECT count(*) FROM health_measurements)
        ",
    )
    .fetch_one(&database.pool)
    .await
    .unwrap();
    assert_eq!(remaining_owner_rows, 0);

    database.destroy().await;
}

#[tokio::test]
async fn postgres_credentials_and_data_are_isolated_by_owner() {
    let database = TestDatabase::create().await;
    let repository = Repository::new(database.pool.clone());
    let first_token = "first-owner-token-0000000000000000000000000000000";
    let second_token = "second-owner-token-000000000000000000000000000000";
    let first = provision_owner(&database.pool, "First Owner", first_token).await;
    let second = provision_owner(&database.pool, "Second Owner", second_token).await;

    assert_eq!(
        repository
            .authenticate_api_token(first_token)
            .await
            .unwrap(),
        first.id
    );
    assert_eq!(
        repository
            .authenticate_api_token(second_token)
            .await
            .unwrap(),
        second.id
    );
    assert!(
        repository
            .authenticate_api_token("unknown-token-00000000000000000000000000000000")
            .await
            .is_err()
    );

    let first_memory = repository
        .create_memory(
            first.id,
            &memory_input("First private memory", "Only the first owner said this."),
            &zero_embedding(),
        )
        .await
        .unwrap();
    let second_memory = repository
        .create_memory(
            second.id,
            &memory_input("Second private memory", "Only the second owner said this."),
            &zero_embedding(),
        )
        .await
        .unwrap();
    assert!(repository.memory(first.id, second_memory.id).await.is_err());
    assert!(repository.memory(second.id, first_memory.id).await.is_err());
    assert_eq!(
        repository
            .list_memories(
                first.id,
                &ListMemoriesQuery {
                    kind: None,
                    domain: None,
                    limit: 50,
                    offset: 0,
                },
            )
            .await
            .unwrap()
            .len(),
        1
    );

    let second_source_id: Uuid = sqlx::query_scalar(
        r"
        INSERT INTO source_records (
            owner_id, source_kind, external_id, content_hash
        )
        VALUES ($1, 'test', 'second-source', 'second-source-hash')
        RETURNING id
        ",
    )
    .bind(second.id)
    .fetch_one(&database.pool)
    .await
    .unwrap();
    let mut cross_owner_input = memory_input("Invalid source", "Cross-owner source reference.");
    cross_owner_input.source_id = Some(second_source_id);
    assert!(
        repository
            .create_memory(first.id, &cross_owner_input, &zero_embedding())
            .await
            .is_err()
    );

    let (second_conversation, second_realtime) = repository
        .create_realtime_session(
            second.id,
            "Second owner's voice session",
            "sess_second_owner",
            &["standard".to_owned(), "private".to_owned()],
            Utc::now() + Duration::minutes(10),
        )
        .await
        .unwrap();
    assert_eq!(second_realtime.conversation_id, second_conversation.id);
    assert!(
        repository
            .realtime_session(first.id, second_realtime.id)
            .await
            .is_err()
    );
    assert!(
        repository
            .commit_agent_turn(
                first.id,
                second_conversation.id,
                "This must not be stored.",
                "voice",
                "resp_cross_owner",
                AgentResponse {
                    answer: "This must not be stored.".to_owned(),
                    memory_candidates: Vec::new(),
                    contradictions: Vec::new(),
                    cited_memory_ids: Vec::new(),
                    follow_up_question: None,
                },
                Vec::new(),
            )
            .await
            .is_err()
    );
    let closed_session = repository
        .close_realtime_session(second.id, second_realtime.id)
        .await
        .unwrap();
    assert_eq!(closed_session.status, "closed");
    assert!(
        repository
            .active_realtime_session(second.id, second_realtime.id)
            .await
            .is_err()
    );

    repository.delete_owner(first.id).await.unwrap();
    assert_eq!(repository.owner(second.id).await.unwrap().id, second.id);
    assert_eq!(
        repository
            .list_memories(
                second.id,
                &ListMemoriesQuery {
                    kind: None,
                    domain: None,
                    limit: 50,
                    offset: 0,
                },
            )
            .await
            .unwrap()
            .len(),
        1
    );

    database.destroy().await;
}

async fn provision_owner(pool: &PgPool, display_name: &str, token: &str) -> Owner {
    let mut transaction = pool.begin().await.unwrap();
    let owner = sqlx::query_as::<_, Owner>(
        r"
        INSERT INTO owners (
            display_name, timezone, locale, profile_markdown
        )
        VALUES ($1, 'Europe/Stockholm', 'en', 'Developer and entrepreneur.')
        RETURNING id, display_name, timezone, locale, profile_markdown,
                  created_at, updated_at
        ",
    )
    .bind(display_name)
    .fetch_one(&mut *transaction)
    .await
    .unwrap();
    sqlx::query(
        r"
        INSERT INTO api_credentials (owner_id, label, token_hash)
        VALUES ($1, 'integration test', digest($2, 'sha256'))
        ",
    )
    .bind(owner.id)
    .bind(token)
    .execute(&mut *transaction)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO audit_events (
            owner_id, action, resource_kind, resource_id, metadata
        )
        VALUES ($1, 'owner.created', 'owner', $1, '{"provisioned_by":"test"}'::jsonb)
        "#,
    )
    .bind(owner.id)
    .execute(&mut *transaction)
    .await
    .unwrap();
    transaction.commit().await.unwrap();
    owner
}

fn memory_input(title: &str, body_markdown: &str) -> MemoryInput {
    MemoryInput {
        kind: "fact".to_owned(),
        title: title.to_owned(),
        body_markdown: body_markdown.to_owned(),
        document_path: None,
        domain: "education".to_owned(),
        subject: Some("owner".to_owned()),
        predicate: Some("studied".to_owned()),
        object_value: Some(json!("physics")),
        epistemic_status: "user_stated".to_owned(),
        sensitivity: "private".to_owned(),
        confidence: 1.0,
        importance: 7,
        occurred_start: None,
        occurred_end: None,
        temporal_precision: "unknown".to_owned(),
        source_id: None,
        source_message_id: None,
        evidence_excerpt: None,
        derived_from_id: None,
    }
}

fn zero_embedding() -> Vec<f32> {
    vec![0.0; EMBEDDING_DIMENSIONS]
}

fn unit_embedding() -> Vec<f32> {
    let mut embedding = zero_embedding();
    embedding[0] = 1.0;
    embedding
}

fn research_candidate(
    title: &str,
    body_markdown: &str,
    evidence_excerpt: &str,
) -> ResearchMemoryCandidate {
    ResearchMemoryCandidate {
        title: title.to_owned(),
        body_markdown: body_markdown.to_owned(),
        domain: "public_profile".to_owned(),
        subject: Some("owner".to_owned()),
        predicate: Some("public_activity".to_owned()),
        object_value: None,
        confidence: 0.9,
        importance: 6,
        occurred_start: None,
        occurred_end: None,
        temporal_precision: "unknown".to_owned(),
        evidence_excerpt: evidence_excerpt.to_owned(),
        source_urls: vec!["https://example.com/profile".to_owned()],
    }
}

struct TestDatabase {
    admin_url: Url,
    name: String,
    pool: PgPool,
}

impl TestDatabase {
    async fn create() -> Self {
        let admin_url = Url::parse(
            &env::var("LIFE_TEST_DATABASE_URL")
                .expect("LIFE_TEST_DATABASE_URL must point to a PostgreSQL admin database"),
        )
        .unwrap();
        let admin = PgPoolOptions::new()
            .max_connections(1)
            .connect(admin_url.as_str())
            .await
            .unwrap();
        let name = format!("life_test_{}", Uuid::new_v4().simple());
        // `name` contains only the fixed prefix and UUID hex generated above.
        sqlx::raw_sql(AssertSqlSafe(format!("CREATE DATABASE \"{name}\"")))
            .execute(&admin)
            .await
            .unwrap();
        admin.close().await;
        let mut database_url = admin_url.clone();
        database_url.set_path(&name);
        let pool = PgPoolOptions::new()
            .max_connections(5)
            .connect(database_url.as_str())
            .await
            .unwrap();
        sqlx::migrate!().run(&pool).await.unwrap();
        Self {
            admin_url,
            name,
            pool,
        }
    }

    async fn destroy(self) {
        self.pool.close().await;
        let admin = PgPoolOptions::new()
            .max_connections(1)
            .connect(self.admin_url.as_str())
            .await
            .unwrap();
        // `name` contains only the fixed prefix and UUID hex generated in `create`.
        sqlx::raw_sql(AssertSqlSafe(format!("DROP DATABASE \"{}\"", self.name)))
            .execute(&admin)
            .await
            .unwrap();
        admin.close().await;
    }
}
