'use client';

import { z } from 'zod';

const eventEnvelopeSchema = z.object({ type: z.string() }).passthrough();
const eventBase = { event_id: z.string(), type: z.string() };

const conversationItemSchema = z
  .object({
    id: z.string(),
    type: z.enum(['message', 'function_call', 'function_call_output']),
    role: z.enum(['user', 'assistant', 'system']).optional(),
    call_id: z.string().optional(),
    status: z.enum(['completed', 'incomplete', 'in_progress']).optional(),
  })
  .passthrough();

const conversationItemAddedSchema = z
  .object({
    ...eventBase,
    type: z.literal('conversation.item.added'),
    previous_item_id: z.string().nullable().optional(),
    item: conversationItemSchema,
  })
  .passthrough();

const inputTranscriptDeltaSchema = z
  .object({
    ...eventBase,
    type: z.literal('conversation.item.input_audio_transcription.delta'),
    item_id: z.string(),
    delta: z.string(),
  })
  .passthrough();

const inputTranscriptCompletedSchema = z
  .object({
    ...eventBase,
    type: z.literal('conversation.item.input_audio_transcription.completed'),
    item_id: z.string(),
    transcript: z.string(),
  })
  .passthrough();

const inputTranscriptFailedSchema = z
  .object({
    ...eventBase,
    type: z.literal('conversation.item.input_audio_transcription.failed'),
    item_id: z.string(),
    error: z
      .object({
        message: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();

const outputItemAddedSchema = z
  .object({
    ...eventBase,
    type: z.literal('response.output_item.added'),
    response_id: z.string(),
    item: conversationItemSchema,
  })
  .passthrough();

const outputAudioTranscriptDeltaSchema = z
  .object({
    ...eventBase,
    type: z.literal('response.output_audio_transcript.delta'),
    response_id: z.string(),
    item_id: z.string(),
    delta: z.string(),
  })
  .passthrough();

const outputAudioTranscriptDoneSchema = z
  .object({
    ...eventBase,
    type: z.literal('response.output_audio_transcript.done'),
    response_id: z.string(),
    item_id: z.string(),
    transcript: z.string(),
  })
  .passthrough();

const functionCallOutputSchema = z
  .object({
    id: z.string(),
    type: z.literal('function_call'),
    status: z.enum(['completed', 'incomplete', 'in_progress']),
    name: z.string(),
    call_id: z.string(),
    arguments: z.string(),
  })
  .passthrough();

const assistantMessageOutputSchema = z
  .object({
    id: z.string(),
    type: z.literal('message'),
    status: z.enum(['completed', 'incomplete', 'in_progress']),
    role: z.literal('assistant'),
  })
  .passthrough();

const responseDoneSchema = z
  .object({
    ...eventBase,
    type: z.literal('response.done'),
    response: z
      .object({
        id: z.string(),
        status: z.enum(['completed', 'cancelled', 'failed', 'incomplete']),
        output: z.array(z.union([functionCallOutputSchema, assistantMessageOutputSchema])),
      })
      .passthrough(),
  })
  .passthrough();

const errorEventSchema = z
  .object({
    ...eventBase,
    type: z.literal('error'),
    error: z
      .object({
        type: z.string().optional(),
        code: z.string().nullable().optional(),
        message: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

const speechStartedSchema = z
  .object({
    ...eventBase,
    type: z.literal('input_audio_buffer.speech_started'),
    item_id: z.string(),
  })
  .passthrough();

const speechStoppedSchema = z
  .object({
    ...eventBase,
    type: z.literal('input_audio_buffer.speech_stopped'),
    item_id: z.string(),
  })
  .passthrough();

const ignoredEventSchema = z
  .object({
    ...eventBase,
    type: z.enum([
      'session.created',
      'session.updated',
      'conversation.created',
      'conversation.item.done',
      'input_audio_buffer.committed',
      'input_audio_buffer.cleared',
      'response.created',
      'response.output_item.done',
      'response.content_part.added',
      'response.content_part.done',
      'response.output_audio.delta',
      'response.output_audio.done',
      'response.output_text.delta',
      'response.output_text.done',
      'response.function_call_arguments.delta',
      'response.function_call_arguments.done',
      'rate_limits.updated',
    ]),
  })
  .passthrough();

export type RealtimeFunctionCall = z.infer<typeof functionCallOutputSchema>;
export type RealtimeServerEvent =
  | z.infer<typeof conversationItemAddedSchema>
  | z.infer<typeof inputTranscriptDeltaSchema>
  | z.infer<typeof inputTranscriptCompletedSchema>
  | z.infer<typeof inputTranscriptFailedSchema>
  | z.infer<typeof outputItemAddedSchema>
  | z.infer<typeof outputAudioTranscriptDeltaSchema>
  | z.infer<typeof outputAudioTranscriptDoneSchema>
  | z.infer<typeof responseDoneSchema>
  | z.infer<typeof errorEventSchema>
  | z.infer<typeof speechStartedSchema>
  | z.infer<typeof speechStoppedSchema>
  | z.infer<typeof ignoredEventSchema>;

export class RealtimeProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RealtimeProtocolError';
  }
}

export function parseRealtimeEvent(serializedEvent: string): RealtimeServerEvent {
  let decoded: unknown;
  try {
    decoded = JSON.parse(serializedEvent);
  } catch {
    throw new RealtimeProtocolError('OpenAI sent a non-JSON Realtime event.');
  }

  const envelope = eventEnvelopeSchema.safeParse(decoded);
  if (!envelope.success) {
    throw new RealtimeProtocolError('OpenAI sent a malformed Realtime event.');
  }

  const schema = schemaForEventType(envelope.data.type);
  const parsed = schema.safeParse(decoded);
  if (!parsed.success) {
    throw new RealtimeProtocolError(`OpenAI sent a malformed ${envelope.data.type} event.`);
  }
  return parsed.data;
}

function schemaForEventType(type: string): z.ZodType<RealtimeServerEvent> {
  switch (type) {
    case 'conversation.item.added':
      return conversationItemAddedSchema;
    case 'conversation.item.input_audio_transcription.delta':
      return inputTranscriptDeltaSchema;
    case 'conversation.item.input_audio_transcription.completed':
      return inputTranscriptCompletedSchema;
    case 'conversation.item.input_audio_transcription.failed':
      return inputTranscriptFailedSchema;
    case 'response.output_item.added':
      return outputItemAddedSchema;
    case 'response.output_audio_transcript.delta':
      return outputAudioTranscriptDeltaSchema;
    case 'response.output_audio_transcript.done':
      return outputAudioTranscriptDoneSchema;
    case 'response.done':
      return responseDoneSchema;
    case 'error':
      return errorEventSchema;
    case 'input_audio_buffer.speech_started':
      return speechStartedSchema;
    case 'input_audio_buffer.speech_stopped':
      return speechStoppedSchema;
    case 'session.created':
    case 'session.updated':
    case 'conversation.created':
    case 'conversation.item.done':
    case 'input_audio_buffer.committed':
    case 'input_audio_buffer.cleared':
    case 'response.created':
    case 'response.output_item.done':
    case 'response.content_part.added':
    case 'response.content_part.done':
    case 'response.output_audio.delta':
    case 'response.output_audio.done':
    case 'response.output_text.delta':
    case 'response.output_text.done':
    case 'response.function_call_arguments.delta':
    case 'response.function_call_arguments.done':
    case 'rate_limits.updated':
      return ignoredEventSchema;
    default:
      throw new RealtimeProtocolError(`OpenAI sent an unknown Realtime event type: ${type}.`);
  }
}
