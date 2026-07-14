CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT NOT NULL CHECK (length(btrim(display_name)) > 0),
    timezone TEXT NOT NULL,
    locale TEXT NOT NULL DEFAULT 'en',
    profile_markdown TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE api_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    label TEXT NOT NULL CHECK (length(btrim(label)) > 0),
    token_hash BYTEA NOT NULL UNIQUE CHECK (octet_length(token_hash) = 32),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX api_credentials_owner_idx
    ON api_credentials (owner_id, created_at DESC);

CREATE TABLE source_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    source_kind TEXT NOT NULL,
    external_id TEXT NOT NULL,
    uri TEXT,
    title TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    content_hash TEXT NOT NULL,
    observed_at TIMESTAMPTZ,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (owner_id, source_kind, external_id)
);

CREATE INDEX source_records_owner_kind_idx
    ON source_records (owner_id, source_kind, imported_at DESC);

CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN (
        'document', 'event', 'fact', 'identity', 'relationship', 'belief',
        'emotion', 'goal', 'regret', 'secret', 'journal', 'reflection',
        'health', 'research', 'life_period', 'person', 'place', 'project',
        'decision', 'achievement', 'habit', 'preference', 'value'
    )),
    title TEXT NOT NULL,
    body_markdown TEXT NOT NULL,
    document_path TEXT,
    domain TEXT NOT NULL,
    subject TEXT,
    predicate TEXT,
    object_value JSONB,
    epistemic_status TEXT NOT NULL CHECK (epistemic_status IN (
        'user_stated', 'observed', 'imported', 'researched', 'inferred',
        'disputed', 'retracted', 'superseded'
    )),
    sensitivity TEXT NOT NULL CHECK (sensitivity IN (
        'standard', 'private', 'intimate', 'restricted'
    )),
    confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    importance SMALLINT NOT NULL CHECK (importance BETWEEN 0 AND 10),
    occurred_start TIMESTAMPTZ,
    occurred_end TIMESTAMPTZ,
    temporal_precision TEXT NOT NULL CHECK (temporal_precision IN (
        'unknown', 'year', 'month', 'day', 'minute', 'interval'
    )),
    source_id UUID REFERENCES source_records(id) ON DELETE SET NULL,
    source_message_id UUID,
    evidence_excerpt TEXT,
    derived_from_id UUID REFERENCES memories(id) ON DELETE SET NULL,
    supersedes_id UUID REFERENCES memories(id) ON DELETE SET NULL,
    superseded_at TIMESTAMPTZ,
    embedding vector(1536),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    search_document TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(subject, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(predicate, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(body_markdown, '')), 'C')
    ) STORED,
    CHECK (occurred_end IS NULL OR occurred_start IS NOT NULL),
    CHECK (occurred_end IS NULL OR occurred_end > occurred_start),
    CHECK (document_path IS NULL OR kind IN ('document', 'journal'))
);

CREATE UNIQUE INDEX memories_active_document_path_idx
    ON memories (owner_id, document_path)
    WHERE document_path IS NOT NULL AND superseded_at IS NULL;
CREATE INDEX memories_search_document_idx ON memories USING GIN (search_document);
CREATE INDEX memories_embedding_hnsw_idx
    ON memories USING hnsw (embedding vector_cosine_ops);
CREATE INDEX memories_owner_time_idx
    ON memories (owner_id, occurred_start DESC NULLS LAST, recorded_at DESC);
CREATE INDEX memories_owner_kind_idx
    ON memories (owner_id, kind, recorded_at DESC)
    WHERE superseded_at IS NULL;
CREATE INDEX memories_structured_fact_idx
    ON memories (owner_id, subject, predicate)
    WHERE subject IS NOT NULL AND predicate IS NOT NULL AND superseded_at IS NULL;

CREATE TABLE memory_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    from_memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    relation TEXT NOT NULL,
    to_memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    source_id UUID REFERENCES source_records(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (from_memory_id <> to_memory_id),
    UNIQUE (from_memory_id, relation, to_memory_id)
);

CREATE INDEX memory_edges_owner_from_idx ON memory_edges (owner_id, from_memory_id);
CREATE INDEX memory_edges_owner_to_idx ON memory_edges (owner_id, to_memory_id);

CREATE TABLE contradictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    left_memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    right_memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    explanation TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'confirmed', 'not_a_contradiction', 'resolved'
    )),
    resolution_markdown TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    CHECK (left_memory_id <> right_memory_id),
    UNIQUE (left_memory_id, right_memory_id)
);

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('conversation', 'interview', 'research')),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX conversations_owner_idx ON conversations (owner_id, updated_at DESC);

CREATE TABLE realtime_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
    openai_session_id TEXT NOT NULL UNIQUE,
    allowed_sensitivities TEXT[] NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ,
    CHECK (cardinality(allowed_sensitivities) BETWEEN 1 AND 4),
    CHECK (allowed_sensitivities <@ ARRAY[
        'standard', 'private', 'intimate', 'restricted'
    ]::TEXT[])
);

CREATE INDEX realtime_sessions_owner_idx
    ON realtime_sessions (owner_id, created_at DESC);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    input_modality TEXT NOT NULL CHECK (input_modality IN ('text', 'voice', 'system')),
    provider_response_id TEXT,
    cited_memory_ids UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX messages_conversation_idx ON messages (conversation_id, created_at, id);

ALTER TABLE memories
    ADD CONSTRAINT memories_source_message_fk
    FOREIGN KEY (source_message_id) REFERENCES messages(id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
    theme TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    questions_answered INTEGER NOT NULL DEFAULT 0 CHECK (questions_answered >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE interview_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    interview_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    rationale TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'asked' CHECK (status IN ('asked', 'answered', 'skipped')),
    assistant_message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    answer_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    answered_at TIMESTAMPTZ
);

CREATE TABLE connectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('github', 'linear', 'gmail')),
    external_account_id TEXT,
    external_account_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'connected', 'syncing', 'error', 'revoked'
    )),
    scopes TEXT[] NOT NULL DEFAULT '{}',
    access_token_ciphertext BYTEA,
    access_token_nonce BYTEA,
    refresh_token_ciphertext BYTEA,
    refresh_token_nonce BYTEA,
    token_expires_at TIMESTAMPTZ,
    sync_cursor JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_synced_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (owner_id, provider)
);

CREATE TABLE oauth_states (
    state_hash BYTEA PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('github', 'linear', 'gmail')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    connector_id UUID REFERENCES connectors(id) ON DELETE CASCADE,
    job_kind TEXT NOT NULL CHECK (job_kind = 'connector_sync'),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
        'queued', 'running', 'completed', 'failed'
    )),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX ingestion_jobs_claim_idx
    ON ingestion_jobs (available_at, created_at)
    WHERE status = 'queued';

CREATE TABLE health_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    source_id UUID REFERENCES source_records(id) ON DELETE SET NULL,
    metric_code TEXT NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit TEXT NOT NULL,
    measured_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (ended_at IS NULL OR ended_at > measured_at),
    UNIQUE NULLS NOT DISTINCT (owner_id, metric_code, measured_at, source_id)
);

CREATE INDEX health_measurements_owner_metric_time_idx
    ON health_measurements (owner_id, metric_code, measured_at DESC);

CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource_kind TEXT NOT NULL,
    resource_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_owner_time_idx
    ON audit_events (owner_id, occurred_at DESC);
