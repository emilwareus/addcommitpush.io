'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/voice-agents/layout';

export function PodidexArchitectureSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl md:text-5xl font-bold mb-4 text-primary neon-glow text-center"
      >
        Podidex: Talk to Your Podcast
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-lg text-muted-foreground mb-10 text-center max-w-3xl"
      >
        A production voice agent — ask questions about any podcast episode, get spoken answers
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="w-full max-w-4xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-primary mb-3">Backend Pipeline</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>RunPod GPU server (A40)</li>
              <li>faster-whisper (base.en) for STT</li>
              <li>Kokoro PyTorch for TTS</li>
              <li>Groq API for LLM reasoning</li>
              <li>WebSocket binary audio protocol</li>
            </ul>
          </div>
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-primary mb-3">Frontend</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Next.js + React</li>
              <li>AudioWorklet for mic capture</li>
              <li>RMS energy VAD (client-side)</li>
              <li>PCM playback via AudioWorklet</li>
              <li>Sentence-chunked streaming</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {step >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-6 bg-zinc-900/80 border border-primary/20 rounded-lg p-4 max-w-3xl w-full"
        >
          <h3 className="text-sm font-semibold mb-2">Key Patterns We&apos;ll Reuse</h3>
          <div className="flex flex-wrap gap-2">
            {['Binary audio frames', 'Echo suppression', 'Sentence-chunked TTS', 'Speculative execution', 'Model singleton'].map((p) => (
              <span key={p} className="px-2 py-1 bg-primary/10 border border-primary/20 rounded text-xs text-primary font-mono">{p}</span>
            ))}
          </div>
        </motion.div>
      )}

      {step >= 2 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mt-4 text-base text-muted-foreground text-center"
        >
          Jarvis adapts these patterns for a simpler use case: local macOS, CPU-only, presentation context
        </motion.p>
      )}
    </div>
  );
}
