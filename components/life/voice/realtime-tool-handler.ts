'use client';

import { z } from 'zod';
import { lifeUiErrorEnvelopeSchema, searchHitListSchema } from '@/lib/life/contracts';
import type { RealtimeFunctionCall } from './realtime-events';
import { RealtimeProtocolError } from './realtime-events';

const memoryToolArgumentsSchema = z
  .object({
    query: z.string().trim().min(1).max(2_000),
    limit: z.number().int().min(1).max(20),
  })
  .strict();

export interface ToolResultRecord {
  responseId: string;
  functionItemId: string;
  callId: string;
  memoryIds: string[];
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

  const parsedCalls = input.calls.map((call) => {
    if (call.name !== 'search_life_memory') {
      throw new RealtimeProtocolError(`OpenAI requested an unknown function: ${call.name}.`);
    }
    let decodedArguments: unknown;
    try {
      decodedArguments = JSON.parse(call.arguments);
    } catch {
      throw new RealtimeProtocolError('OpenAI sent invalid JSON memory-tool arguments.');
    }
    const parsedArguments = memoryToolArgumentsSchema.safeParse(decodedArguments);
    if (!parsedArguments.success) {
      throw new RealtimeProtocolError('OpenAI sent invalid memory-tool arguments.');
    }
    return { call, arguments: parsedArguments.data };
  });

  const outputs = await Promise.all(
    parsedCalls.map(async ({ call, arguments: toolArguments }) => {
      const response = await fetch(
        `/api/life/realtime/sessions/${encodeURIComponent(input.sessionId)}/search-memory`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toolArguments),
        }
      );
      const decoded: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readLifeError(decoded, 'Life memory search failed.'));
      const hits = searchHitListSchema.safeParse(decoded);
      if (!hits.success) {
        throw new RealtimeProtocolError('Life returned an invalid memory search response.');
      }
      return {
        call,
        output: JSON.stringify(hits.data),
        memoryIds: hits.data.map((hit) => hit.id),
      };
    })
  );

  for (const { call, output } of outputs) {
    if (input.dataChannel.readyState !== 'open') {
      throw new RealtimeProtocolError('The Realtime data channel closed before tool output.');
    }
    input.dataChannel.send(
      JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: call.call_id,
          output,
        },
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

function readLifeError(decoded: unknown, defaultMessage: string): string {
  const parsed = lifeUiErrorEnvelopeSchema.safeParse(decoded);
  if (!parsed.success) return defaultMessage;
  const requestId = parsed.data.error.request_id;
  return requestId
    ? `${parsed.data.error.message} Request ID: ${requestId}`
    : parsed.data.error.message;
}
