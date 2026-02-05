'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/deep-research/layout';

export function DiffusionInsightSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-4xl md:text-5xl font-bold mb-12 text-center text-primary">
        What if research worked like image generation?
      </h2>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="w-full max-w-3xl mb-6"
      >
        <p className="text-sm text-muted-foreground mb-3 font-mono">IMAGE DIFFUSION</p>
        <div className="flex items-center gap-4 justify-center">
          {['Noise', 'Less Noise', 'Shape', 'Clean Image'].map((label, i) => (
            <div key={label} className="flex items-center gap-4">
              <div className="px-4 py-2 rounded bg-card border border-border/60 text-sm text-center w-28">
                {label}
              </div>
              {i < 3 && <span className="text-muted-foreground">&rarr;</span>}
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="text-primary/40 text-sm mb-6"
      >
        &darr; same idea &darr;
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="w-full max-w-3xl mb-12"
      >
        <p className="text-sm text-primary mb-3 font-mono">RESEARCH DIFFUSION</p>
        <div className="flex items-center gap-4 justify-center">
          {['Rough Draft', '+Gap Fill', 'Refine', 'Final Report'].map((label, i) => (
            <div key={label} className="flex items-center gap-4">
              <div className="px-4 py-2 rounded bg-card border border-primary/30 text-sm text-center w-28">
                {label}
              </div>
              {i < 3 && <span className="text-primary">&rarr;</span>}
            </div>
          ))}
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: step >= 1 ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="text-xl font-semibold text-center text-primary neon-glow"
      >
        The initial draft IS the noise we refine away.
      </motion.p>
    </div>
  );
}
