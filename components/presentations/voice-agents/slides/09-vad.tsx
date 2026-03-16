'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/voice-agents/layout';

export function VadSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl md:text-5xl font-bold mb-4 text-primary neon-glow text-center"
      >
        Voice Activity Detection
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-lg text-muted-foreground mb-10 text-center max-w-3xl"
      >
        Knowing <em>when</em> someone is speaking is just as important as understanding <em>what</em> they say
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mb-8"
      >
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-5">
          <h3 className="text-lg font-semibold mb-2">Energy-Based</h3>
          <p className="text-sm text-muted-foreground">Simple RMS threshold. Fast but noisy in real environments.</p>
        </div>
        <div className="bg-primary/10 border border-primary/40 rounded-lg p-5">
          <h3 className="text-lg font-semibold text-primary mb-2">Silero VAD</h3>
          <p className="text-sm text-muted-foreground">ML-based, 1.8MB model. 30ms chunks. Our pick.</p>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-5">
          <h3 className="text-lg font-semibold mb-2">webrtcvad</h3>
          <p className="text-sm text-muted-foreground">C library from Google. Good but less accurate than ML.</p>
        </div>
      </motion.div>

      {step >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-5 max-w-3xl w-full"
        >
          <h3 className="text-lg font-semibold mb-3">The Turn-Taking Problem</h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="px-2 py-1 bg-green-500/20 rounded text-green-400 font-mono">SPEECH</span>
            <span>→</span>
            <span className="px-2 py-1 bg-zinc-800 rounded font-mono">silence (700ms)</span>
            <span>→</span>
            <span className="px-2 py-1 bg-primary/20 rounded text-primary font-mono">UTTERANCE END</span>
            <span>→</span>
            <span className="px-2 py-1 bg-blue-500/20 rounded text-blue-400 font-mono">Transcribe</span>
          </div>
        </motion.div>
      )}

      {step >= 2 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mt-6 text-base text-muted-foreground text-center max-w-2xl"
        >
          Silence threshold is a key UX knob: too short → cuts people off, too long → feels sluggish
        </motion.p>
      )}
    </div>
  );
}
