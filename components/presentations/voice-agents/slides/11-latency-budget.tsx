'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/voice-agents/layout';

const stages = [
  { label: 'VAD silence detection', time: '~700ms', cumulative: '700ms', color: 'bg-yellow-500/20 text-yellow-400' },
  { label: 'Whisper STT (small, CPU)', time: '~300ms', cumulative: '1000ms', color: 'bg-blue-500/20 text-blue-400' },
  { label: 'Groq TTFT (streaming)', time: '~150ms', cumulative: '1150ms', color: 'bg-purple-500/20 text-purple-400' },
  { label: 'First sentence buffer', time: '~100ms', cumulative: '1250ms', color: 'bg-orange-500/20 text-orange-400' },
  { label: 'Kokoro TTS (first sentence)', time: '~200ms', cumulative: '1450ms', color: 'bg-green-500/20 text-green-400' },
  { label: 'WebSocket round-trip', time: '~1ms', cumulative: '~1.5s', color: 'bg-zinc-500/20 text-zinc-400' },
];

export function LatencyBudgetSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl md:text-5xl font-bold mb-4 text-primary neon-glow text-center"
      >
        The Latency Budget
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-lg text-muted-foreground mb-10 text-center"
      >
        End-to-end: from silence after speech → first audio response
      </motion.p>

      <div className="w-full max-w-3xl space-y-2">
        {stages.map((stage, i) => (
          <motion.div
            key={stage.label}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.08 }}
            className="flex items-center gap-3"
          >
            <span className={`px-2 py-1 rounded text-xs font-mono ${stage.color} w-20 text-center`}>
              {stage.time}
            </span>
            <div className="flex-1 text-sm">{stage.label}</div>
            <span className="text-xs text-muted-foreground font-mono">{stage.cumulative}</span>
          </motion.div>
        ))}
      </div>

      {step >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-8 text-center"
        >
          <div className="text-3xl font-bold text-primary neon-glow font-mono">~1.5s</div>
          <div className="text-muted-foreground mt-1">Total to first audio</div>
        </motion.div>
      )}

      {step >= 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mt-6 bg-zinc-900/80 border border-zinc-800 rounded-lg p-4 max-w-2xl"
        >
          <h3 className="text-sm font-semibold mb-2">Optimizations</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>- Reduce VAD silence threshold (700ms → 500ms)</li>
            <li>- Sentence-chunked TTS: start playing before full response</li>
            <li>- Pre-warm models at connection time</li>
          </ul>
        </motion.div>
      )}
    </div>
  );
}
