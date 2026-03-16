'use client';

import { motion } from 'framer-motion';

interface ResourcesSlideProps {
  heading?: string;
  subheading?: string;
  resources: { label: string; url: string }[];
  footer: string;
}

export function ResourcesSlide({
  heading = 'Questions?',
  subheading = 'Go Deeper',
  resources,
  footer,
}: ResourcesSlideProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8 text-center">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-6xl font-bold mb-12 text-primary neon-glow"
      >
        {heading}
      </motion.h2>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="w-full max-w-xl"
      >
        <div className="h-px w-full bg-primary/20 mb-8" />

        <p className="text-xl font-semibold mb-6">{subheading}</p>

        <div className="space-y-4 text-left">
          {resources.map((resource) => (
            <div key={resource.label} className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">{resource.label}</span>
              <span className="text-primary font-mono text-sm">{resource.url}</span>
            </div>
          ))}
        </div>

        <div className="h-px w-full bg-primary/20 mt-8 mb-8" />

        <p className="text-lg text-muted-foreground">{footer}</p>
      </motion.div>
    </div>
  );
}
