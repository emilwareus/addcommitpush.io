import { z } from 'zod';
import {
  CONNECTOR_PROVIDERS,
  CONNECTOR_STATUSES,
  CONTRADICTION_STATUSES,
  CONVERSATION_MODES,
  CONVERSATION_STATUSES,
  EPISTEMIC_STATUSES,
  JOB_STATUSES,
  MEMORY_KINDS,
  MESSAGE_MODALITIES,
  MESSAGE_ROLES,
  REALTIME_SESSION_STATUSES,
  SENSITIVITIES,
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
export const sensitivitySchema = z.enum(SENSITIVITIES);
export const temporalPrecisionSchema = z.enum(TEMPORAL_PRECISIONS);

export const ownerSchema = z
  .object({
    id: uuidSchema,
    display_name: z.string(),
    timezone: z.string().min(1),
    locale: z.string().min(1),
    profile_markdown: z.string(),
    created_at: isoDateTimeSchema,
    updated_at: isoDateTimeSchema,
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
    sensitivity: sensitivitySchema,
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
    sensitivity: sensitivitySchema.default('private'),
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
    limit: z.coerce.number().int().min(1).max(500).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export const searchRequestSchema = z
  .object({
    query: z.string().trim().min(1).max(2_000),
    limit: z.number().int().min(1).max(50).default(12),
    sensitivities: z.array(sensitivitySchema).min(1).max(4),
  })
  .strict()
  .refine((value) => new Set(value.sensitivities).size === value.sensitivities.length, {
    message: 'Sensitivities must be unique.',
    path: ['sensitivities'],
  });

export const searchHitSchema = z
  .object({
    id: uuidSchema,
    kind: memoryKindSchema,
    title: z.string(),
    body_markdown: z.string(),
    domain: z.string(),
    sensitivity: sensitivitySchema,
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
    sensitivities: z.array(sensitivitySchema).min(1).max(4),
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
    allowed_sensitivities: z.array(sensitivitySchema).min(1).max(4),
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
    sensitivities: z.array(sensitivitySchema).min(1).max(4),
  })
  .strict()
  .refine((value) => new Set(value.sensitivities).size === value.sensitivities.length, {
    message: 'Sensitivities must be unique.',
    path: ['sensitivities'],
  });

export const realtimeMemorySearchRequestSchema = z
  .object({
    query: z.string().trim().min(1).max(2_000),
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
  .object({ url: z.string().url(), title: z.string().nullable() })
  .strict();
export const researchResponseSchema = z
  .object({
    report_markdown: z.string(),
    citations: z.array(researchCitationSchema),
    memories: z.array(memorySchema),
  })
  .strict();

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

export const memoryEdgeSchema = z
  .object({
    id: uuidSchema,
    owner_id: uuidSchema,
    from_memory_id: uuidSchema,
    relation: z.string(),
    to_memory_id: uuidSchema,
    confidence: z.number().min(0).max(1),
    source_id: nullableUuidSchema,
    created_at: isoDateTimeSchema,
  })
  .strict();

export const contradictionSchema = z
  .object({
    id: uuidSchema,
    owner_id: uuidSchema,
    left_memory_id: uuidSchema,
    right_memory_id: uuidSchema,
    explanation: z.string(),
    status: z.enum(CONTRADICTION_STATUSES),
    resolution_markdown: z.string().nullable(),
    detected_at: isoDateTimeSchema,
    resolved_at: nullableDateTimeSchema,
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
export const memoryEdgeListSchema = z.array(memoryEdgeSchema);
export const contradictionListSchema = z.array(contradictionSchema);
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
export type RealtimeTurnRequest = z.infer<typeof realtimeTurnRequestSchema>;
export type Connector = z.infer<typeof connectorSchema>;
export type IngestionJob = z.infer<typeof ingestionJobSchema>;
export type MemoryEdge = z.infer<typeof memoryEdgeSchema>;
export type Contradiction = z.infer<typeof contradictionSchema>;
export type HealthMeasurement = z.infer<typeof healthMeasurementSchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
