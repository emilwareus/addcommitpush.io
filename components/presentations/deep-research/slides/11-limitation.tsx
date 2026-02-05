'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/deep-research/layout';

const warnings = [
  'Still can\'t see each other',
  'Still one pass',
  'Still no self-correction',
];

const agentColors = ['border-primary/40 text-primary', 'border-secondary/40 text-secondary', 'border-accent/40 text-accent'];

export function LimitationSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-4xl md:text-5xl font-bold mb-16 text-center text-primary">
        But there&apos;s still a problem...
      </h2>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex gap-6 mb-8"
      >
        {['Agent A', 'Agent B', 'Agent C'].map((agent, i) => (
          <motion.div
            key={agent}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 + i * 0.1 }}
            className={`px-6 py-3 rounded-lg bg-card border ${agentColors[i]} font-semibold`}
          >
            {agent}
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: step >= 1 ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="px-8 py-6 rounded-lg border-2 border-secondary/40 bg-secondary/5 mb-12"
      >
        <div className="space-y-2 text-center">
          {warnings.map((warning) => (
            <p key={warning} className="text-lg text-secondary">{warning}</p>
          ))}
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: step >= 2 ? 1 : 0, y: step >= 2 ? 0 : 10 }}
        transition={{ duration: 0.4 }}
        className="text-2xl font-semibold text-primary neon-glow"
      >
        What if the report could evolve?
      </motion.p>
    </div>
  );
}
