import assert from 'node:assert/strict';
import {
  RealtimeProtocolError,
  parseRealtimeEvent,
} from '../components/life/voice/realtime-events';
import { RealtimeTurnAssembler } from '../components/life/voice/realtime-turn-assembler';

const MEMORY_ID = '10000000-0000-4000-8000-000000000001';

function addUser(assembler: RealtimeTurnAssembler, itemId: string, transcript: string): void {
  assembler.addConversationItem({ itemId, type: 'message', role: 'user' });
  assembler.completeInputTranscript(itemId, transcript);
}

function addAssistant(
  assembler: RealtimeTurnAssembler,
  responseId: string,
  itemId: string,
  previousItemId: string,
  transcript: string
): void {
  assembler.addConversationItem({
    itemId,
    type: 'message',
    role: 'assistant',
    previousItemId,
  });
  assembler.completeAssistantTranscript(responseId, itemId, transcript);
}

function checkExactCommitAndRetry(): void {
  const assembler = new RealtimeTurnAssembler();
  addAssistant(assembler, 'resp_1', 'assistant_1', 'user_1', 'Exact assistant transcript.');
  assembler.completeResponse('resp_1', 'completed');
  assert.equal(assembler.takeReadyCommits().length, 0);

  addUser(assembler, 'user_1', '  Exact user transcript.  ');
  const [payload] = assembler.takeReadyCommits();
  assert.deepEqual(payload, {
    user_transcript: '  Exact user transcript.  ',
    assistant_transcript: 'Exact assistant transcript.',
    provider_response_id: 'resp_1',
    cited_memory_ids: [],
  });
  assert.equal(assembler.takeReadyCommits().length, 0);

  assembler.markNotSaved('resp_1', 'Network failure.');
  assert.deepEqual(assembler.beginRetry('resp_1'), payload);
}

function checkCitationChainAndIsolation(): void {
  const assembler = new RealtimeTurnAssembler();
  addUser(assembler, 'user_2', 'Tell me what you remember.');
  assembler.addConversationItem({
    itemId: 'function_2',
    type: 'function_call',
    callId: 'call_2',
    previousItemId: 'user_2',
  });
  assembler.recordToolResult({
    responseId: 'resp_tool_2',
    functionItemId: 'function_2',
    callId: 'call_2',
    memoryIds: [MEMORY_ID],
  });
  assembler.addConversationItem({
    itemId: 'function_output_2',
    type: 'function_call_output',
    callId: 'call_2',
    previousItemId: 'function_2',
  });
  addAssistant(
    assembler,
    'resp_answer_2',
    'assistant_2',
    'function_output_2',
    'I found one relevant memory.'
  );
  assembler.completeResponse('resp_answer_2', 'completed');
  const [citedPayload] = assembler.takeReadyCommits();
  assert.deepEqual(citedPayload.cited_memory_ids, [MEMORY_ID]);

  addUser(assembler, 'user_3', 'A separate turn.');
  addAssistant(assembler, 'resp_3', 'assistant_3', 'user_3', 'A separate answer.');
  assembler.completeResponse('resp_3', 'completed');
  const [isolatedPayload] = assembler.takeReadyCommits();
  assert.deepEqual(isolatedPayload.cited_memory_ids, []);
}

function checkInterruptedResponseDoesNotCommit(): void {
  const assembler = new RealtimeTurnAssembler();
  addUser(assembler, 'user_4', 'Interrupt this answer.');
  addAssistant(assembler, 'resp_4', 'assistant_4', 'user_4', 'An interrupted answer.');
  assembler.completeResponse('resp_4', 'cancelled');
  assert.equal(assembler.takeReadyCommits().length, 0);

  addUser(assembler, 'user_5', 'Continue with this turn.');
  addAssistant(assembler, 'resp_5', 'assistant_5', 'user_5', 'A completed answer.');
  assembler.completeResponse('resp_5', 'completed');
  assert.equal(assembler.takeReadyCommits().length, 1);
}

function checkUnknownEventsFailClosed(): void {
  assert.throws(
    () => parseRealtimeEvent('{"type":"session.mystery","event_id":"event_1"}'),
    RealtimeProtocolError
  );
}

function checkWebRtcOutputAudioLifecycleEvents(): void {
  for (const type of [
    'output_audio_buffer.started',
    'output_audio_buffer.stopped',
    'output_audio_buffer.cleared',
  ]) {
    assert.equal(
      parseRealtimeEvent(
        JSON.stringify({
          type,
          event_id: `event_${type}`,
          response_id: 'response_1',
        })
      ).type,
      type
    );
  }
  assert.throws(
    () =>
      parseRealtimeEvent(
        JSON.stringify({
          type: 'output_audio_buffer.started',
          event_id: 'event_without_response',
        })
      ),
    RealtimeProtocolError
  );
}

checkExactCommitAndRetry();
checkCitationChainAndIsolation();
checkInterruptedResponseDoesNotCommit();
checkUnknownEventsFailClosed();
checkWebRtcOutputAudioLifecycleEvents();

process.stdout.write('Life Realtime state checks passed.\n');
