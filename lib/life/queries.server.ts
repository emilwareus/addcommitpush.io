import 'server-only';
import {
  auditEventListSchema,
  connectorListSchema,
  contradictionListSchema,
  conversationListSchema,
  conversationSchema,
  conversationTurnRequestSchema,
  conversationTurnResponseSchema,
  createConversationRequestSchema,
  healthMeasurementListSchema,
  memoryEdgeListSchema,
  memoryInputSchema,
  memoryListSchema,
  memorySchema,
  messageListSchema,
  ownerSchema,
  searchHitListSchema,
  searchRequestSchema,
  timelineQuerySchema,
  type Conversation,
  type Memory,
  type MemoryInput,
  type SearchRequest,
} from './contracts';
import { lifeRequest } from './client.server';

function queryPath(path: string, parameters: URLSearchParams): `/v1/${string}` {
  const query = parameters.toString();
  return `${path}${query ? `?${query}` : ''}` as `/v1/${string}`;
}

export function getOwner() {
  return lifeRequest({ method: 'GET', path: '/v1/owner', schema: ownerSchema });
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

export function listConnectors() {
  return lifeRequest({ method: 'GET', path: '/v1/connectors', schema: connectorListSchema });
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

export function listContradictions() {
  return lifeRequest({
    method: 'GET',
    path: '/v1/contradictions',
    schema: contradictionListSchema,
  });
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
