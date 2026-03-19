'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface JarvisMessage {
  id: string;
  type: 'transcript' | 'thinking' | 'status' | 'partial';
  role?: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface StreamingConfig {
  stt: boolean;
  llm: boolean;
  tts: boolean;
}

export interface SlideContext {
  current_title: string;
  current_notes: string;
  next_title: string;
  remaining: number;
}

export interface VadConfig {
  threshold: number;
  silenceMs: number;
}

export type Transport = 'websocket' | 'webrtc';

type JarvisStatus =
  | 'disconnected'
  | 'connecting'
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking';

interface JarvisContextType {
  messages: JarvisMessage[];
  status: JarvisStatus;
  isConnected: boolean;
  streamingConfig: StreamingConfig;
  vadConfig: VadConfig;
  sttModel: string;
  sttModels: string[];
  llmModel: string;
  llmModels: string[];
  transport: Transport;
  bargeInEnabled: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendSlideContext: (context: SlideContext) => void;
  setStreamingConfig: (config: StreamingConfig) => void;
  setVadConfig: (config: VadConfig) => void;
  setSttModel: (model: string) => void;
  setLlmModel: (model: string) => void;
  setTransport: (t: Transport) => void;
  setBargeInEnabled: (enabled: boolean) => void;
}

const JarvisContext = createContext<JarvisContextType | null>(null);

export function useJarvis(): JarvisContextType {
  const ctx = useContext(JarvisContext);
  if (!ctx) throw new Error('useJarvis must be used within JarvisProvider');
  return ctx;
}

// ─── Audio Queue (TTS Playback) ──────────────────────────────────────────────

const TTS_SAMPLE_RATE = 24000;

class AudioQueue {
  private queue: AudioBuffer[] = [];
  private isPlaying = false;
  private ctx: AudioContext;
  private onPlayingChange: (playing: boolean) => void;
  private currentSource: AudioBufferSourceNode | null = null;

  constructor(ctx: AudioContext, onPlayingChange: (playing: boolean) => void) {
    this.ctx = ctx;
    this.onPlayingChange = onPlayingChange;
  }

  enqueue(pcmInt16: ArrayBuffer): void {
    const int16 = new Int16Array(pcmInt16);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const buffer = this.ctx.createBuffer(1, float32.length, TTS_SAMPLE_RATE);
    buffer.getChannelData(0).set(float32);
    this.queue.push(buffer);

    if (!this.isPlaying) {
      this.playNext();
    }
  }

  private playNext(): void {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this.onPlayingChange(false);
      return;
    }

    if (!this.isPlaying) {
      this.isPlaying = true;
      this.onPlayingChange(true);
    }

    const buffer = this.queue.shift()!;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);
    source.onended = () => {
      this.currentSource = null;
      this.playNext();
    };
    this.currentSource = source;
    source.start();
  }

  clear(): void {
    this.queue = [];
    if (this.currentSource) {
      this.currentSource.onended = null;
      this.currentSource.stop();
      this.currentSource = null;
    }
    this.isPlaying = false;
    this.onPlayingChange(false);
  }
}

// ─── URLs ─────────────────────────────────────────────────────────────────────

// Jarvis backend always runs with SSL (mkcert) so always use wss/https
function getWsUrl(): string {
  return 'wss://localhost:8770/ws';
}

function getRtcOfferUrl(): string {
  return 'https://localhost:8770/rtc/offer';
}

const HEADER_SIZE = 4; // 4-byte uint32 LE flags

// ─── Provider ────────────────────────────────────────────────────────────────

export function JarvisProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<JarvisMessage[]>([]);
  const [status, setStatus] = useState<JarvisStatus>('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const [streamingConfig, setStreamingConfigState] = useState<StreamingConfig>({
    stt: false,
    llm: false,
    tts: false,
  });
  const [vadConfig, setVadConfigState] = useState<VadConfig>({
    threshold: 0.5,
    silenceMs: 700,
  });
  const [sttModel, setSttModelState] = useState('');
  const [sttModels, setSttModels] = useState<string[]>([]);
  const [llmModel, setLlmModelState] = useState('');
  const [llmModels, setLlmModels] = useState<string[]>([]);
  const [transport, setTransportState] = useState<Transport>('websocket');
  const [bargeInEnabled, setBargeInEnabledState] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);
  const isTtsPlayingRef = useRef(false);
  const bargeInEnabledRef = useRef(false);
  const suppressTtsRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamingDeltaIdRef = useRef<string | null>(null);

  // WebRTC refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const rtcBargeInIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addMessage = useCallback(
    (type: JarvisMessage['type'], text: string, role?: 'user' | 'assistant') => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type,
          role,
          text,
          timestamp: Date.now(),
        },
      ]);
    },
    [],
  );

  // ── Shared message handler ────────────────────────────────────────────────

  const handleServerMessage = useCallback(
    (data: string | ArrayBuffer) => {
      if (typeof data === 'string') {
        const msg = JSON.parse(data);

        switch (msg.type) {
          case 'ready':
            setIsConnected(true);
            setStatus('idle');
            if (msg.stt_models) setSttModels(msg.stt_models);
            if (msg.active_stt_model) setSttModelState(msg.active_stt_model);
            if (msg.llm_models) setLlmModels(msg.llm_models);
            if (msg.active_llm_model) setLlmModelState(msg.active_llm_model);
            if (msg.vad_threshold != null && msg.vad_silence_ms != null) {
              setVadConfigState({ threshold: msg.vad_threshold, silenceMs: msg.vad_silence_ms });
            }
            if (msg.barge_in_enabled != null) {
              setBargeInEnabledState(msg.barge_in_enabled);
              bargeInEnabledRef.current = msg.barge_in_enabled;
            }
            // Enable mic capture for WebSocket (worklet may not exist for WebRTC)
            workletNodeRef.current?.port.postMessage({ type: 'set_enabled', enabled: true });
            break;

          case 'stt_model_changed':
            setSttModelState(msg.model);
            break;

          case 'llm_model_changed':
            setLlmModelState(msg.model);
            break;

          case 'vad_config_changed':
            setVadConfigState({ threshold: msg.threshold, silenceMs: msg.silence_ms });
            break;

          case 'barge_in_changed':
            setBargeInEnabledState(msg.enabled);
            bargeInEnabledRef.current = msg.enabled;
            break;

          case 'clear_audio':
            suppressTtsRef.current = false;
            // WebSocket: flush the AudioQueue
            audioQueueRef.current?.clear();
            // WebRTC: pause and reset the remote audio element
            if (remoteAudioRef.current) {
              remoteAudioRef.current.pause();
              remoteAudioRef.current.currentTime = 0;
              remoteAudioRef.current.play().catch(() => {});
            }
            break;

          case 'transcript':
            if (msg.role === 'user') {
              setMessages((prev) => prev.filter((m) => m.type !== 'partial'));
            }
            if (msg.role === 'assistant' && streamingDeltaIdRef.current) {
              const deltaId = streamingDeltaIdRef.current;
              streamingDeltaIdRef.current = null;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === deltaId ? { ...m, text: msg.text } : m,
                ),
              );
              break;
            }
            addMessage('transcript', msg.text, msg.role);
            break;

          case 'partial_transcript':
            setMessages((prev) => {
              const existing = prev.find((m) => m.type === 'partial');
              if (existing) {
                return prev.map((m) =>
                  m.type === 'partial' ? { ...m, text: msg.text } : m,
                );
              }
              return [
                ...prev,
                {
                  id: `partial-${Date.now()}`,
                  type: 'partial' as const,
                  role: 'user' as const,
                  text: msg.text,
                  timestamp: Date.now(),
                },
              ];
            });
            break;

          case 'response_delta': {
            const deltaId = streamingDeltaIdRef.current;
            if (deltaId) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === deltaId ? { ...m, text: m.text + msg.text } : m,
                ),
              );
            } else {
              const newId = `delta-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
              streamingDeltaIdRef.current = newId;
              setMessages((prev) => [
                ...prev,
                {
                  id: newId,
                  type: 'transcript',
                  role: 'assistant',
                  text: msg.text,
                  timestamp: Date.now(),
                },
              ]);
            }
            break;
          }

          case 'thinking':
            addMessage('thinking', msg.text);
            break;

          case 'status':
            if (
              msg.status === 'idle' ||
              msg.status === 'thinking' ||
              msg.status === 'speaking'
            ) {
              if (msg.status === 'idle') {
                suppressTtsRef.current = false;
              }
              setStatus(msg.status);
            }
            break;

          case 'listening':
            if (msg.active) {
              setStatus('listening');
            }
            break;
        }
      } else {
        // Binary: TTS audio from server (raw PCM int16, 24kHz) — WebSocket only
        // Skip if barge-in has suppressed playback (server is still flushing)
        if (!suppressTtsRef.current) {
          audioQueueRef.current?.enqueue(data);
        }
      }
    },
    [addMessage],
  );

  // ── Send control message (works on both transports) ───────────────────────

  const sendControlMessage = useCallback((msg: object) => {
    const payload = JSON.stringify(msg);
    if (dataChannelRef.current?.readyState === 'open') {
      dataChannelRef.current.send(payload);
    } else if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(payload);
    }
  }, []);

  const setStreamingConfig = useCallback((config: StreamingConfig) => {
    setStreamingConfigState(config);
    sendControlMessage({ type: 'set_streaming', ...config });
  }, [sendControlMessage]);

  const setVadConfig = useCallback((config: VadConfig) => {
    setVadConfigState(config);
    sendControlMessage({ type: 'set_vad_config', threshold: config.threshold, silence_ms: config.silenceMs });
  }, [sendControlMessage]);

  const setSttModel = useCallback((model: string) => {
    setSttModelState(model);
    sendControlMessage({ type: 'set_stt_model', model });
  }, [sendControlMessage]);

  const setLlmModel = useCallback((model: string) => {
    setLlmModelState(model);
    sendControlMessage({ type: 'set_llm_model', model });
  }, [sendControlMessage]);

  const setBargeInEnabled = useCallback((enabled: boolean) => {
    setBargeInEnabledState(enabled);
    bargeInEnabledRef.current = enabled;
    sendControlMessage({ type: 'set_barge_in', enabled });
  }, [sendControlMessage]);

  // ── Cleanup ──────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    // WebSocket cleanup
    workletNodeRef.current?.port.postMessage({ type: 'set_enabled', enabled: false });
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;

    // WebRTC cleanup
    if (rtcBargeInIntervalRef.current) {
      clearInterval(rtcBargeInIntervalRef.current);
      rtcBargeInIntervalRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Shared cleanup
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    audioQueueRef.current?.clear();
    audioQueueRef.current = null;

    if (audioCtxRef.current?.state !== 'closed') {
      audioCtxRef.current?.close();
    }
    audioCtxRef.current = null;

    isTtsPlayingRef.current = false;
    setIsConnected(false);
    setStatus('disconnected');
  }, []);

  // ── Connect WebSocket ──────────────────────────────────────────────────

  const connectWebSocket = useCallback(async () => {
    if (wsRef.current) return;

    setStatus('connecting');

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
      },
    });
    streamRef.current = stream;

    const audioCtx = new AudioContext({ sampleRate: 48000 });
    audioCtxRef.current = audioCtx;

    audioQueueRef.current = new AudioQueue(audioCtx, (playing) => {
      isTtsPlayingRef.current = playing;
    });

    await audioCtx.audioWorklet.addModule(
      '/presentations/voice-agents/audio-capture-worklet.js',
    );

    const source = audioCtx.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(audioCtx, 'audio-capture-processor');
    workletNodeRef.current = workletNode;

    source.connect(workletNode);
    const silentGain = audioCtx.createGain();
    silentGain.gain.value = 0;
    workletNode.connect(silentGain);
    silentGain.connect(audioCtx.destination);

    const ws = new WebSocket(getWsUrl());
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onmessage = (event) => {
      handleServerMessage(event.data);
    };

    ws.onerror = () => {
      cleanup();
    };

    ws.onclose = () => {
      cleanup();
    };

    let bargeInHotFrames = 0;
    workletNode.port.onmessage = (e) => {
      if (e.data?.type === 'audio' && wsRef.current?.readyState === WebSocket.OPEN) {
        const samples: Int16Array = e.data.samples;

        // Frontend barge-in: if TTS is playing and barge-in is ON,
        // check mic RMS and stop playback when sustained speech detected.
        // Require consecutive loud frames to avoid echo-triggered false positives.
        if (isTtsPlayingRef.current && bargeInEnabledRef.current) {
          let sumSq = 0;
          for (let i = 0; i < samples.length; i++) {
            const s = samples[i] / 32768;
            sumSq += s * s;
          }
          const rms = Math.sqrt(sumSq / samples.length);
          if (rms > 0.06) {
            bargeInHotFrames++;
          } else {
            bargeInHotFrames = 0;
          }
          // 3 consecutive frames (~96ms) above threshold = real speech, not echo
          if (bargeInHotFrames >= 3) {
            suppressTtsRef.current = true;
            audioQueueRef.current?.clear();
            wsRef.current?.send(JSON.stringify({ type: 'barge_in_interrupt' }));
            bargeInHotFrames = 0;
          }
        } else {
          bargeInHotFrames = 0;
        }

        const flags = isTtsPlayingRef.current ? 1 : 0;
        const header = new ArrayBuffer(HEADER_SIZE);
        new DataView(header).setUint32(0, flags, true);

        const frame = new Uint8Array(HEADER_SIZE + samples.byteLength);
        frame.set(new Uint8Array(header), 0);
        frame.set(new Uint8Array(samples.buffer), HEADER_SIZE);

        wsRef.current.send(frame.buffer);
      }
    };
  }, [handleServerMessage, cleanup]);

  // ── Connect WebRTC ─────────────────────────────────────────────────────

  const connectWebRTC = useCallback(async () => {
    if (pcRef.current) return;

    setStatus('connecting');

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    streamRef.current = stream;

    const pc = new RTCPeerConnection({
      iceServers: [],
    });
    pcRef.current = pc;

    // Add mic track
    pc.addTrack(stream.getAudioTracks()[0], stream);

    // Create DataChannel for JSON control messages
    const dc = pc.createDataChannel('control');
    dataChannelRef.current = dc;

    dc.onopen = () => {
      // Send streaming config once channel is open
      sendControlMessage({ type: 'set_streaming', ...streamingConfig });
    };

    dc.onmessage = (event) => {
      handleServerMessage(event.data);
    };

    // Receive TTS audio track from server
    pc.ontrack = (event) => {
      const audio = new Audio();
      // Server adds track without a stream, so event.streams may be empty.
      // Create a MediaStream from the track directly.
      audio.srcObject = event.streams[0] ?? new MediaStream([event.track]);
      audio.play().catch(() => {
        // Autoplay blocked — retry on next user interaction
        const resume = () => {
          audio.play().catch(() => {});
          document.removeEventListener('click', resume);
        };
        document.addEventListener('click', resume);
      });
      remoteAudioRef.current = audio;
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanup();
      }
    };

    // WebRTC barge-in: monitor mic RMS via AnalyserNode
    const rtcAudioCtx = new AudioContext();
    audioCtxRef.current = rtcAudioCtx;
    const micSource = rtcAudioCtx.createMediaStreamSource(stream);
    const analyser = rtcAudioCtx.createAnalyser();
    analyser.fftSize = 512;
    micSource.connect(analyser);
    const pcmBuf = new Float32Array(analyser.fftSize);
    let rtcHotFrames = 0;

    rtcBargeInIntervalRef.current = setInterval(() => {
      if (!bargeInEnabledRef.current || !remoteAudioRef.current || remoteAudioRef.current.paused) {
        rtcHotFrames = 0;
        return;
      }
      analyser.getFloatTimeDomainData(pcmBuf);
      let sumSq = 0;
      for (let i = 0; i < pcmBuf.length; i++) {
        sumSq += pcmBuf[i] * pcmBuf[i];
      }
      const rms = Math.sqrt(sumSq / pcmBuf.length);
      if (rms > 0.06) {
        rtcHotFrames++;
      } else {
        rtcHotFrames = 0;
      }
      if (rtcHotFrames >= 3) {
        suppressTtsRef.current = true;
        remoteAudioRef.current.pause();
        remoteAudioRef.current.currentTime = 0;
        remoteAudioRef.current.play().catch(() => {});
        sendControlMessage({ type: 'barge_in_interrupt' });
        rtcHotFrames = 0;
      }
    }, 32); // ~32ms intervals to match worklet frame rate

    // Create offer and exchange SDP
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering to complete
    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
        }
      };
    });

    const response = await fetch(getRtcOfferUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sdp: pc.localDescription!.sdp }),
    });
    const answer = await response.json();
    await pc.setRemoteDescription(
      new RTCSessionDescription({ type: 'answer', sdp: answer.sdp }),
    );
  }, [handleServerMessage, cleanup, sendControlMessage, streamingConfig]);

  // ── Public connect (dispatches based on transport) ────────────────────

  const connect = useCallback(async () => {
    if (transport === 'webrtc') {
      await connectWebRTC();
    } else {
      await connectWebSocket();
    }
  }, [transport, connectWebSocket, connectWebRTC]);

  // ── Disconnect ───────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    sendControlMessage({ type: 'shutdown' });
    cleanup();
  }, [cleanup, sendControlMessage]);

  // ── Send slide context ───────────────────────────────────────────────────

  const sendSlideContext = useCallback((context: SlideContext) => {
    sendControlMessage({ type: 'slide_context', context });
  }, [sendControlMessage]);

  // ── Set transport (hot-swap if connected) ─────────────────────────────

  const setTransport = useCallback((t: Transport) => {
    if (t === transport) return;
    const wasConnected = isConnected;
    if (wasConnected) {
      sendControlMessage({ type: 'shutdown' });
      cleanup();
    }
    setTransportState(t);
    // Reconnect in the next tick if was connected
    if (wasConnected) {
      setTimeout(async () => {
        if (t === 'webrtc') {
          await connectWebRTC();
        } else {
          await connectWebSocket();
        }
      }, 100);
    }
  }, [transport, isConnected, sendControlMessage, cleanup, connectWebRTC, connectWebSocket]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return (
    <JarvisContext.Provider
      value={{ messages, status, isConnected, streamingConfig, vadConfig, sttModel, sttModels, llmModel, llmModels, transport, bargeInEnabled, connect, disconnect, sendSlideContext, setStreamingConfig, setVadConfig, setSttModel, setLlmModel, setTransport, setBargeInEnabled }}
    >
      {children}
    </JarvisContext.Provider>
  );
}
