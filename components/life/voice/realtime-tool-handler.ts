'use client';

import {
  lifeUiErrorEnvelopeSchema,
  memoryListSchema,
  memorySchema,
  realtimeMemoryExploreRequestSchema,
  realtimeMemoryRecordRequestSchema,
  realtimeMemorySearchRequestSchema,
  searchHitListSchema,
} from '@/lib/life/contracts';
import type { RealtimeFunctionCall } from './realtime-events';
import { RealtimeProtocolError } from './realtime-events';

export interface ToolResultRecord {
  responseId: string;
  functionItemId: string;
  callId: string;
  memoryIds: string[];
}

interface ParsedToolCall {
  call: RealtimeFunctionCall;
  route: 'record-memory' | 'search-memory' | 'explore-memories';
  arguments: object;
}

export async function forwardMemoryToolCalls(input: {
  calls: readonly RealtimeFunctionCall[];
  responseId: string;
  sessionId: string;
  dataChannel: RTCDataChannel;
}): Promise<ToolResultRecord[]> {
  if (input.dataChannel.readyState !== 'open') {
    throw new RealtimeProtocolError('The Realtime data channel closed before tool output.');
  }

  const outputs = await Promise.all(
    input.calls.map((call) => runMemoryTool(input.sessionId, parseToolCall(call)))
  );

  for (const { call, output } of outputs) {
    if (input.dataChannel.readyState !== 'open') {
      throw new RealtimeProtocolError('The Realtime data channel closed before tool output.');
    }
    input.dataChannel.send(
      JSON.stringify({
        type: 'conversation.item.create',
        item: { type: 'function_call_output', call_id: call.call_id, output },
      })
    );
  }

  input.dataChannel.send(JSON.stringify({ type: 'response.create' }));
  return outputs.map(({ call, memoryIds }) => ({
    responseId: input.responseId,
    functionItemId: call.id,
    callId: call.call_id,
    memoryIds,
  }));
}

function parseToolCall(call: RealtimeFunctionCall): ParsedToolCall {
  let decodedArguments: unknown;
  try {
    decodedArguments = JSON.parse(call.arguments);
  } catch {
    throw new RealtimeProtocolError('OpenAI sent invalid JSON memory-tool arguments.');
  }

  if (call.name === 'record_life_memory') {
    return {
      call,
      route: 'record-memory',
      arguments: parseArguments(realtimeMemoryRecordRequestSchema, decodedArguments),
    };
  }
  if (call.name === 'search_life_memory') {
    return {
      call,
      route: 'search-memory',
      arguments: parseArguments(realtimeMemorySearchRequestSchema, decodedArguments),
    };
  }
  if (call.name === 'explore_life_memories') {
    return {
      call,
      route: 'explore-memories',
      arguments: parseArguments(realtimeMemoryExploreRequestSchema, decodedArguments),
    };
  }
  throw new RealtimeProtocolError(`OpenAI requested an unknown function: ${call.name}.`);
}

function parseArguments<T>(
  schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } },
  value: unknown
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new RealtimeProtocolError('OpenAI sent invalid memory-tool arguments.');
  }
  return parsed.data;
}

async function runMemoryTool(sessionId: string, parsed: ParsedToolCall) {
  const response = await fetch(
    `/api/life/realtime/sessions/${encodeURIComponent(sessionId)}/${parsed.route}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.arguments),
    }
  );
  const decoded: unknown = await response.json();
  if (!response.ok) throw new Error(readLifeError(decoded, 'Life memory tool failed.'));

  if (parsed.route === 'record-memory') {
    const memory = memorySchema.safeParse(decoded);
    if (!memory.success) throw new RealtimeProtocolError('Life returned an invalid memory.');
    return {
      call: parsed.call,
      output: JSON.stringify(memory.data),
      memoryIds: [memory.data.id],
    };
  }
  if (parsed.route === 'explore-memories') {
    const memories = memoryListSchema.safeParse(decoded);
    if (!memories.success) {
      throw new RealtimeProtocolError('Life returned an invalid memory list.');
    }
    return {
      call: parsed.call,
      output: JSON.stringify(memories.data),
      memoryIds: memories.data.map((memory) => memory.id),
    };
  }
  const hits = searchHitListSchema.safeParse(decoded);
  if (!hits.success)
    throw new RealtimeProtocolError('Life returned invalid memory search results.');
  return {
    call: parsed.call,
    output: JSON.stringify(hits.data),
    memoryIds: hits.data.map((hit) => hit.id),
  };
}

function readLifeError(decoded: unknown, defaultMessage: string): string {
  const parsed = lifeUiErrorEnvelopeSchema.safeParse(decoded);
  if (!parsed.success) return defaultMessage;
  const requestId = parsed.data.error.request_id;
  return requestId
    ? `${parsed.data.error.message} Request ID: ${requestId}`
    : parsed.data.error.message;
}
