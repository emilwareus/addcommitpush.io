'use client';

import { motion } from 'framer-motion';

interface TitleSlideProps {
  title: string;
  subtitle: string;
  speaker: string;
}

export function TitleSlide({ title, subtitle, speaker }: TitleSlideProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-6xl md:text-8xl font-bold mb-6 tracking-tight text-primary neon-glow"
      >
        {title}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="text-xl md:text-2xl text-muted-foreground mb-8"
      >
        {subtitle}
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="text-lg text-muted-foreground/80"
      >
        {speaker}
      </motion.p>
    </div>
  );
}
