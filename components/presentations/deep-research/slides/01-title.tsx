'use client';

import { motion } from 'framer-motion';

export function TitleSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-6xl md:text-8xl font-bold mb-6 tracking-tight text-primary neon-glow"
      >
        Learn to build Deep Research Agents
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="text-xl md:text-2xl text-muted-foreground mb-8"
      >
        Malmö AI Devs &middot; Slagthuset
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="text-lg text-muted-foreground/80"
      >
        Emil Wåreus &middot; Feb 5, 2026
      </motion.p>
    </div>
  );
}
