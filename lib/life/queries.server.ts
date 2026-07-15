import 'server-only';
import {
  auditEventListSchema,
  connectorListSchema,
  contradictionListSchema,
  conversationListSchema,
  conversationSchema,
  conversationTurnRequestSchema,
  conversationTurnResponseSchema,
  createRealtimeSessionRequestSchema,
  createRealtimeSessionResponseSchema,
  createConversationRequestSchema,
  createInterviewRequestSchema,
  createInterviewResponseSchema,
  healthMeasurementListSchema,
  healthMeasurementInputSchema,
  healthMeasurementSchema,
  ingestionJobSchema,
  memoryEdgeListSchema,
  memoryInputSchema,
  memoryListSchema,
  memorySchema,
  messageListSchema,
  ownerSchema,
  oauthStartResponseSchema,
  realtimeMemorySearchRequestSchema,
  realtimeSessionSchema,
  realtimeTurnRequestSchema,
  reflectionRequestSchema,
  reflectionResponseSchema,
  researchRequestSchema,
  researchResponseSchema,
  resolveContradictionRequestSchema,
  searchHitListSchema,
  searchRequestSchema,
  timelineQuerySchema,
  type Conversation,
  type CreateRealtimeSessionRequest,
  type HealthMeasurementInput,
  type Memory,
  type MemoryInput,
  type RealtimeMemorySearchRequest,
  type RealtimeTurnRequest,
  type SearchRequest,
  updateOwnerRequestSchema,
  uuidSchema,
} from './contracts';
import { lifeDownloadRequest, lifeRequest, lifeVoidRequest } from './client.server';

function queryPath(path: string, parameters: URLSearchParams): `/v1/${string}` {
  const query = parameters.toString();
  return `${path}${query ? `?${query}` : ''}` as `/v1/${string}`;
}

export function getOwner() {
  return lifeRequest({ method: 'GET', path: '/v1/owner', schema: ownerSchema });
}

export function updateOwner(input: unknown) {
  const body = updateOwnerRequestSchema.parse(input);
  return lifeRequest({ method: 'PUT', path: '/v1/owner', schema: ownerSchema, body });
}

export function deleteOwner(confirmDisplayName: string) {
  return lifeVoidRequest({
    method: 'DELETE',
    path: '/v1/owner',
    body: { confirm_display_name: confirmDisplayName },
  });
}

export function listMemories(
  options: {
    kind?: string;
    domain?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const parameters = new URLSearchParams();
  if (options.kind) parameters.set('kind', options.kind);
  if (options.domain) parameters.set('domain', options.domain);
  if (options.limit !== undefined) parameters.set('limit', String(options.limit));
  if (options.offset !== undefined) parameters.set('offset', String(options.offset));
  return lifeRequest({
    method: 'GET',
    path: queryPath('/v1/memories', parameters),
    schema: memoryListSchema,
  });
}

export function searchMemories(input: SearchRequest) {
  const body = searchRequestSchema.parse(input);
  return lifeRequest({
    method: 'POST',
    path: '/v1/memories/search',
    schema: searchHitListSchema,
    body,
  });
}

export function getMemory(id: string) {
  return lifeRequest({ method: 'GET', path: `/v1/memories/${id}`, schema: memorySchema });
}

export function createMemory(input: MemoryInput) {
  const body = memoryInputSchema.parse(input);
  return lifeRequest({ method: 'POST', path: '/v1/memories', schema: memorySchema, body });
}

export function reviseMemory(id: string, input: MemoryInput) {
  const body = memoryInputSchema.parse(input);
  return lifeRequest({ method: 'PUT', path: `/v1/memories/${id}`, schema: memorySchema, body });
}

export function retractMemory(id: string) {
  return lifeRequest({ method: 'DELETE', path: `/v1/memories/${id}`, schema: memorySchema });
}

export function getMemoryEdges(id: string) {
  return lifeRequest({
    method: 'GET',
    path: `/v1/memories/${id}/edges`,
    schema: memoryEdgeListSchema,
  });
}

export function getTimeline(
  options: {
    start?: string;
    end?: string;
    domain?: string;
    limit?: number;
  } = {}
) {
  const values = timelineQuerySchema.parse({ ...options, limit: options.limit ?? 100 });
  const parameters = new URLSearchParams();
  if (values.start) parameters.set('start', values.start);
  if (values.end) parameters.set('end', values.end);
  if (values.domain) parameters.set('domain', values.domain);
  parameters.set('limit', String(values.limit));
  return lifeRequest({
    method: 'GET',
    path: queryPath('/v1/timeline', parameters),
    schema: memoryListSchema,
  });
}

export function listConversations() {
  return lifeRequest({
    method: 'GET',
    path: '/v1/conversations',
    schema: conversationListSchema,
  });
}

export function getConversation(id: string) {
  return lifeRequest({
    method: 'GET',
    path: `/v1/conversations/${id}`,
    schema: conversationSchema,
  });
}

export function getConversationMessages(id: string) {
  return lifeRequest({
    method: 'GET',
    path: `/v1/conversations/${id}/messages`,
    schema: messageListSchema,
  });
}

export function createConversation(input: { mode: Conversation['mode']; title: string }) {
  const body = createConversationRequestSchema.parse(input);
  return lifeRequest({
    method: 'POST',
    path: '/v1/conversations',
    schema: conversationSchema,
    body,
  });
}

export function sendConversationTurn(
  id: string,
  input: { content: string; sensitivities: SearchRequest['sensitivities'] }
) {
  const body = conversationTurnRequestSchema.parse(input);
  return lifeRequest({
    method: 'POST',
    path: `/v1/conversations/${id}/turns`,
    schema: conversationTurnResponseSchema,
    body,
  });
}

export function createRealtimeSession(input: CreateRealtimeSessionRequest) {
  const body = createRealtimeSessionRequestSchema.parse(input);
  return lifeRequest({
    method: 'POST',
    path: '/v1/realtime/sessions',
    schema: createRealtimeSessionResponseSchema,
    body,
    timeoutMs: 30_000,
  });
}

export function getRealtimeSession(id: string) {
  return lifeRequest({
    method: 'GET',
    path: `/v1/realtime/sessions/${id}`,
    schema: realtimeSessionSchema,
  });
}

export function closeRealtimeSession(id: string) {
  return lifeRequest({
    method: 'DELETE',
    path: `/v1/realtime/sessions/${id}`,
    schema: realtimeSessionSchema,
  });
}

export function searchRealtimeMemory(id: string, input: RealtimeMemorySearchRequest) {
  const body = realtimeMemorySearchRequestSchema.parse(input);
  return lifeRequest({
    method: 'POST',
    path: `/v1/realtime/sessions/${id}/tools/search-memory`,
    schema: searchHitListSchema,
    body,
    timeoutMs: 30_000,
  });
}

export function commitRealtimeTurn(id: string, input: RealtimeTurnRequest) {
  const body = realtimeTurnRequestSchema.parse(input);
  return lifeRequest({
    method: 'POST',
    path: `/v1/realtime/sessions/${id}/turns`,
    schema: conversationTurnResponseSchema,
    body,
    timeoutMs: 120_000,
  });
}

export function listConnectors() {
  return lifeRequest({ method: 'GET', path: '/v1/connectors', schema: connectorListSchema });
}

export function startConnectorOAuth(provider: string) {
  const parsedProvider = zConnectorProvider(provider);
  return lifeRequest({
    method: 'POST',
    path: `/v1/connectors/${parsedProvider}/oauth/start`,
    schema: oauthStartResponseSchema,
  });
}

function zConnectorProvider(provider: string): 'github' | 'linear' | 'gmail' {
  return oauthStartResponseSchema.shape.provider.parse(provider);
}

export function syncConnector(id: string) {
  const connectorId = uuidSchema.parse(id);
  return lifeRequest({
    method: 'POST',
    path: `/v1/connectors/${connectorId}/sync`,
    schema: ingestionJobSchema,
  });
}

export function resetConnectorCursor(id: string) {
  const connectorId = uuidSchema.parse(id);
  return lifeRequest({
    method: 'POST',
    path: `/v1/connectors/${connectorId}/reset-cursor`,
    schema: connectorListSchema.element,
  });
}

export function revokeConnector(id: string) {
  const connectorId = uuidSchema.parse(id);
  return lifeRequest({
    method: 'DELETE',
    path: `/v1/connectors/${connectorId}`,
    schema: connectorListSchema.element,
  });
}

export function getIngestionJob(id: string) {
  const jobId = uuidSchema.parse(id);
  return lifeRequest({ method: 'GET', path: `/v1/jobs/${jobId}`, schema: ingestionJobSchema });
}

export function retryIngestionJob(id: string) {
  const jobId = uuidSchema.parse(id);
  return lifeRequest({
    method: 'POST',
    path: `/v1/jobs/${jobId}/retry`,
    schema: ingestionJobSchema,
  });
}

export function listAuditEvents() {
  return lifeRequest({ method: 'GET', path: '/v1/audit-events', schema: auditEventListSchema });
}

export function listHealthMeasurements() {
  return lifeRequest({
    method: 'GET',
    path: '/v1/health-measurements',
    schema: healthMeasurementListSchema,
  });
}

export function createHealthMeasurement(input: HealthMeasurementInput) {
  const body = healthMeasurementInputSchema.parse(input);
  return lifeRequest({
    method: 'POST',
    path: '/v1/health-measurements',
    schema: healthMeasurementSchema,
    body,
  });
}

export function listContradictions() {
  return lifeRequest({
    method: 'GET',
    path: '/v1/contradictions',
    schema: contradictionListSchema,
  });
}

export function getContradiction(id: string) {
  const contradictionId = uuidSchema.parse(id);
  return lifeRequest({
    method: 'GET',
    path: `/v1/contradictions/${contradictionId}`,
    schema: contradictionListSchema.element,
  });
}

export function resolveContradiction(id: string, input: unknown) {
  const contradictionId = uuidSchema.parse(id);
  const body = resolveContradictionRequestSchema.parse(input);
  return lifeRequest({
    method: 'PUT',
    path: `/v1/contradictions/${contradictionId}`,
    schema: contradictionListSchema.element,
    body,
  });
}

export function runResearch(input: unknown) {
  const body = researchRequestSchema.parse(input);
  return lifeRequest({
    method: 'POST',
    path: '/v1/research',
    schema: researchResponseSchema,
    body,
    timeoutMs: 120_000,
  });
}

export function createReflection(input: unknown) {
  const body = reflectionRequestSchema.parse(input);
  return lifeRequest({
    method: 'POST',
    path: '/v1/reflections',
    schema: reflectionResponseSchema,
    body,
    timeoutMs: 120_000,
  });
}

export function createInterview(input: unknown) {
  const body = createInterviewRequestSchema.parse(input);
  return lifeRequest({
    method: 'POST',
    path: '/v1/interviews',
    schema: createInterviewResponseSchema,
    body,
    timeoutMs: 120_000,
  });
}

export function downloadOwnerExport(format: 'json' | 'markdown') {
  return lifeDownloadRequest(format === 'json' ? '/v1/export' : '/v1/export/markdown');
}

export async function getDashboardData() {
  const [owner, memories, timeline, conversations, connectors, audit, health, contradictions] =
    await Promise.all([
      getOwner(),
      listMemories({ limit: 8 }),
      getTimeline({ limit: 12 }),
      listConversations(),
      listConnectors(),
      listAuditEvents(),
      listHealthMeasurements(),
      listContradictions(),
    ]);

  const latestHealth = new Map<string, (typeof health)[number]>();
  for (const measurement of health) {
    if (!latestHealth.has(measurement.metric_code)) {
      latestHealth.set(measurement.metric_code, measurement);
    }
  }

  return {
    owner,
    memories,
    timeline,
    conversations: conversations.slice(0, 5),
    connectors,
    audit: audit.slice(0, 12),
    health: [...latestHealth.values()],
    pendingContradictions: contradictions.filter((item) => item.status === 'pending'),
  };
}

export async function getMemoryDetail(id: string) {
  const [memory, edges] = await Promise.all([getMemory(id), getMemoryEdges(id)]);
  const relationIds = [
    ...new Set(
      edges.map((edge) =>
        edge.from_memory_id === memory.id ? edge.to_memory_id : edge.from_memory_id
      )
    ),
  ].slice(0, 40);
  const [relatedMemories, priorRevision] = await Promise.all([
    Promise.all(relationIds.map((relationId) => getMemory(relationId))),
    memory.supersedes_id ? getMemory(memory.supersedes_id) : Promise.resolve<Memory | null>(null),
  ]);
  return { memory, edges, relatedMemories, priorRevision };
}

export async function getConversationDetail(id: string) {
  const [conversation, messages] = await Promise.all([
    getConversation(id),
    getConversationMessages(id),
  ]);
  return { conversation, messages };
}
