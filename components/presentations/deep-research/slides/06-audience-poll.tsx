'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/deep-research/layout';

const questions = [
  'Who has used ChatGPT/Claude/Gemini/... - deep research agents?',
  'Who has built or experimented with AI agents?',
  'Who trusts AI research reports?',
];

export function AudiencePollSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-5xl font-bold mb-16 text-primary">Quick Poll</h2>

      <div className="space-y-8 w-full max-w-2xl">
        {questions.map((question, i) => (
          <motion.div
            key={question}
            initial={{ opacity: 0, x: -20 }}
            animate={{
              opacity: i === 0 || step >= i ? 1 : 0,
              x: i === 0 || step >= i ? 0 : -20,
            }}
            transition={{ duration: 0.3, delay: i === 0 ? 0.2 : 0 }}
            className="flex items-start gap-4"
          >
            <span className="text-primary font-mono text-lg mt-0.5 neon-glow">{i + 1}.</span>
            <p className="text-xl">{question}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
