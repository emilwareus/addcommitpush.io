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
  assert.equal(assembler.takeReadyCommits().length, 0);
  assembler.completePlayback('resp_1');
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
  assembler.completePlayback('resp_answer_2');
  const [citedPayload] = assembler.takeReadyCommits();
  assert.deepEqual(citedPayload.cited_memory_ids, [MEMORY_ID]);

  addUser(assembler, 'user_3', 'A separate turn.');
  addAssistant(assembler, 'resp_3', 'assistant_3', 'user_3', 'A separate answer.');
  assembler.completeResponse('resp_3', 'completed');
  assembler.completePlayback('resp_3');
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
  assembler.completePlayback('resp_5');
  assert.equal(assembler.takeReadyCommits().length, 1);
}

function checkTruncatedPlaybackDoesNotCommit(): void {
  const assembler = new RealtimeTurnAssembler();
  addUser(assembler, 'user_6', 'Stop before finishing.');
  addAssistant(
    assembler,
    'resp_6',
    'assistant_6',
    'user_6',
    'This complete provider transcript includes audio the user never heard.'
  );
  assembler.completeResponse('resp_6', 'completed');
  assert.equal(assembler.takeReadyCommits().length, 0);

  assembler.truncateAssistantItem('assistant_6');
  assembler.completePlayback('resp_6');
  assert.equal(assembler.takeReadyCommits().length, 0);
  const [turn] = assembler.snapshot().turns;
  assert.equal(turn.assistantIsPartial, true);
  assert.equal(turn.commitStatus, 'not_saved');
}

function checkOnlyDeliverableTurnsAreRetryable(): void {
  const assembler = new RealtimeTurnAssembler();
  addUser(assembler, 'user_7', 'Save this one.');
  addAssistant(assembler, 'resp_7', 'assistant_7', 'user_7', 'A completed answer.');
  assembler.completeResponse('resp_7', 'completed');
  assembler.completePlayback('resp_7');
  assembler.takeReadyCommits();
  assembler.markNotSaved('resp_7', 'Network failure.');
  assert.equal(assembler.snapshot().turns[0].retryable, true);

  const interrupted = new RealtimeTurnAssembler();
  addUser(interrupted, 'user_8', 'Cut this off.');
  addAssistant(interrupted, 'resp_8', 'assistant_8', 'user_8', 'Audio the user never heard.');
  interrupted.interruptPlayback('resp_8');
  const [turn] = interrupted.snapshot().turns;
  assert.equal(turn.commitStatus, 'not_saved');
  assert.equal(turn.retryable, false);
  assert.equal(interrupted.beginRetry('resp_8'), null);
}

function checkLateClearAfterDrainedPlaybackIsTolerated(): void {
  // A UI interrupt can race the natural end of playback: `stopped` promotes the
  // turn to `committing`, then the server's `cleared` ack arrives. The person
  // heard the whole answer, so the commit must stand rather than fail closed.
  const assembler = new RealtimeTurnAssembler();
  addUser(assembler, 'user_9', 'Answer this fully.');
  addAssistant(assembler, 'resp_10', 'assistant_10', 'user_9', 'A fully played answer.');
  assembler.completeResponse('resp_10', 'completed');
  assembler.completePlayback('resp_10');
  assert.equal(assembler.takeReadyCommits().length, 1);

  assembler.interruptPlayback('resp_10');
  const [turn] = assembler.snapshot().turns;
  assert.equal(turn.commitStatus, 'committing');
  assert.equal(turn.assistantIsPartial, false);

  assembler.markSaved('resp_10');
  assert.equal(assembler.snapshot().turns[0].commitStatus, 'saved');
}

function checkSessionConfigEventsCarryTurnPacing(): void {
  const created = parseRealtimeEvent(
    JSON.stringify({
      type: 'session.created',
      event_id: 'event_session_created',
      session: {
        audio: { input: { turn_detection: { type: 'semantic_vad', eagerness: 'medium' } } },
      },
    })
  );
  assert.equal(created.type, 'session.created');
  assert.equal(
    created.type === 'session.created'
      ? created.session.audio?.input?.turn_detection?.eagerness
      : null,
    'medium'
  );

  // Push-to-talk clears turn detection; the schema must accept the null.
  assert.equal(
    parseRealtimeEvent(
      JSON.stringify({
        type: 'session.updated',
        event_id: 'event_session_updated',
        session: { audio: { input: { turn_detection: null } } },
      })
    ).type,
    'session.updated'
  );

  // `auto` is the provider default, so rejecting it would kill every session
  // whose effective config echoes it back on the very first event.
  assert.equal(
    parseRealtimeEvent(
      JSON.stringify({
        type: 'session.created',
        event_id: 'event_auto_eagerness',
        session: {
          audio: { input: { turn_detection: { type: 'semantic_vad', eagerness: 'auto' } } },
        },
      })
    ).type,
    'session.created'
  );

  // Unknown input fields survive parsing so the client can echo the server's
  // whole `audio.input` back on `session.update` instead of a partial object.
  const echoed = parseRealtimeEvent(
    JSON.stringify({
      type: 'session.created',
      event_id: 'event_passthrough',
      session: {
        audio: {
          input: {
            noise_reduction: { type: 'near_field' },
            transcription: { model: 'gpt-4o-transcribe' },
            turn_detection: { type: 'semantic_vad', eagerness: 'medium' },
          },
        },
      },
    })
  );
  const input = echoed.type === 'session.created' ? echoed.session.audio?.input : undefined;
  assert.deepEqual(input?.noise_reduction, { type: 'near_field' });
  assert.deepEqual(input?.transcription, { model: 'gpt-4o-transcribe' });

  assert.throws(
    () =>
      parseRealtimeEvent(
        JSON.stringify({
          type: 'session.updated',
          event_id: 'event_bad_eagerness',
          session: {
            audio: { input: { turn_detection: { type: 'semantic_vad', eagerness: 'instant' } } },
          },
        })
      ),
    RealtimeProtocolError
  );
}

function checkResponseCreatedEvent(): void {
  const event = parseRealtimeEvent(
    JSON.stringify({
      type: 'response.created',
      event_id: 'event_response_created',
      response: { id: 'resp_9', status: 'in_progress' },
    })
  );
  assert.equal(event.type === 'response.created' ? event.response.id : null, 'resp_9');
  assert.throws(
    () =>
      parseRealtimeEvent(
        JSON.stringify({ type: 'response.created', event_id: 'event_without_response' })
      ),
    RealtimeProtocolError
  );
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

function checkConversationItemTruncatedEvent(): void {
  assert.equal(
    parseRealtimeEvent(
      JSON.stringify({
        type: 'conversation.item.truncated',
        event_id: 'event_truncated',
        item_id: 'assistant_6',
        content_index: 0,
        audio_end_ms: 1500,
      })
    ).type,
    'conversation.item.truncated'
  );
  assert.throws(
    () =>
      parseRealtimeEvent(
        JSON.stringify({
          type: 'conversation.item.truncated',
          event_id: 'event_malformed_truncated',
          item_id: 'assistant_6',
          content_index: 0,
        })
      ),
    RealtimeProtocolError
  );
}

checkExactCommitAndRetry();
checkCitationChainAndIsolation();
checkInterruptedResponseDoesNotCommit();
checkTruncatedPlaybackDoesNotCommit();
checkOnlyDeliverableTurnsAreRetryable();
checkLateClearAfterDrainedPlaybackIsTolerated();
checkSessionConfigEventsCarryTurnPacing();
checkResponseCreatedEvent();
checkUnknownEventsFailClosed();
checkWebRtcOutputAudioLifecycleEvents();
checkConversationItemTruncatedEvent();

process.stdout.write('Life Realtime state checks passed.\n');
