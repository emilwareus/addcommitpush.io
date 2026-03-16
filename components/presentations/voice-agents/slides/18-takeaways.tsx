'use client';

import { motion } from 'framer-motion';

const takeaways = [
  'Voice agents are a pipeline: VAD → STT → LLM → TTS',
  'Open-source models (Whisper, Kokoro, Silero) make it accessible',
  'Latency is the #1 UX challenge — optimize every stage',
  'WebSocket + binary audio is simple and effective',
  'Build homegrown to learn, use APIs for production',
];

export function TakeawaysSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-4xl mx-auto px-8">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl md:text-5xl font-bold mb-12 text-primary neon-glow text-center"
      >
        What You Can Build Today
      </motion.h2>

      <div className="space-y-4 w-full max-w-2xl">
        {takeaways.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 + i * 0.1 }}
            className="flex items-start gap-4 p-4 bg-zinc-900/60 border border-zinc-800 rounded-lg"
          >
            <span className="text-primary font-bold font-mono text-lg">{i + 1}</span>
            <span className="text-lg">{item}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
