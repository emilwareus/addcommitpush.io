'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/voice-agents/layout';

const pipelineStages = [
  { icon: '🎤', label: 'Mic', desc: 'Capture audio' },
  { icon: '📊', label: 'VAD', desc: 'Detect speech' },
  { icon: '👂', label: 'STT', desc: 'Transcribe' },
  { icon: '🧠', label: 'LLM', desc: 'Reason & decide' },
  { icon: '🔊', label: 'TTS', desc: 'Synthesize voice' },
  { icon: '🔈', label: 'Speaker', desc: 'Play audio' },
];

export function ArchitectureOverviewSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-6xl mx-auto px-8">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl md:text-5xl font-bold mb-16 text-primary neon-glow text-center"
      >
        The Voice Agent Pipeline
      </motion.h2>

      <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap">
        {pipelineStages.map((stage, i) => {
          const visible = i <= Math.min(step, 3) * 2 || step >= 3;
          return (
            <div key={stage.label} className="flex items-center gap-2 md:gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: visible ? 1 : 0.15,
                  scale: visible ? 1 : 0.8,
                }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-zinc-900 border border-primary/30 flex items-center justify-center text-3xl md:text-4xl">
                  {stage.icon}
                </div>
                <span className="text-sm font-mono text-primary font-bold">{stage.label}</span>
                <span className="text-xs text-muted-foreground">{stage.desc}</span>
              </motion.div>
              {i < pipelineStages.length - 1 && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: visible ? 0.5 : 0.1 }}
                  className="text-2xl text-primary/50 -mt-8"
                >
                  →
                </motion.span>
              )}
            </div>
          );
        })}
      </div>

      {step >= 1 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mt-12 text-lg text-muted-foreground text-center max-w-2xl"
        >
          Each stage adds latency. The art is in making the total feel instant.
        </motion.p>
      )}
    </div>
  );
}
