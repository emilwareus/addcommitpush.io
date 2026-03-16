'use client';

import { motion } from 'framer-motion';

export function PodidexDemoSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-4xl mx-auto px-8 text-center">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl md:text-6xl font-bold mb-8 text-primary neon-glow"
      >
        Live Demo
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-2xl text-muted-foreground mb-12"
      >
        Podidex Voice Chat
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="bg-zinc-900/80 border border-primary/20 rounded-xl p-8"
      >
        <p className="text-lg text-muted-foreground font-mono">
          → Switch to Podidex app
        </p>
      </motion.div>
    </div>
  );
}
