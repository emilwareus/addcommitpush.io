'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  conversationTurnResponseSchema,
  createRealtimeSessionResponseSchema,
  lifeUiErrorEnvelopeSchema,
  messageListSchema,
  realtimeSessionSchema,
  type RealtimeTurnRequest,
} from '@/lib/life/contracts';
import { parseRealtimeEvent, RealtimeProtocolError } from './realtime-events';
import { RealtimeTurnAssembler, type TurnAssemblerSnapshot } from './realtime-turn-assembler';
import { forwardMemoryToolCalls } from './realtime-tool-handler';

export type VoicePhase =
  | 'idle'
  | 'requesting_microphone'
  | 'creating_session'
  | 'connecting'
  | 'connected'
  | 'closing'
  | 'closed'
  | 'error';

interface ActiveSessionView {
  id: string;
  conversationId: string;
  allowedSensitivities: string[];
  expiresAt: string;
}

interface StartVoiceInput {
  title: string;
  sensitivities: string[];
}

const EMPTY_SNAPSHOT: TurnAssemblerSnapshot = { turns: [], provisionalInputs: [] };

export function useRealtimeVoiceSession() {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [controlError, setControlError] = useState<string | null>(null);
  const [session, setSession] = useState<ActiveSessionView | null>(null);
  const [snapshot, setSnapshot] = useState<TurnAssemblerSnapshot>(EMPTY_SNAPSHOT);
  const [muted, setMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [toolSearchCount, setToolSearchCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const expiresAtRef = useRef<number | null>(null);
  const closingRef = useRef(false);
  const mutedRef = useRef(false);
  const assemblerRef = useRef(new RealtimeTurnAssembler());
  const handledToolCallsRef = useRef(new Map<string, string>());

  const refreshSnapshot = useCallback(() => {
    setSnapshot(assemblerRef.current.snapshot());
  }, []);

  const refreshDevices = useCallback(async () => {
    const availableDevices = await navigator.mediaDevices.enumerateDevices();
    setDevices(availableDevices.filter((device) => device.kind === 'audioinput'));
  }, []);

  const cleanupLocalResources = useCallback(() => {
    const stream = mediaStreamRef.current;
    mediaStreamRef.current = null;
    for (const track of stream?.getTracks() ?? []) track.stop();

    const dataChannel = dataChannelRef.current;
    dataChannelRef.current = null;
    if (dataChannel && dataChannel.readyState !== 'closed') dataChannel.close();

    const peerConnection = peerConnectionRef.current;
    peerConnectionRef.current = null;
    if (peerConnection) {
      peerConnection.ontrack = null;
      peerConnection.onconnectionstatechange = null;
      peerConnection.close();
    }
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  }, []);

  const bestEffortServerClose = useCallback((sessionId: string) => {
    void fetch(`/api/life/realtime/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      keepalive: true,
    });
  }, []);

  const failSession = useCallback(
    (failure: unknown) => {
      if (closingRef.current) return;
      closingRef.current = true;
      cleanupLocalResources();
      setIsSpeaking(false);
      setToolSearchCount(0);
      setError(errorMessage(failure));
      setPhase('error');
    },
    [cleanupLocalResources]
  );

  const persistTurn = useCallback(
    async (payload: RealtimeTurnRequest) => {
      const sessionId = sessionIdRef.current;
      const conversationId = conversationIdRef.current;
      if (!sessionId || !conversationId) {
        assemblerRef.current.markNotSaved(
          payload.provider_response_id,
          'The active Life session is unavailable.'
        );
        refreshSnapshot();
        return;
      }

      try {
        const response = await fetch(
          `/api/life/realtime/sessions/${encodeURIComponent(sessionId)}/turns`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
        const decoded: unknown = await response.json().catch(() => null);
        if (response.status === 409) {
          const reconciled = await reconcileCommit(conversationId, payload.provider_response_id);
          if (reconciled) assemblerRef.current.markSaved(payload.provider_response_id);
          else assemblerRef.current.markConflict(payload.provider_response_id);
          refreshSnapshot();
          return;
        }
        if (!response.ok) {
          assemblerRef.current.markNotSaved(
            payload.provider_response_id,
            lifeResponseError(decoded, 'Life could not save this turn.')
          );
          refreshSnapshot();
          return;
        }
        const parsed = conversationTurnResponseSchema.safeParse(decoded);
        if (!parsed.success) {
          assemblerRef.current.markNotSaved(
            payload.provider_response_id,
            'Life returned an invalid durable-turn response.'
          );
          refreshSnapshot();
          return;
        }
        assemblerRef.current.markSaved(payload.provider_response_id);
        refreshSnapshot();
      } catch {
        assemblerRef.current.markNotSaved(
          payload.provider_response_id,
          'The network interrupted the durable save. Retry sends the identical provider response.'
        );
        refreshSnapshot();
      }
    },
    [refreshSnapshot]
  );

  const commitReadyTurns = useCallback(() => {
    const payloads = assemblerRef.current.takeReadyCommits();
    if (payloads.length === 0) return;
    refreshSnapshot();
    for (const payload of payloads) void persistTurn(payload);
  }, [persistTurn, refreshSnapshot]);

  const processRealtimeEvent = useCallback(
    async (serializedEvent: string) => {
      const event = parseRealtimeEvent(serializedEvent);
      const assembler = assemblerRef.current;

      switch (event.type) {
        case 'conversation.item.added':
          assembler.addConversationItem({
            itemId: event.item.id,
            type: event.item.type,
            ...(event.item.role ? { role: event.item.role } : {}),
            ...(event.item.call_id ? { callId: event.item.call_id } : {}),
            previousItemId: event.previous_item_id,
          });
          break;
        case 'conversation.item.input_audio_transcription.delta':
          assembler.addInputDelta(event.item_id, event.delta);
          break;
        case 'conversation.item.input_audio_transcription.completed':
          assembler.completeInputTranscript(event.item_id, event.transcript);
          break;
        case 'conversation.item.input_audio_transcription.failed':
          throw new RealtimeProtocolError(
            event.error.message
              ? `Input transcription failed: ${event.error.message}`
              : 'Input transcription failed, so this turn cannot be saved.'
          );
        case 'response.output_item.added':
          assembler.linkOutputItem(event.response_id, event.item.id);
          break;
        case 'response.output_audio_transcript.delta':
          setIsSpeaking(true);
          assembler.addAssistantDelta(event.response_id, event.item_id, event.delta);
          break;
        case 'response.output_audio_transcript.done':
          assembler.completeAssistantTranscript(event.response_id, event.item_id, event.transcript);
          break;
        case 'response.done': {
          setIsSpeaking(false);
          for (const output of event.response.output) {
            assembler.linkOutputItem(event.response.id, output.id);
          }
          assembler.completeResponse(event.response.id, event.response.status);
          const functionCalls = event.response.output.filter(
            (
              output
            ): output is Extract<
              (typeof event.response.output)[number],
              { type: 'function_call' }
            > => output.type === 'function_call'
          );
          const unknownFunction = functionCalls.find((call) => call.name !== 'search_life_memory');
          if (unknownFunction) {
            throw new RealtimeProtocolError(
              `OpenAI requested an unknown function: ${unknownFunction.name}.`
            );
          }
          const newFunctionCalls = functionCalls
            .filter((call) => call.status === 'completed')
            .filter((call) => {
              const identity = `${event.response.id}:${call.id}:${call.name}:${call.arguments}`;
              const existing = handledToolCallsRef.current.get(call.call_id);
              if (existing && existing !== identity) {
                throw new RealtimeProtocolError(`Function call ${call.call_id} changed identity.`);
              }
              if (existing) return false;
              handledToolCallsRef.current.set(call.call_id, identity);
              return true;
            });
          if (newFunctionCalls.length > 0) {
            const sessionId = sessionIdRef.current;
            const dataChannel = dataChannelRef.current;
            if (!sessionId || !dataChannel) {
              throw new RealtimeProtocolError('The memory tool ran without an active session.');
            }
            setToolSearchCount(newFunctionCalls.length);
            try {
              const results = await forwardMemoryToolCalls({
                calls: newFunctionCalls,
                responseId: event.response.id,
                sessionId,
                dataChannel,
              });
              for (const result of results) assembler.recordToolResult(result);
            } finally {
              setToolSearchCount(0);
            }
          }
          break;
        }
        case 'input_audio_buffer.speech_started':
          setIsSpeaking(false);
          break;
        case 'input_audio_buffer.speech_stopped':
          break;
        case 'error':
          throw new RealtimeProtocolError(`OpenAI Realtime error: ${event.error.message}`);
        default:
          break;
      }

      refreshSnapshot();
      commitReadyTurns();
    },
    [commitReadyTurns, refreshSnapshot]
  );

  const start = useCallback(
    async (input: StartVoiceInput) => {
      if (!['idle', 'closed', 'error'].includes(phase)) return;
      if (phase === 'error' && sessionIdRef.current) return;
      closingRef.current = false;
      setError(null);
      setControlError(null);
      setSession(null);
      setSnapshot(EMPTY_SNAPSHOT);
      setElapsedSeconds(0);
      setIsSpeaking(false);
      setToolSearchCount(0);
      assemblerRef.current = new RealtimeTurnAssembler();
      handledToolCallsRef.current = new Map();

      try {
        setPhase('requesting_microphone');
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
        });
        mediaStreamRef.current = stream;
        const audioTrack = stream.getAudioTracks()[0];
        if (!audioTrack) throw new Error('The selected media stream has no microphone track.');
        const activeDeviceId = audioTrack.getSettings().deviceId;
        if (activeDeviceId) setSelectedDeviceId(activeDeviceId);
        await refreshDevices();

        setPhase('creating_session');
        const sessionResponse = await fetch('/api/life/realtime/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        const decodedSession: unknown = await sessionResponse.json().catch(() => null);
        if (!sessionResponse.ok) {
          throw new Error(
            lifeResponseError(decodedSession, 'Life could not create a voice session.')
          );
        }
        const parsedSession = createRealtimeSessionResponseSchema.safeParse(decodedSession);
        if (!parsedSession.success) {
          throw new Error('Life returned an invalid Realtime session response.');
        }
        const {
          realtime_session: realtimeSession,
          conversation,
          client_secret: clientSecret,
        } = parsedSession.data;
        sessionIdRef.current = realtimeSession.id;
        conversationIdRef.current = conversation.id;
        expiresAtRef.current = Date.parse(realtimeSession.expires_at);
        setSession({
          id: realtimeSession.id,
          conversationId: conversation.id,
          allowedSensitivities: realtimeSession.allowed_sensitivities,
          expiresAt: realtimeSession.expires_at,
        });

        setPhase('connecting');
        const peerConnection = new RTCPeerConnection();
        peerConnectionRef.current = peerConnection;
        peerConnection.addTrack(audioTrack, stream);
        peerConnection.ontrack = (trackEvent) => {
          const [remoteStream] = trackEvent.streams;
          if (!remoteStream) {
            failSession(new RealtimeProtocolError('OpenAI sent an audio track without a stream.'));
            return;
          }
          if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
        };
        peerConnection.onconnectionstatechange = () => {
          if (
            !closingRef.current &&
            ['failed', 'disconnected'].includes(peerConnection.connectionState)
          ) {
            failSession(new Error(`The WebRTC connection ${peerConnection.connectionState}.`));
          }
        };

        const dataChannel = peerConnection.createDataChannel('oai-events');
        dataChannelRef.current = dataChannel;
        dataChannel.addEventListener('message', (messageEvent: MessageEvent<unknown>) => {
          if (typeof messageEvent.data !== 'string') {
            failSession(new RealtimeProtocolError('OpenAI sent a non-text data-channel event.'));
            return;
          }
          void processRealtimeEvent(messageEvent.data).catch(failSession);
        });
        dataChannel.addEventListener('close', () => {
          if (!closingRef.current) failSession(new Error('The Realtime data channel closed.'));
        });

        const offer = await peerConnection.createOffer();
        if (!offer.sdp) throw new Error('The browser did not create an SDP offer.');
        await peerConnection.setLocalDescription(offer);
        const sdpResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${clientSecret.value}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        });
        if (!sdpResponse.ok) {
          throw new Error(`OpenAI rejected the Realtime connection (${sdpResponse.status}).`);
        }
        const answerSdp = await sdpResponse.text();
        await peerConnection.setRemoteDescription({ type: 'answer', sdp: answerSdp });
        await waitForWebRtcReady(peerConnection, dataChannel);

        startedAtRef.current = Date.now();
        setPhase('connected');
      } catch (failure) {
        failSession(failure);
      }
    },
    [failSession, phase, processRealtimeEvent, refreshDevices, selectedDeviceId]
  );

  const toggleMute = useCallback(() => {
    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    setMuted(nextMuted);
    for (const track of mediaStreamRef.current?.getAudioTracks() ?? []) {
      track.enabled = !nextMuted;
    }
  }, []);

  const changeInputDevice = useCallback(
    async (deviceId: string) => {
      setControlError(null);
      if (phase !== 'connected') {
        setSelectedDeviceId(deviceId);
        return;
      }
      try {
        const replacementStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } },
        });
        const replacementTrack = replacementStream.getAudioTracks()[0];
        if (!replacementTrack) throw new Error('The selected device has no microphone track.');
        replacementTrack.enabled = !mutedRef.current;
        const sender = peerConnectionRef.current
          ?.getSenders()
          .find((candidate) => candidate.track?.kind === 'audio');
        if (!sender) {
          replacementTrack.stop();
          throw new Error('The active connection has no microphone sender.');
        }
        await sender.replaceTrack(replacementTrack);
        const oldStream = mediaStreamRef.current;
        mediaStreamRef.current = replacementStream;
        for (const track of oldStream?.getTracks() ?? []) track.stop();
        setSelectedDeviceId(deviceId);
        await refreshDevices();
      } catch (failure) {
        setControlError(errorMessage(failure));
      }
    },
    [phase, refreshDevices]
  );

  const retryCommit = useCallback(
    (responseId: string) => {
      const payload = assemblerRef.current.beginRetry(responseId);
      if (!payload) return;
      refreshSnapshot();
      void persistTurn(payload);
    },
    [persistTurn, refreshSnapshot]
  );

  const end = useCallback(async () => {
    if (!sessionIdRef.current || !['connected', 'error'].includes(phase)) return;
    closingRef.current = true;
    setPhase('closing');
    setError(null);
    setControlError(null);
    cleanupLocalResources();

    const sessionId = sessionIdRef.current;
    try {
      const response = await fetch(`/api/life/realtime/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const decoded: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(lifeResponseError(decoded, 'Life could not close the voice session.'));
      }
      const parsed = realtimeSessionSchema.safeParse(decoded);
      if (!parsed.success || parsed.data.id !== sessionId || parsed.data.status !== 'closed') {
        throw new Error('Life returned an invalid session-close response.');
      }
      sessionIdRef.current = null;
      expiresAtRef.current = null;
      setPhase('closed');
    } catch (failure) {
      setError(errorMessage(failure));
      setPhase('error');
    }
  }, [cleanupLocalResources, phase]);

  useEffect(() => {
    if (phase !== 'connected') return;
    const interval = window.setInterval(() => {
      const startedAt = startedAtRef.current;
      if (startedAt) setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1_000));
      const expiresAt = expiresAtRef.current;
      if (expiresAt && Date.now() >= expiresAt) {
        failSession(new Error('The 60-minute Life Realtime session expired.'));
      }
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [failSession, phase]);

  useEffect(() => {
    return () => {
      closingRef.current = true;
      cleanupLocalResources();
      const sessionId = sessionIdRef.current;
      if (sessionId) bestEffortServerClose(sessionId);
    };
  }, [bestEffortServerClose, cleanupLocalResources]);

  return {
    phase,
    error,
    controlError,
    session,
    snapshot,
    muted,
    isSpeaking,
    toolSearchCount,
    elapsedSeconds,
    devices,
    selectedDeviceId,
    remoteAudioRef,
    start,
    toggleMute,
    changeInputDevice,
    retryCommit,
    end,
  };
}

async function waitForWebRtcReady(
  peerConnection: RTCPeerConnection,
  dataChannel: RTCDataChannel
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (result: 'resolve' | 'reject', error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      peerConnection.removeEventListener('connectionstatechange', check);
      dataChannel.removeEventListener('open', check);
      if (result === 'resolve') resolve();
      else reject(error);
    };
    const check = () => {
      if (peerConnection.connectionState === 'connected' && dataChannel.readyState === 'open') {
        finish('resolve');
        return;
      }
      if (['failed', 'closed'].includes(peerConnection.connectionState)) {
        finish('reject', new Error(`The WebRTC connection ${peerConnection.connectionState}.`));
      }
    };
    const timeout = window.setTimeout(
      () => finish('reject', new Error('The Realtime connection timed out.')),
      20_000
    );
    peerConnection.addEventListener('connectionstatechange', check);
    dataChannel.addEventListener('open', check);
    check();
  });
}

async function reconcileCommit(
  conversationId: string,
  providerResponseId: string
): Promise<boolean> {
  const response = await fetch(
    `/api/life/conversations/${encodeURIComponent(conversationId)}/messages`,
    { cache: 'no-store' }
  );
  if (!response.ok) return false;
  const decoded: unknown = await response.json().catch(() => null);
  const messages = messageListSchema.safeParse(decoded);
  if (!messages.success) return false;
  return messages.data.some((message) => message.provider_response_id === providerResponseId);
}

function lifeResponseError(decoded: unknown, defaultMessage: string): string {
  const parsed = lifeUiErrorEnvelopeSchema.safeParse(decoded);
  if (!parsed.success) return defaultMessage;
  const requestId = parsed.data.error.request_id;
  return requestId
    ? `${parsed.data.error.message} Request ID: ${requestId}`
    : parsed.data.error.message;
}

function errorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Microphone permission was denied. Allow microphone access, then start a new session.';
  }
  if (error instanceof Error) return error.message;
  return 'The voice session failed.';
}
