'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/deep-research/layout';

const problems = [
  "Can't see each other",
  "Can't update the plan",
  'One shot — hope it works',
];

export function TheRevealSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-4xl md:text-5xl font-bold mb-12 text-center text-primary">
        This is exactly how most AI research agents work.
      </h2>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex items-center gap-4 mb-8"
      >
        {['PLAN', 'PARALLEL SEARCH', 'MERGE'].map((label, i) => (
          <div key={label} className="flex items-center gap-4">
            <div className="px-6 py-3 rounded-lg bg-card border border-primary/30 font-semibold font-mono text-sm">
              {label}
            </div>
            {i < 2 && <span className="text-2xl text-primary">&rarr;</span>}
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: step >= 1 ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-3 mb-12"
      >
        {problems.map((problem) => (
          <span key={problem} className="text-lg text-secondary">
            {problem}
          </span>
        ))}
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: step >= 2 ? 1 : 0, y: step >= 2 ? 0 : 10 }}
        transition={{ duration: 0.4 }}
        className="text-2xl font-semibold text-primary neon-glow"
      >
        Today: How we fixed this.
      </motion.p>
    </div>
  );
}
