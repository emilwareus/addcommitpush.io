'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/voice-agents/layout';

const options = [
  { name: 'Kokoro-82M', type: 'Open-source', note: '82M params, fast, Apache 2.0', highlight: true },
  { name: 'Bark', type: 'Open-source', note: 'Expressive, slow generation' },
  { name: 'Piper', type: 'Open-source', note: 'VITS-based, very fast, less natural' },
  { name: 'XTTS v2', type: 'Open-source', note: 'Voice cloning, multilingual' },
  { name: 'ElevenLabs', type: 'Cloud API', note: 'Best quality, streaming, paid' },
  { name: 'Google Cloud TTS', type: 'Cloud API', note: 'WaveNet voices, streaming' },
];

export function TtsLandscapeSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl md:text-5xl font-bold mb-4 text-primary neon-glow text-center"
      >
        Text-to-Speech: The Voice
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-lg text-muted-foreground mb-10 text-center"
      >
        Turning text into natural-sounding speech
      </motion.p>

      <div className="grid gap-3 w-full max-w-3xl">
        {options.map((opt, i) => (
          <motion.div
            key={opt.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: step >= 1 || i < 4 ? 1 : 0.3, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
            className={`flex items-center gap-4 p-4 rounded-lg border ${
              opt.highlight
                ? 'bg-primary/10 border-primary/40'
                : 'bg-zinc-900/60 border-zinc-800'
            }`}
          >
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-muted-foreground whitespace-nowrap">
              {opt.type}
            </span>
            <span className={`font-semibold ${opt.highlight ? 'text-primary' : ''}`}>
              {opt.name}
            </span>
            <span className="text-sm text-muted-foreground ml-auto">{opt.note}</span>
          </motion.div>
        ))}
      </div>

      {step >= 2 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mt-8 text-base text-primary/70 font-mono text-center"
        >
          Kokoro-82M: tiny model, great quality, runs on CPU via ONNX
        </motion.p>
      )}
    </div>
  );
}
