'use client';

import { motion } from 'framer-motion';

export function StormDemoSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8 text-center">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-5xl font-bold mb-8 text-primary"
      >
        Live Demo: STORM
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-xl text-muted-foreground mb-8"
      >
        Switch to terminal
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="px-8 py-4 rounded-lg bg-card border border-primary/30 font-mono text-lg text-primary"
        style={{ boxShadow: '0 0 12px oklch(0.7 0.14 195 / 0.15)' }}
      >
        uv run main.py --agent=storm &quot;I am giving a presentation at Foo Caf&eacute; in Malm&ouml; about deep research AI agents. Research the community and what they like, and tell me how to give a good presentation that the audience will like. Tailored to this community&quot;
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-8 text-muted-foreground text-center space-y-1"
      >
        <p>
          Watch: Perspectives &rarr; Parallel interviews (WikiWriter &harr; TopicExpert)
        </p>
        <p>
          &rarr; Two-stage outline &rarr; Per-section writing &rarr; Lead + assembly
        </p>
      </motion.div>
    </div>
  );
}
