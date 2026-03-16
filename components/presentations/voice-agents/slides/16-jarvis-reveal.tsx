'use client';

import { motion } from 'framer-motion';

export function JarvisRevealSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-4xl mx-auto px-8 text-center">
      <motion.h2
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="text-5xl md:text-7xl font-bold mb-8 text-primary neon-glow"
      >
        &ldquo;Jarvis...&rdquo;
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="text-2xl md:text-3xl text-muted-foreground mb-12"
      >
        &ldquo;...what have we talked about so far?&rdquo;
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="bg-zinc-900/60 border border-primary/20 rounded-xl p-6 max-w-lg"
      >
        <p className="text-lg text-muted-foreground">
          Jarvis has been listening the entire time.
        </p>
        <p className="text-sm text-primary/60 mt-2 font-mono">
          Check the sidebar →
        </p>
      </motion.div>
    </div>
  );
}
