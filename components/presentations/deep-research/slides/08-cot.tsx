'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/deep-research/layout';

export function CotSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-4xl md:text-5xl font-bold mb-12 text-primary">
        Chain-of-Thought: Show Your Work
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-5xl">
        {/* Standard Prompt */}
        <div className="rounded-xl bg-card border border-border p-8">
          <h3 className="text-2xl font-semibold text-muted-foreground mb-5">Standard Prompt</h3>
          <div className="space-y-4 text-lg">
            <p className="text-muted-foreground italic">
              &ldquo;Roger has 5 tennis balls. He buys 2 cans of 3. How many does he have now?&rdquo;
            </p>
            <div className="mt-5 pt-4 border-t border-border">
              <span className="font-mono text-muted-foreground text-xl">Answer: </span>
              <span className="font-mono font-bold text-xl">11</span>
            </div>
          </div>
        </div>

        {/* CoT Prompt */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: step >= 1 ? 1 : 0, x: step >= 1 ? 0 : 20 }}
          transition={{ duration: 0.5 }}
          className="rounded-xl bg-card border border-primary/30 p-8"
        >
          <h3 className="text-2xl font-semibold text-primary mb-5">With Chain-of-Thought</h3>
          <div className="space-y-4 text-lg">
            <p className="text-muted-foreground italic">
              &ldquo;Roger has 5 tennis balls. He buys 2 cans of 3. How many does he have now?
              <span className="text-primary font-semibold"> Let&apos;s think step by step.&rdquo;</span>
            </p>
            <div className="mt-5 pt-4 border-t border-primary/20 space-y-3">
              <p className="text-primary font-mono text-base">1. Roger starts with 5 balls</p>
              <p className="text-primary font-mono text-base">2. 2 cans &times; 3 balls = 6 new balls</p>
              <p className="text-primary font-mono text-base">3. 5 + 6 = 11</p>
              <p className="font-mono font-bold text-xl mt-3">Answer: 11</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom insight */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: step >= 2 ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="mt-12 px-8 py-4 rounded-lg bg-card border border-primary/30 text-center max-w-3xl"
      >
        <span className="text-lg text-muted-foreground">
          This simple trick is the foundation of every research agent that followed.
        </span>
      </motion.div>
    </div>
  );
}
