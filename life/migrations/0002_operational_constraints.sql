CREATE UNIQUE INDEX interview_questions_one_asked_idx
    ON interview_questions (interview_id)
    WHERE status = 'asked';

CREATE INDEX ingestion_jobs_connector_idx
    ON ingestion_jobs (connector_id, created_at DESC)
    WHERE connector_id IS NOT NULL;

CREATE INDEX audit_events_action_idx
    ON audit_events (action, occurred_at DESC);

CREATE UNIQUE INDEX messages_conversation_provider_response_idx
    ON messages (owner_id, conversation_id, provider_response_id)
    WHERE provider_response_id IS NOT NULL;

ALTER TABLE source_records
    ADD CONSTRAINT source_records_owner_id_id_key UNIQUE (owner_id, id);
ALTER TABLE memories
    ADD CONSTRAINT memories_owner_id_id_key UNIQUE (owner_id, id);
ALTER TABLE conversations
    ADD CONSTRAINT conversations_owner_id_id_key UNIQUE (owner_id, id);
ALTER TABLE messages
    ADD CONSTRAINT messages_owner_id_id_key UNIQUE (owner_id, id);
ALTER TABLE interview_sessions
    ADD CONSTRAINT interview_sessions_owner_id_id_key UNIQUE (owner_id, id);
ALTER TABLE connectors
    ADD CONSTRAINT connectors_owner_id_id_key UNIQUE (owner_id, id);

ALTER TABLE memories
    ADD CONSTRAINT memories_owner_source_fk
        FOREIGN KEY (owner_id, source_id)
        REFERENCES source_records (owner_id, id),
    ADD CONSTRAINT memories_owner_source_message_fk
        FOREIGN KEY (owner_id, source_message_id)
        REFERENCES messages (owner_id, id) DEFERRABLE INITIALLY DEFERRED,
    ADD CONSTRAINT memories_owner_derived_from_fk
        FOREIGN KEY (owner_id, derived_from_id)
        REFERENCES memories (owner_id, id),
    ADD CONSTRAINT memories_owner_supersedes_fk
        FOREIGN KEY (owner_id, supersedes_id)
        REFERENCES memories (owner_id, id);

ALTER TABLE memory_edges
    ADD CONSTRAINT memory_edges_owner_from_fk
        FOREIGN KEY (owner_id, from_memory_id)
        REFERENCES memories (owner_id, id),
    ADD CONSTRAINT memory_edges_owner_to_fk
        FOREIGN KEY (owner_id, to_memory_id)
        REFERENCES memories (owner_id, id),
    ADD CONSTRAINT memory_edges_owner_source_fk
        FOREIGN KEY (owner_id, source_id)
        REFERENCES source_records (owner_id, id);

ALTER TABLE contradictions
    ADD CONSTRAINT contradictions_owner_left_fk
        FOREIGN KEY (owner_id, left_memory_id)
        REFERENCES memories (owner_id, id),
    ADD CONSTRAINT contradictions_owner_right_fk
        FOREIGN KEY (owner_id, right_memory_id)
        REFERENCES memories (owner_id, id);

ALTER TABLE messages
    ADD CONSTRAINT messages_owner_conversation_fk
        FOREIGN KEY (owner_id, conversation_id)
        REFERENCES conversations (owner_id, id);

ALTER TABLE interview_sessions
    ADD CONSTRAINT interview_sessions_owner_conversation_fk
        FOREIGN KEY (owner_id, conversation_id)
        REFERENCES conversations (owner_id, id);

ALTER TABLE interview_questions
    ADD CONSTRAINT interview_questions_owner_interview_fk
        FOREIGN KEY (owner_id, interview_id)
        REFERENCES interview_sessions (owner_id, id),
    ADD CONSTRAINT interview_questions_owner_assistant_message_fk
        FOREIGN KEY (owner_id, assistant_message_id)
        REFERENCES messages (owner_id, id),
    ADD CONSTRAINT interview_questions_owner_answer_message_fk
        FOREIGN KEY (owner_id, answer_message_id)
        REFERENCES messages (owner_id, id);

ALTER TABLE realtime_sessions
    ADD CONSTRAINT realtime_sessions_owner_conversation_fk
        FOREIGN KEY (owner_id, conversation_id)
        REFERENCES conversations (owner_id, id);

ALTER TABLE ingestion_jobs
    ADD CONSTRAINT ingestion_jobs_owner_connector_fk
        FOREIGN KEY (owner_id, connector_id)
        REFERENCES connectors (owner_id, id);

ALTER TABLE health_measurements
    ADD CONSTRAINT health_measurements_owner_source_fk
        FOREIGN KEY (owner_id, source_id)
        REFERENCES source_records (owner_id, id);
