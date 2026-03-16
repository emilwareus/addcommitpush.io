'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/voice-agents/layout';

export function TheDreamSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8 text-center">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-5xl md:text-7xl font-bold mb-8 text-primary neon-glow"
      >
        &ldquo;Hey Jarvis...&rdquo;
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl"
      >
        What if you could talk to an AI — naturally, in real time — and it could
        hear, think, and respond with its own voice?
      </motion.p>

      {step >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-zinc-900/80 border border-primary/20 rounded-lg p-6 max-w-2xl"
        >
          <p className="text-lg text-muted-foreground mb-4">
            Today we&apos;ll build one from scratch:
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Whisper STT', 'Kokoro TTS', 'Silero VAD', 'Groq LLM', 'WebSocket'].map((tech) => (
              <span
                key={tech}
                className="px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-full text-sm text-primary font-mono"
              >
                {tech}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
