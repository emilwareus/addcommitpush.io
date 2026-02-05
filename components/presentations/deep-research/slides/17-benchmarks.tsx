'use client';

import { motion } from 'framer-motion';

const reasons = [
  { factor: 'Iterative refinement', impact: 'Catches gaps single-pass misses' },
  { factor: 'Evidence-based completion', impact: 'No premature stopping' },
  { factor: 'Self-balancing', impact: 'Simple=2 iters, Complex=15' },
  { factor: 'Isolated sub-agents', impact: 'Independent perspectives' },
];

export function BenchmarksSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-5xl font-bold mb-12 text-primary">The Results</h2>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="px-12 py-8 rounded-xl border-2 border-primary/40 bg-primary/5 mb-12 text-center"
        style={{ boxShadow: '0 0 20px oklch(0.7 0.14 195 / 0.2), inset 0 0 20px oklch(0.7 0.14 195 / 0.05)' }}
      >
        <p className="text-lg text-muted-foreground mb-2">Google Diffusion vs OpenAI Deep Research</p>
        <p className="text-6xl font-bold text-primary neon-glow">74.5%</p>
        <p className="text-xl text-muted-foreground mt-2">WIN RATE</p>
      </motion.div>

      <div className="w-full max-w-2xl space-y-4">
        {reasons.map((reason, i) => (
          <motion.div
            key={reason.factor}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.3 + i * 0.1 }}
            className="flex items-center gap-4 px-4 py-3 rounded-lg bg-card border border-border/60"
          >
            <span className="font-semibold shrink-0 w-52 text-primary">{reason.factor}</span>
            <div className="h-px flex-1 bg-border/40" />
            <span className="text-muted-foreground text-sm">{reason.impact}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.8 }}
        className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
      >
        <span>Sources:</span>
        <a
          href="https://arxiv.org/html/2507.16075v1"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-primary transition-colors"
        >
          Google &ldquo;Deep Researcher with Test-Time Diffusion&rdquo; (arXiv:2507.16075)
        </a>
        <a
          href="https://research.google/blog/deep-researcher-with-test-time-diffusion/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-primary transition-colors"
        >
          Google Research Blog
        </a>
      </motion.div>
    </div>
  );
}
