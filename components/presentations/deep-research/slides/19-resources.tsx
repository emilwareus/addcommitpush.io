'use client';

import { motion } from 'framer-motion';

const resources = [
  {
    label: 'Blog post (code walkthrough)',
    url: 'addcommitpush.io/blog/diffusion-deep-research',
  },
  {
    label: 'Reference implementation (Diffusion)',
    url: 'github.com/thinkdepthai/Deep_Research',
  },
  {
    label: 'STORM (Stanford)',
    url: 'github.com/stanford-oval/storm',
  },
  {
    label: 'DeepResearch Bench Leaderboard',
    url: 'huggingface.co/spaces/muset-ai/DeepResearch-Bench-Leaderboard',
  },
];

export function ResourcesSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8 text-center">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-6xl font-bold mb-12 text-primary neon-glow"
      >
        Questions?
      </motion.h2>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="w-full max-w-xl"
      >
        <div className="h-px w-full bg-primary/20 mb-8" />

        <p className="text-xl font-semibold mb-6">Go Deeper</p>

        <div className="space-y-4 text-left">
          {resources.map((resource) => (
            <div key={resource.label} className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">{resource.label}</span>
              <span className="text-primary font-mono text-sm">{resource.url}</span>
            </div>
          ))}
        </div>

        <div className="h-px w-full bg-primary/20 mt-8 mb-8" />

        <p className="text-lg text-muted-foreground">
          Emil Wåreus &middot; <span className="text-primary">addcommitpush.io</span>
        </p>
      </motion.div>
    </div>
  );
}
