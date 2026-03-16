'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/voice-agents/layout';

const rows = [
  { aspect: 'Latency (first audio)', homegrown: '~1.5s', api: '~0.5-1s' },
  { aspect: 'Cost', homegrown: 'Free (local compute)', api: '$0.06-0.24/min' },
  { aspect: 'Quality', homegrown: 'Good (Kokoro + Whisper)', api: 'Excellent (native multimodal)' },
  { aspect: 'Privacy', homegrown: 'All local', api: 'Audio sent to cloud' },
  { aspect: 'Setup complexity', homegrown: 'High (models, deps)', api: 'Low (API key + SDK)' },
  { aspect: 'Customization', homegrown: 'Full control', api: 'Limited to API params' },
  { aspect: 'Offline capable', homegrown: 'Yes (except LLM)', api: 'No' },
];

export function HomegrownVsApiSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl md:text-5xl font-bold mb-4 text-primary neon-glow text-center"
      >
        Homegrown vs API
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-lg text-muted-foreground mb-8 text-center"
      >
        Whisper + Kokoro + Groq vs. Gemini Native Audio / OpenAI Realtime
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="w-full max-w-4xl"
      >
        <div className="grid grid-cols-3 gap-1 text-center text-sm font-semibold mb-3">
          <span />
          <span className="text-primary">Homegrown</span>
          <span className="text-muted-foreground">Cloud API</span>
        </div>
        {rows.map((row, i) => (
          <motion.div
            key={row.aspect}
            initial={{ opacity: 0 }}
            animate={{ opacity: step >= 1 || i < 4 ? 1 : 0.3 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="grid grid-cols-3 gap-1 text-sm py-2 border-b border-zinc-800/50"
          >
            <span className="text-muted-foreground">{row.aspect}</span>
            <span className="text-center">{row.homegrown}</span>
            <span className="text-center text-muted-foreground">{row.api}</span>
          </motion.div>
        ))}
      </motion.div>

      {step >= 2 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mt-8 text-base text-muted-foreground text-center max-w-2xl"
        >
          Build homegrown to <span className="text-primary">understand</span> the pipeline.
          Use APIs when you need <span className="text-primary">production quality</span>.
        </motion.p>
      )}
    </div>
  );
}
