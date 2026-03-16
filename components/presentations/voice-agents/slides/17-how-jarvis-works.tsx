'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/voice-agents/layout';

const stack = [
  { layer: 'Browser', tech: 'AudioWorklet → WebSocket (WSS)', color: 'border-blue-500/40 bg-blue-500/10' },
  { layer: 'VAD', tech: 'Silero VAD (1.8MB, 30ms chunks)', color: 'border-yellow-500/40 bg-yellow-500/10' },
  { layer: 'STT', tech: 'faster-whisper (small, CPU int8)', color: 'border-green-500/40 bg-green-500/10' },
  { layer: 'LLM', tech: 'Groq API + tool calling', color: 'border-purple-500/40 bg-purple-500/10' },
  { layer: 'TTS', tech: 'Kokoro-82M (ONNX, CPU)', color: 'border-orange-500/40 bg-orange-500/10' },
  { layer: 'Output', tech: 'PCM → WebSocket → Web Audio API', color: 'border-blue-500/40 bg-blue-500/10' },
];

export function HowJarvisWorksSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl md:text-5xl font-bold mb-4 text-primary neon-glow text-center"
      >
        How Jarvis Was Built
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-lg text-muted-foreground mb-10 text-center"
      >
        Everything we just talked about — running right here
      </motion.p>

      <div className="w-full max-w-2xl space-y-3">
        {stack.map((item, i) => (
          <motion.div
            key={item.layer}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.08 }}
            className={`flex items-center gap-4 p-4 rounded-lg border ${item.color}`}
          >
            <span className="text-sm font-bold font-mono w-16 text-right">{item.layer}</span>
            <span className="text-sm text-muted-foreground">{item.tech}</span>
          </motion.div>
        ))}
      </div>

      {step >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-8 bg-zinc-900/80 border border-zinc-800 rounded-lg p-4 max-w-2xl"
        >
          <h3 className="text-sm font-semibold mb-2">Agent Behavior</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>Always listening → shows thinking in sidebar</li>
            <li>&ldquo;Hey Jarvis&rdquo; → responds with voice via <code className="text-primary">respond</code> tool</li>
            <li>Slide context sent on navigation → agent knows where we are</li>
          </ul>
        </motion.div>
      )}

      {step >= 2 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mt-4 text-sm text-muted-foreground text-center"
        >
          ~500 lines of Python + ~300 lines of TypeScript. All open source.
        </motion.p>
      )}
    </div>
  );
}
