'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJarvis, type JarvisMessage } from './jarvis-context';

function statusColor(status: string): string {
  switch (status) {
    case 'idle':
      return 'bg-green-500';
    case 'listening':
      return 'bg-yellow-400 animate-pulse';
    case 'thinking':
      return 'bg-blue-400 animate-pulse';
    case 'speaking':
      return 'bg-primary animate-pulse';
    case 'connecting':
      return 'bg-orange-400 animate-pulse';
    default:
      return 'bg-muted-foreground/50';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'idle':
      return 'Listening';
    case 'listening':
      return 'Hearing speech...';
    case 'thinking':
      return 'Processing...';
    case 'speaking':
      return 'Speaking';
    case 'connecting':
      return 'Connecting...';
    default:
      return 'Offline';
  }
}

function messageStyle(msg: JarvisMessage): string {
  const base = 'rounded-lg px-3 py-2';
  if (msg.type === 'thinking') {
    return `${base} bg-blue-500/10 border border-blue-500/20 text-blue-300/80`;
  }
  if (msg.type === 'partial') {
    return `${base} bg-muted/20 text-muted-foreground/50 italic`;
  }
  if (msg.role === 'assistant') {
    return `${base} bg-primary/10 border border-primary/20 text-primary`;
  }
  // User transcript
  return `${base} bg-muted/30 text-muted-foreground`;
}

function StreamingToggle({
  label,
  enabled,
  disabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className="flex items-center justify-between w-full py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="text-xs font-mono text-muted-foreground">{label}</span>
      <div
        className={`w-8 h-4 rounded-full transition-colors relative ${
          enabled ? 'bg-primary/60' : 'bg-muted-foreground/30'
        }`}
      >
        <div
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  );
}

export function JarvisSidebar() {
  const { messages, status, isConnected, streamingConfig, connect, disconnect, setStreamingConfig } = useJarvis();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="w-80 shrink-0 bg-background/95 backdrop-blur border-l border-primary/20 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-primary/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusColor(status)}`} />
          <h3 className="text-primary font-mono text-sm font-bold tracking-wider">
            JARVIS
          </h3>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {statusLabel(status)}
        </span>
      </div>

      {/* Streaming Knobs */}
      <div className="px-4 py-2 border-b border-primary/20 space-y-1">
        <span className="text-xs font-mono text-muted-foreground/60 uppercase tracking-wider">
          Streaming
        </span>
        <StreamingToggle
          label="STT"
          enabled={streamingConfig.stt}
          disabled={!isConnected}
          onChange={(v) => setStreamingConfig({ ...streamingConfig, stt: v })}
        />
        <StreamingToggle
          label="LLM"
          enabled={streamingConfig.llm}
          disabled={!isConnected}
          onChange={(v) => setStreamingConfig({ ...streamingConfig, llm: v })}
        />
        <StreamingToggle
          label="TTS"
          enabled={streamingConfig.tts}
          disabled={!isConnected}
          onChange={(v) => setStreamingConfig({ ...streamingConfig, tts: v })}
        />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && isConnected && (
          <p className="text-xs text-muted-foreground/50 text-center mt-8 font-mono">
            Jarvis is listening...
          </p>
        )}
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={messageStyle(msg)}
            >
              {msg.type === 'thinking' && (
                <span className="text-xs text-blue-400/60 block mb-0.5 font-mono">
                  thinking
                </span>
              )}
              {msg.type === 'partial' && (
                <span className="text-xs text-muted-foreground/40 block mb-0.5 font-mono">
                  hearing...
                </span>
              )}
              {msg.type !== 'partial' && msg.role === 'user' && (
                <span className="text-xs text-muted-foreground/60 block mb-0.5 font-mono">
                  heard
                </span>
              )}
              {msg.role === 'assistant' && (
                <span className="text-xs text-primary/60 block mb-0.5 font-mono">
                  jarvis
                </span>
              )}
              <span className="text-sm leading-relaxed">{msg.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer: Connect/Disconnect */}
      <div className="p-4 border-t border-primary/20">
        {!isConnected ? (
          <button
            onClick={connect}
            className="w-full py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded text-sm font-mono transition-colors cursor-pointer"
          >
            Activate Jarvis
          </button>
        ) : (
          <button
            onClick={disconnect}
            className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-sm font-mono transition-colors cursor-pointer"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}
