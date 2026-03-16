'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/voice-agents/layout';

const options = [
  { name: 'OpenAI Whisper', type: 'Open-source', note: 'The gold standard. Many model sizes.', highlight: false },
  { name: 'faster-whisper', type: 'Open-source', note: 'CTranslate2 backend. 4x faster, same accuracy.', highlight: true },
  { name: 'Moonshine', type: 'Open-source', note: 'Optimized for real-time on-device.', highlight: false },
  { name: 'Deepgram Nova-3', type: 'Cloud API', note: 'Streaming, low latency, paid.', highlight: false },
  { name: 'Google Cloud STT', type: 'Cloud API', note: 'Streaming, multi-language.', highlight: false },
];

export function SttLandscapeSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl md:text-5xl font-bold mb-4 text-primary neon-glow text-center"
      >
        Speech-to-Text: The Ears
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-lg text-muted-foreground mb-10 text-center"
      >
        Converting audio to text — the first step in any voice pipeline
      </motion.p>

      <div className="grid gap-3 w-full max-w-3xl">
        {options.map((opt, i) => (
          <motion.div
            key={opt.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: step >= 1 || i < 3 ? 1 : 0.3, x: 0 }}
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
          We&apos;ll use faster-whisper — open-source, fast, runs on CPU
        </motion.p>
      )}
    </div>
  );
}
