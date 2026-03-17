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
  type: 'transcript' | 'thinking' | 'status';
  role?: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface SlideContext {
  current_title: string;
  current_notes: string;
  next_title: string;
  remaining: number;
}

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
  connect: () => Promise<void>;
  disconnect: () => void;
  sendSlideContext: (context: SlideContext) => void;
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
    source.onended = () => this.playNext();
    source.start();
  }

  clear(): void {
    this.queue = [];
    this.isPlaying = false;
    this.onPlayingChange(false);
  }
}

// ─── WebSocket URL ───────────────────────────────────────────────────────────

const WS_URL = 'wss://localhost:8765/ws';
const HEADER_SIZE = 4; // 4-byte uint32 LE flags

// ─── Provider ────────────────────────────────────────────────────────────────

export function JarvisProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<JarvisMessage[]>([]);
  const [status, setStatus] = useState<JarvisStatus>('disconnected');
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);
  const isTtsPlayingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

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

  // ── Cleanup ──────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    workletNodeRef.current?.port.postMessage({ type: 'set_enabled', enabled: false });
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    audioQueueRef.current?.clear();
    audioQueueRef.current = null;

    if (audioCtxRef.current?.state !== 'closed') {
      audioCtxRef.current?.close();
    }
    audioCtxRef.current = null;

    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;

    isTtsPlayingRef.current = false;
    setIsConnected(false);
    setStatus('disconnected');
  }, []);

  // ── Connect ──────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (wsRef.current) return;

    setStatus('connecting');

    // 1. Get mic access (close to user gesture)
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
      },
    });
    streamRef.current = stream;

    // 2. Setup AudioContext
    const audioCtx = new AudioContext({ sampleRate: 48000 });
    audioCtxRef.current = audioCtx;

    // 3. Audio playback queue
    audioQueueRef.current = new AudioQueue(audioCtx, (playing) => {
      isTtsPlayingRef.current = playing;
    });

    // 4. Load AudioWorklet for mic capture
    await audioCtx.audioWorklet.addModule(
      '/presentations/voice-agents/audio-capture-worklet.js',
    );

    const source = audioCtx.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(audioCtx, 'audio-capture-processor');
    workletNodeRef.current = workletNode;

    source.connect(workletNode);
    // Worklet needs a destination connection to process (connect to a silent gain)
    const silentGain = audioCtx.createGain();
    silentGain.gain.value = 0;
    workletNode.connect(silentGain);
    silentGain.connect(audioCtx.destination);

    // 5. Open WebSocket
    const ws = new WebSocket(WS_URL);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      // Wait for 'ready' message from server before enabling mic
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        // JSON control message
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'ready':
            setIsConnected(true);
            setStatus('idle');
            // Enable mic capture
            workletNode.port.postMessage({ type: 'set_enabled', enabled: true });
            break;

          case 'transcript':
            addMessage('transcript', msg.text, msg.role);
            break;

          case 'thinking':
            addMessage('thinking', msg.text);
            break;

          case 'status':
            if (
              msg.status === 'idle' ||
              msg.status === 'thinking' ||
              msg.status === 'speaking'
            ) {
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
        // Binary: TTS audio from server (raw PCM int16, 24kHz)
        audioQueueRef.current?.enqueue(event.data);
      }
    };

    ws.onerror = () => {
      cleanup();
    };

    ws.onclose = () => {
      cleanup();
    };

    // 6. Wire worklet audio → WebSocket
    workletNode.port.onmessage = (e) => {
      if (e.data?.type === 'audio' && wsRef.current?.readyState === WebSocket.OPEN) {
        const samples: Int16Array = e.data.samples;

        // Build frame: 4-byte flags header + PCM data
        const flags = isTtsPlayingRef.current ? 1 : 0;
        const header = new ArrayBuffer(HEADER_SIZE);
        new DataView(header).setUint32(0, flags, true); // little-endian

        const frame = new Uint8Array(HEADER_SIZE + samples.byteLength);
        frame.set(new Uint8Array(header), 0);
        frame.set(new Uint8Array(samples.buffer), HEADER_SIZE);

        wsRef.current.send(frame.buffer);
      }
    };
  }, [addMessage, cleanup]);

  // ── Disconnect ───────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'shutdown' }));
    }
    cleanup();
  }, [cleanup]);

  // ── Send slide context ───────────────────────────────────────────────────

  const sendSlideContext = useCallback((context: SlideContext) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: 'slide_context', context }),
      );
    }
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return (
    <JarvisContext.Provider
      value={{ messages, status, isConnected, connect, disconnect, sendSlideContext }}
    >
      {children}
    </JarvisContext.Provider>
  );
}
