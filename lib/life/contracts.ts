import { z } from 'zod';
import {
  CONNECTOR_PROVIDERS,
  CONNECTOR_STATUSES,
  CONVERSATION_MODES,
  CONVERSATION_STATUSES,
  EPISTEMIC_STATUSES,
  JOB_STATUSES,
  MEMORY_KINDS,
  MESSAGE_MODALITIES,
  MESSAGE_ROLES,
  REALTIME_SESSION_STATUSES,
  TEMPORAL_PRECISIONS,
} from './constants';

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ])
);

export const uuidSchema = z.string().uuid();
export const isoDateTimeSchema = z.string().datetime({ offset: true });
export const memoryKindSchema = z.enum(MEMORY_KINDS);
export const epistemicStatusSchema = z.enum(EPISTEMIC_STATUSES);
export const temporalPrecisionSchema = z.enum(TEMPORAL_PRECISIONS);

export const ownerSchema = z
  .object({
    id: uuidSchema,
    display_name: z.string(),
    email: z.string().email().optional(),
    timezone: z.string().min(1),
    locale: z.string().min(1),
    profile_markdown: z.string(),
    created_at: isoDateTimeSchema,
    updated_at: isoDateTimeSchema,
  })
  .strict();

export const updateOwnerRequestSchema = z
  .object({
    display_name: z.string().trim().min(1).max(300),
    timezone: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: value }).format();
          return true;
        } catch {
          return false;
        }
      }, 'Timezone must be a valid IANA timezone.'),
    locale: z.string().trim().min(1).max(100),
    profile_markdown: z.string().max(100_000),
  })
  .strict();

const nullableUuidSchema = uuidSchema.nullable();
const nullableDateTimeSchema = isoDateTimeSchema.nullable();

export const memorySchema = z
  .object({
    id: uuidSchema,
    owner_id: uuidSchema,
    kind: memoryKindSchema,
    title: z.string(),
    body_markdown: z.string(),
    document_path: z.string().nullable(),
    domain: z.string(),
    subject: z.string().nullable(),
    predicate: z.string().nullable(),
    object_value: jsonValueSchema.nullable(),
    epistemic_status: epistemicStatusSchema,
    confidence: z.number().min(0).max(1),
    importance: z.number().int().min(0).max(10),
    occurred_start: nullableDateTimeSchema,
    occurred_end: nullableDateTimeSchema,
    temporal_precision: temporalPrecisionSchema,
    source_id: nullableUuidSchema,
    source_message_id: nullableUuidSchema,
    evidence_excerpt: z.string().nullable(),
    derived_from_id: nullableUuidSchema,
    supersedes_id: nullableUuidSchema,
    superseded_at: nullableDateTimeSchema,
    recorded_at: isoDateTimeSchema,
    updated_at: isoDateTimeSchema,
  })
  .strict();

export const memoryInputSchema = z
  .object({
    kind: memoryKindSchema,
    title: z.string().trim().min(1).max(300),
    body_markdown: z.string().trim().min(1).max(100_000),
    document_path: z.string().trim().min(1).max(500).nullable().optional(),
    domain: z.string().trim().min(1).max(200),
    subject: z.string().trim().min(1).max(500).nullable().optional(),
    predicate: z.string().trim().min(1).max(500).nullable().optional(),
    object_value: jsonValueSchema.nullable().optional(),
    epistemic_status: epistemicStatusSchema.default('user_stated'),
    confidence: z.number().min(0).max(1).default(1),
    importance: z.number().int().min(0).max(10).default(5),
    occurred_start: nullableDateTimeSchema.optional(),
    occurred_end: nullableDateTimeSchema.optional(),
    temporal_precision: temporalPrecisionSchema.default('unknown'),
    source_id: nullableUuidSchema.optional(),
    source_message_id: nullableUuidSchema.optional(),
    evidence_excerpt: z.string().trim().min(1).max(10_000).nullable().optional(),
    derived_from_id: nullableUuidSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.document_path && value.kind !== 'document' && value.kind !== 'journal') {
      context.addIssue({
        code: 'custom',
        path: ['document_path'],
        message: 'Only documents and journals can have a document path.',
      });
    }
    if (value.occurred_end && !value.occurred_start) {
      context.addIssue({
        code: 'custom',
        path: ['occurred_end'],
        message: 'An end time requires a start time.',
      });
    }
    if (
      value.occurred_start &&
      value.occurred_end &&
      Date.parse(value.occurred_end) <= Date.parse(value.occurred_start)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['occurred_end'],
        message: 'The end time must be after the start time.',
      });
    }
  });

export const listMemoriesQuerySchema = z
  .object({
    kind: memoryKindSchema.optional(),
    domain: z.string().trim().min(1).max(200).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export const searchRequestSchema = z
  .object({
    query: z.string().trim().min(1).max(2_000),
    limit: z.number().int().min(1).max(50).default(12),
  })
  .strict();

export const searchHitSchema = z
  .object({
    id: uuidSchema,
    kind: memoryKindSchema,
    title: z.string(),
    body_markdown: z.string(),
    domain: z.string(),
    occurred_start: nullableDateTimeSchema,
    epistemic_status: epistemicStatusSchema,
    source_id: nullableUuidSchema,
    score: z.number().finite(),
  })
  .strict();

export const timelineQuerySchema = z
  .object({
    start: isoDateTimeSchema.optional(),
    end: isoDateTimeSchema.optional(),
    domain: z.string().trim().min(1).max(200).optional(),
    limit: z.coerce.number().int().min(1).max(500).default(100),
  })
  .strict();

export const conversationSchema = z
  .object({
    id: uuidSchema,
    owner_id: uuidSchema,
    mode: z.enum(CONVERSATION_MODES),
    title: z.string(),
    status: z.enum(CONVERSATION_STATUSES),
    created_at: isoDateTimeSchema,
    updated_at: isoDateTimeSchema,
  })
  .strict();

export const createConversationRequestSchema = z
  .object({
    mode: z.enum(CONVERSATION_MODES).default('conversation'),
    title: z.string().trim().min(1).max(300),
  })
  .strict();

export const messageSchema = z
  .object({
    id: uuidSchema,
    owner_id: uuidSchema,
    conversation_id: uuidSchema,
    role: z.enum(MESSAGE_ROLES),
    content: z.string(),
    input_modality: z.enum(MESSAGE_MODALITIES),
    provider_response_id: z.string().nullable(),
    cited_memory_ids: z.array(uuidSchema),
    created_at: isoDateTimeSchema,
  })
  .strict();

export const conversationTurnRequestSchema = z
  .object({
    content: z.string().trim().min(1).max(50_000),
  })
  .strict();

export const conversationTurnResponseSchema = z
  .object({
    user_message: messageSchema,
    assistant_message: messageSchema,
    created_memories: z.array(memorySchema),
    answer: z.string(),
    follow_up_question: z.string().nullable(),
  })
  .strict();

export const realtimeSessionSchema = z
  .object({
    id: uuidSchema,
    owner_id: uuidSchema,
    conversation_id: uuidSchema,
    openai_session_id: z.string(),
    status: z.enum(REALTIME_SESSION_STATUSES),
    expires_at: isoDateTimeSchema,
    created_at: isoDateTimeSchema,
    closed_at: nullableDateTimeSchema,
  })
  .strict();

export const realtimeClientSecretSchema = z
  .object({ value: z.string(), expires_at: z.number().int(), session: jsonValueSchema })
  .strict();
export const createRealtimeSessionResponseSchema = z
  .object({
    realtime_session: realtimeSessionSchema,
    conversation: conversationSchema,
    client_secret: realtimeClientSecretSchema,
  })
  .strict();

export const createRealtimeSessionRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
  })
  .strict();

export const realtimeMemorySearchRequestSchema = z
  .object({
    query: z.string().trim().min(1).max(2_000),
    limit: z.number().int().min(1).max(20),
  })
  .strict();

export const realtimeMemoryRecordRequestSchema = z
  .object({
    kind: memoryKindSchema,
    title: z.string().trim().min(1).max(300),
    body_markdown: z.string().trim().min(1).max(100_000),
    domain: z.string().trim().min(1).max(200),
    occurred_start: nullableDateTimeSchema,
  })
  .strict();

export const realtimeMemoryExploreRequestSchema = z
  .object({
    kind: memoryKindSchema.nullable(),
    domain: z.string().trim().min(1).max(200).nullable(),
    limit: z.number().int().min(1).max(20),
  })
  .strict();

const exactTranscriptSchema = z
  .string()
  .min(1)
  .max(50_000)
  .refine((value) => value.trim().length > 0, 'Transcript cannot be blank.');

export const realtimeTurnRequestSchema = z
  .object({
    user_transcript: exactTranscriptSchema,
    assistant_transcript: exactTranscriptSchema,
    provider_response_id: z.string().min(1).max(500),
    cited_memory_ids: z.array(uuidSchema).max(100),
  })
  .strict()
  .refine((value) => new Set(value.cited_memory_ids).size === value.cited_memory_ids.length, {
    message: 'Cited memory IDs must be unique.',
    path: ['cited_memory_ids'],
  });

export const researchCitationSchema = z
  .object({
    url: z
      .string()
      .url()
      .refine((value) => new URL(value).protocol === 'https:', 'Research sources must use HTTPS.'),
    title: z.string().nullable(),
  })
  .strict();
export const researchRequestSchema = z
  .object({
    query: z.string().trim().min(1).max(2_000),
  })
  .strict();
export const researchResponseSchema = z
  .object({
    report_markdown: z.string(),
    citations: z.array(researchCitationSchema),
    memories: z.array(memorySchema),
  })
  .strict()
  .refine((value) => value.memories.every((memory) => memory.epistemic_status === 'researched'), {
    message: 'Research responses may only contain researched memories.',
    path: ['memories'],
  });

export const connectorSchema = z
  .object({
    id: uuidSchema,
    owner_id: uuidSchema,
    provider: z.enum(CONNECTOR_PROVIDERS),
    external_account_id: z.string().nullable(),
    external_account_name: z.string().nullable(),
    status: z.enum(CONNECTOR_STATUSES),
    scopes: z.array(z.string()),
    token_expires_at: nullableDateTimeSchema,
    sync_cursor: jsonValueSchema,
    last_synced_at: nullableDateTimeSchema,
    last_error: z.string().nullable(),
    created_at: isoDateTimeSchema,
    updated_at: isoDateTimeSchema,
  })
  .strict();

export const ingestionJobSchema = z
  .object({
    id: uuidSchema,
    owner_id: uuidSchema,
    connector_id: nullableUuidSchema,
    job_kind: z.literal('connector_sync'),
    payload: jsonValueSchema,
    status: z.enum(JOB_STATUSES),
    attempts: z.number().int().min(0),
    available_at: isoDateTimeSchema,
    locked_at: nullableDateTimeSchema,
    locked_by: z.string().nullable(),
    last_error: z.string().nullable(),
    created_at: isoDateTimeSchema,
    completed_at: nullableDateTimeSchema,
  })
  .strict();

export const ingestionJobViewSchema = z
  .object({
    id: uuidSchema,
    status: z.enum(JOB_STATUSES),
    attempts: z.number().int().min(0),
    last_error: z.string().nullable(),
    completed_at: nullableDateTimeSchema,
  })
  .strict();

export const connectorViewSchema = z
  .object({
    id: uuidSchema,
    provider: z.enum(CONNECTOR_PROVIDERS),
    external_account_name: z.string().nullable(),
    status: z.enum(CONNECTOR_STATUSES),
    scopes: z.array(z.string()),
    token_expires_at: nullableDateTimeSchema,
    last_synced_at: nullableDateTimeSchema,
    has_error: z.boolean(),
  })
  .strict();

export const oauthStartResponseSchema = z
  .object({
    provider: z.enum(CONNECTOR_PROVIDERS),
    authorization_url: z
      .string()
      .url()
      .refine((value) => new URL(value).protocol === 'https:', 'OAuth URLs must use HTTPS.'),
  })
  .strict();

export const healthMeasurementSchema = z
  .object({
    id: uuidSchema,
    owner_id: uuidSchema,
    source_id: nullableUuidSchema,
    metric_code: z.string(),
    value: z.number().finite(),
    unit: z.string(),
    measured_at: isoDateTimeSchema,
    ended_at: nullableDateTimeSchema,
    dimensions: jsonValueSchema,
    created_at: isoDateTimeSchema,
  })
  .strict();

export const healthMeasurementInputSchema = z
  .object({
    source_id: uuidSchema.nullable().optional(),
    metric_code: z.string().trim().min(1).max(200),
    value: z.number().finite(),
    unit: z.string().trim().min(1).max(100),
    measured_at: isoDateTimeSchema,
    ended_at: isoDateTimeSchema.nullable().optional(),
    dimensions: jsonValueSchema.default({}),
  })
  .strict()
  .refine(
    (value) => !value.ended_at || Date.parse(value.ended_at) > Date.parse(value.measured_at),
    { message: 'The end time must be after the measurement time.', path: ['ended_at'] }
  );

export const auditEventSchema = z
  .object({
    id: uuidSchema,
    owner_id: nullableUuidSchema,
    action: z.string(),
    resource_kind: z.string(),
    resource_id: nullableUuidSchema,
    metadata: jsonValueSchema,
    occurred_at: isoDateTimeSchema,
  })
  .strict();

export const errorEnvelopeSchema = z
  .object({ error: z.object({ code: z.string(), message: z.string() }).strict() })
  .strict();

export const lifeUiErrorEnvelopeSchema = z
  .object({
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        request_id: z.string().optional(),
      })
      .strict(),
  })
  .strict();

export const loginRequestSchema = z
  .object({
    password: z.string().min(1).max(1_024),
    next: z.string().max(2_048).optional(),
  })
  .strict();

export const ownerListSchema = z.array(ownerSchema);
export const memoryListSchema = z.array(memorySchema);
export const searchHitListSchema = z.array(searchHitSchema);
export const conversationListSchema = z.array(conversationSchema);
export const messageListSchema = z.array(messageSchema);
export const connectorListSchema = z.array(connectorSchema);
export const healthMeasurementListSchema = z.array(healthMeasurementSchema);
export const auditEventListSchema = z.array(auditEventSchema);

export type Owner = z.infer<typeof ownerSchema>;
export type Memory = z.infer<typeof memorySchema>;
export type MemoryInput = z.input<typeof memoryInputSchema>;
export type SearchRequest = z.input<typeof searchRequestSchema>;
export type SearchHit = z.infer<typeof searchHitSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type Message = z.infer<typeof messageSchema>;
export type ConversationTurnResponse = z.infer<typeof conversationTurnResponseSchema>;
export type RealtimeSession = z.infer<typeof realtimeSessionSchema>;
export type CreateRealtimeSessionRequest = z.infer<typeof createRealtimeSessionRequestSchema>;
export type CreateRealtimeSessionResponse = z.infer<typeof createRealtimeSessionResponseSchema>;
export type RealtimeMemorySearchRequest = z.infer<typeof realtimeMemorySearchRequestSchema>;
export type RealtimeMemoryRecordRequest = z.infer<typeof realtimeMemoryRecordRequestSchema>;
export type RealtimeMemoryExploreRequest = z.infer<typeof realtimeMemoryExploreRequestSchema>;
export type RealtimeTurnRequest = z.infer<typeof realtimeTurnRequestSchema>;
export type Connector = z.infer<typeof connectorSchema>;
export type IngestionJob = z.infer<typeof ingestionJobSchema>;
export type IngestionJobView = z.infer<typeof ingestionJobViewSchema>;
export type ConnectorView = z.infer<typeof connectorViewSchema>;
export type HealthMeasurement = z.infer<typeof healthMeasurementSchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
export type ResearchResponse = z.infer<typeof researchResponseSchema>;
export type HealthMeasurementInput = z.input<typeof healthMeasurementInputSchema>;
