'use client';

import { RealtimeProtocolError, type RealtimeAudioInput, type TurnPacing } from './realtime-events';

/**
 * Every client-to-server event Life sends over the `oai-events` data channel.
 * Keeping them in one module means the wire format is stated once.
 */

function send(dataChannel: RTCDataChannel, event: Record<string, unknown>): void {
  if (dataChannel.readyState !== 'open') {
    throw new RealtimeProtocolError(
      `The Realtime data channel is ${dataChannel.readyState}, so ${String(event.type)} was not sent.`
    );
  }
  dataChannel.send(JSON.stringify(event));
}

/**
 * Re-tunes semantic turn detection without tearing down the session. `eagerness`
 * sets how long the model waits for the person to finish: `low` allows an
 * 8-second pause, `medium` 4 seconds, `high` 2 seconds.
 *
 * `audioInput` must be the input config the server reported in `session.created`
 * or `session.updated`. Resending it verbatim with one field swapped keeps the
 * Life API the single author of transcription and noise reduction: a partial
 * `audio.input` risks dropping whichever of those fields the update omits.
 */
export function sendTurnPacing(
  dataChannel: RTCDataChannel,
  audioInput: RealtimeAudioInput,
  pacing: TurnPacing
): void {
  const turnDetection = audioInput.turn_detection;
  if (!turnDetection) {
    throw new RealtimeProtocolError('The session has no turn detection to re-tune.');
  }
  send(dataChannel, {
    type: 'session.update',
    session: {
      type: 'realtime',
      audio: {
        input: { ...audioInput, turn_detection: { ...turnDetection, eagerness: pacing } },
      },
    },
  });
}

/**
 * Stops the assistant mid-sentence. `response.cancel` must precede
 * `output_audio_buffer.clear`: the first stops generation, the second discards
 * the audio the server has already buffered for WebRTC playback.
 *
 * Generation usually finishes long before playback does, so `responseInProgress`
 * decides whether there is anything to cancel. Cancelling nothing makes the
 * server emit an `error` event, and Life treats every `error` as fatal.
 */
export function sendInterrupt(
  dataChannel: RTCDataChannel,
  options: { responseInProgress: boolean }
): void {
  if (options.responseInProgress) send(dataChannel, { type: 'response.cancel' });
  send(dataChannel, { type: 'output_audio_buffer.clear' });
}

export function sendFunctionCallOutput(
  dataChannel: RTCDataChannel,
  input: { callId: string; output: string }
): void {
  send(dataChannel, {
    type: 'conversation.item.create',
    item: { type: 'function_call_output', call_id: input.callId, output: input.output },
  });
}

export function sendResponseCreate(dataChannel: RTCDataChannel): void {
  send(dataChannel, { type: 'response.create' });
}
