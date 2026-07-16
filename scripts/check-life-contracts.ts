import fixtures from '@/lib/life/fixtures/contract-fixtures.json';
import {
  auditEventSchema,
  connectorSchema,
  conversationSchema,
  createRealtimeSessionResponseSchema,
  errorEnvelopeSchema,
  healthMeasurementSchema,
  ingestionJobSchema,
  memoryListSchema,
  memorySchema,
  messageSchema,
  ownerSchema,
  researchResponseSchema,
  searchHitSchema,
} from '@/lib/life/contracts';

ownerSchema.parse(fixtures.owner);
memorySchema.parse(fixtures.memory);
searchHitSchema.parse(fixtures.search_hit);
memoryListSchema.parse(fixtures.timeline);
conversationSchema.parse(fixtures.conversation);
messageSchema.parse(fixtures.message);
createRealtimeSessionResponseSchema.parse(fixtures.realtime_response);
researchResponseSchema.parse(fixtures.research_response);
connectorSchema.parse(fixtures.connector);
ingestionJobSchema.parse(fixtures.job);
healthMeasurementSchema.parse(fixtures.health);
auditEventSchema.parse(fixtures.audit);
errorEnvelopeSchema.parse(fixtures.error);

const malformedFixtures = [
  ownerSchema.safeParse({ ...fixtures.owner, id: 'not-a-uuid' }),
  memorySchema.safeParse({ ...fixtures.memory, kind: 'unknown_kind' }),
  memorySchema.safeParse({ ...fixtures.memory, importance: 11 }),
  errorEnvelopeSchema.safeParse({ error: { message: 'missing code' } }),
];

if (malformedFixtures.some((result) => result.success)) {
  throw new Error('A malformed Life contract fixture unexpectedly parsed.');
}

console.log('Life contract fixtures passed.');
