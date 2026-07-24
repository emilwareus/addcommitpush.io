BEGIN;

UPDATE owners
SET locale = 'en-SE',
    profile_markdown = 'I build developer tools and value calm, focused conversations. Current projects: DemoHunter and Life.',
    updated_at = now()
WHERE id = 'b7ac3a03-9e30-41b0-b44e-82e5988546c6';

DELETE FROM audit_events WHERE owner_id = 'b7ac3a03-9e30-41b0-b44e-82e5988546c6';
DELETE FROM ingestion_jobs WHERE owner_id = 'b7ac3a03-9e30-41b0-b44e-82e5988546c6';
DELETE FROM connectors WHERE owner_id = 'b7ac3a03-9e30-41b0-b44e-82e5988546c6';
DELETE FROM health_measurements WHERE owner_id = 'b7ac3a03-9e30-41b0-b44e-82e5988546c6';
DELETE FROM realtime_sessions WHERE owner_id = 'b7ac3a03-9e30-41b0-b44e-82e5988546c6';
DELETE FROM memories WHERE owner_id = 'b7ac3a03-9e30-41b0-b44e-82e5988546c6';
DELETE FROM messages WHERE owner_id = 'b7ac3a03-9e30-41b0-b44e-82e5988546c6';
DELETE FROM conversations WHERE owner_id = 'b7ac3a03-9e30-41b0-b44e-82e5988546c6';
DELETE FROM source_records WHERE owner_id = 'b7ac3a03-9e30-41b0-b44e-82e5988546c6';

INSERT INTO memories (
  id, owner_id, kind, title, body_markdown, domain, subject, predicate, object_value,
  epistemic_status, confidence, importance, occurred_start, occurred_end,
  temporal_precision, evidence_excerpt, recorded_at, updated_at
) VALUES
  (
    '10000000-0000-4000-8000-000000000001',
    'b7ac3a03-9e30-41b0-b44e-82e5988546c6',
    'project', 'Building DemoHunter',
    'DemoHunter turns browser product tours into repeatable narrated videos, captions, chapters, and portable artifacts.\n\nThe project is local-first and keeps ordinary browser automation readable.',
    'work', 'DemoHunter', 'project_status', '"active"', 'user_stated', 1, 10,
    '2026-02-03T09:00:00+01:00', NULL, 'day',
    'DemoHunter is the current developer-tooling focus.',
    '2026-02-03T09:15:00+01:00', '2026-07-15T10:00:00+02:00'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'b7ac3a03-9e30-41b0-b44e-82e5988546c6',
    'event', 'Started building DemoHunter',
    'Started the first implementation pass for an open-source narrated demo generator.',
    'work', 'owner', 'started_project', '"DemoHunter"', 'observed', 0.98, 9,
    '2026-02-03T09:00:00+01:00', '2026-02-03T18:00:00+01:00', 'interval',
    'Initial implementation began on February third.',
    '2026-02-03T18:10:00+01:00', '2026-02-03T18:10:00+01:00'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'b7ac3a03-9e30-41b0-b44e-82e5988546c6',
    'decision', 'Keep demos local-first',
    'The workflow must render locally and produce portable artifacts without requiring a hosted service.',
    'work', 'DemoHunter', 'architecture_decision', '"local-first"', 'user_stated', 1, 9,
    '2026-02-10T14:00:00+01:00', NULL, 'minute', NULL,
    '2026-02-10T14:05:00+01:00', '2026-02-10T14:05:00+01:00'
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'b7ac3a03-9e30-41b0-b44e-82e5988546c6',
    'goal', 'Make Life voice-first',
    'The main Life experience should be a natural conversation that records memories and explores what has already been shared.',
    'work', 'owner', 'goal', '"voice-first Life"', 'user_stated', 1, 10,
    '2026-07-15T09:00:00+02:00', NULL, 'day', NULL,
    '2026-07-15T09:00:00+02:00', '2026-07-15T09:00:00+02:00'
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    'b7ac3a03-9e30-41b0-b44e-82e5988546c6',
    'preference', 'Best focus time is early morning',
    'Deep technical work feels most productive before nine in the morning.',
    'habits', 'owner', 'preferred_focus_time', '"early morning"', 'user_stated', 0.95, 7,
    '2026-05-01T08:00:00+02:00', NULL, 'month', NULL,
    '2026-05-01T08:00:00+02:00', '2026-05-01T08:00:00+02:00'
  ),
  (
    '10000000-0000-4000-8000-000000000006',
    'b7ac3a03-9e30-41b0-b44e-82e5988546c6',
    'reflection', 'A useful personal agent listens first',
    'A personal agent feels useful when it asks a focused question, remembers the answer, and brings it back at the right moment.',
    'personal', 'owner', 'reflection', '"listen and remember"', 'user_stated', 1, 8,
    '2026-07-14T18:15:00+02:00', NULL, 'minute', NULL,
    '2026-07-14T18:16:00+02:00', '2026-07-14T18:16:00+02:00'
  );

INSERT INTO conversations (id, owner_id, mode, title, status, created_at, updated_at) VALUES
  (
    '20000000-0000-4000-8000-000000000001',
    'b7ac3a03-9e30-41b0-b44e-82e5988546c6',
    'conversation', 'What Life should remember', 'active',
    '2026-07-14T08:00:00+02:00', '2026-07-14T08:04:00+02:00'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'b7ac3a03-9e30-41b0-b44e-82e5988546c6',
    'conversation', 'Evening voice reflection', 'completed',
    '2026-07-13T18:10:00+02:00', '2026-07-13T18:17:00+02:00'
  );

INSERT INTO messages (
  id, owner_id, conversation_id, role, content, input_modality,
  provider_response_id, cited_memory_ids, created_at
) VALUES
  (
    '21000000-0000-4000-8000-000000000001',
    'b7ac3a03-9e30-41b0-b44e-82e5988546c6',
    '20000000-0000-4000-8000-000000000001', 'user',
    'What have you learned about how I like to work?', 'text', NULL, '{}',
    '2026-07-14T08:00:00+02:00'
  ),
  (
    '21000000-0000-4000-8000-000000000002',
    'b7ac3a03-9e30-41b0-b44e-82e5988546c6',
    '20000000-0000-4000-8000-000000000001', 'assistant',
    'You do your best focused work early in the morning, and you prefer tools that stay local and produce portable artifacts. What part of that routine matters most to protect?',
    'text', 'demo-response-work-style',
    ARRAY['10000000-0000-4000-8000-000000000003'::uuid, '10000000-0000-4000-8000-000000000005'::uuid],
    '2026-07-14T08:01:00+02:00'
  ),
  (
    '21000000-0000-4000-8000-000000000003',
    'b7ac3a03-9e30-41b0-b44e-82e5988546c6',
    '20000000-0000-4000-8000-000000000002', 'user',
    'What would make a personal agent genuinely useful?', 'voice', NULL, '{}',
    '2026-07-13T18:14:00+02:00'
  ),
  (
    '21000000-0000-4000-8000-000000000004',
    'b7ac3a03-9e30-41b0-b44e-82e5988546c6',
    '20000000-0000-4000-8000-000000000002', 'assistant',
    'It should listen before it organizes: ask one focused question, remember your answer, and bring it back only when it helps.',
    'voice', 'demo-response-voice-reflection',
    ARRAY['10000000-0000-4000-8000-000000000006'::uuid],
    '2026-07-13T18:15:00+02:00'
  );

INSERT INTO connectors (
  id, owner_id, provider, external_account_id, external_account_name, status, scopes,
  sync_cursor, last_synced_at, last_error, created_at, updated_at
) VALUES
  (
    '50000000-0000-4000-8000-000000000001',
    'b7ac3a03-9e30-41b0-b44e-82e5988546c6', 'github', 'emilwareus',
    'emilwareus', 'connected', ARRAY['read:user', 'repo'], '{"page":4}',
    '2026-07-15T07:50:00+02:00', NULL,
    '2026-06-01T10:00:00+02:00', '2026-07-15T07:50:00+02:00'
  );

INSERT INTO audit_events (owner_id, action, resource_kind, resource_id, metadata, occurred_at) VALUES
  ('b7ac3a03-9e30-41b0-b44e-82e5988546c6', 'memory.created', 'memory', '10000000-0000-4000-8000-000000000004', '{"source":"voice"}', '2026-07-15T09:00:00+02:00'),
  ('b7ac3a03-9e30-41b0-b44e-82e5988546c6', 'conversation.turn_committed', 'conversation', '20000000-0000-4000-8000-000000000001', '{"cited_memories":2}', '2026-07-14T08:01:00+02:00');

COMMIT;
