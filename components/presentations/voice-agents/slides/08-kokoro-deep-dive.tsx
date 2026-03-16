'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/voice-agents/layout';

const stats = [
  { label: 'Parameters', value: '82M' },
  { label: 'License', value: 'Apache 2.0' },
  { label: 'Output', value: '24kHz' },
  { label: 'Runtime', value: 'ONNX (CPU)' },
  { label: 'Voices', value: '54+ built-in' },
  { label: 'Latency', value: '~200ms/sentence' },
];

export function KokoroDeepDiveSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl md:text-5xl font-bold mb-4 text-primary neon-glow text-center"
      >
        Kokoro-82M: Fast &amp; Open TTS
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-lg text-muted-foreground mb-10 text-center max-w-3xl"
      >
        A tiny model that sounds surprisingly good
      </motion.p>

      <div className="grid grid-cols-3 gap-4 max-w-3xl w-full mb-10">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
            className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4 text-center"
          >
            <div className="text-2xl font-bold text-primary font-mono">{stat.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {step >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4 max-w-2xl font-mono text-sm"
        >
          <span className="text-muted-foreground"># kokoro-onnx: 3 lines to speech</span>
          <br />
          <span className="text-primary">kokoro = Kokoro(</span>
          <span className="text-green-400">&quot;kokoro-v1.0.onnx&quot;</span>
          <span className="text-primary">, </span>
          <span className="text-green-400">&quot;voices-v1.0.bin&quot;</span>
          <span className="text-primary">)</span>
          <br />
          <span className="text-primary">samples, sr = kokoro.create(</span>
          <span className="text-green-400">&quot;Hello world&quot;</span>
          <span className="text-primary">, voice=</span>
          <span className="text-green-400">&quot;am_adam&quot;</span>
          <span className="text-primary">)</span>
        </motion.div>
      )}

      {step >= 2 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mt-6 text-base text-muted-foreground text-center max-w-2xl"
        >
          Key feature: <span className="text-primary font-semibold">streaming synthesis</span> —
          start playing audio before the full sentence is generated
        </motion.p>
      )}
    </div>
  );
}
