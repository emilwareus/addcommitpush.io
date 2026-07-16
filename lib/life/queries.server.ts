import 'server-only';
import {
  auditEventListSchema,
  connectorListSchema,
  conversationListSchema,
  conversationSchema,
  conversationTurnRequestSchema,
  conversationTurnResponseSchema,
  createRealtimeSessionRequestSchema,
  createRealtimeSessionResponseSchema,
  createConversationRequestSchema,
  healthMeasurementListSchema,
  healthMeasurementInputSchema,
  healthMeasurementSchema,
  ingestionJobSchema,
  memoryInputSchema,
  memoryListSchema,
  memorySchema,
  messageListSchema,
  ownerSchema,
  oauthStartResponseSchema,
  realtimeMemoryExploreRequestSchema,
  realtimeMemoryRecordRequestSchema,
  realtimeMemorySearchRequestSchema,
  realtimeSessionSchema,
  realtimeTurnRequestSchema,
  researchRequestSchema,
  researchResponseSchema,
  searchHitListSchema,
  searchRequestSchema,
  timelineQuerySchema,
  type Conversation,
  type CreateRealtimeSessionRequest,
  type HealthMeasurementInput,
  type MemoryInput,
  type RealtimeMemoryExploreRequest,
  type RealtimeMemoryRecordRequest,
  type RealtimeMemorySearchRequest,
  type RealtimeTurnRequest,
  type SearchRequest,
  updateOwnerRequestSchema,
  uuidSchema,
} from './contracts';
import { lifeDownloadRequest, lifeRequest } from './client.server';

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

export function sendConversationTurn(id: string, input: { content: string }) {
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

export function recordRealtimeMemory(id: string, input: RealtimeMemoryRecordRequest) {
  const body = realtimeMemoryRecordRequestSchema.parse(input);
  return lifeRequest({
    method: 'POST',
    path: `/v1/realtime/sessions/${id}/tools/record-memory`,
    schema: memorySchema,
    body,
    timeoutMs: 30_000,
  });
}

export function exploreRealtimeMemories(id: string, input: RealtimeMemoryExploreRequest) {
  const body = realtimeMemoryExploreRequestSchema.parse(input);
  return lifeRequest({
    method: 'POST',
    path: `/v1/realtime/sessions/${id}/tools/explore-memories`,
    schema: memoryListSchema,
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

export function downloadOwnerExport(format: 'json' | 'markdown') {
  return lifeDownloadRequest(format === 'json' ? '/v1/export' : '/v1/export/markdown');
}

export async function getConversationDetail(id: string) {
  const [conversation, messages] = await Promise.all([
    getConversation(id),
    getConversationMessages(id),
  ]);
  return { conversation, messages };
}
