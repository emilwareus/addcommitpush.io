'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/deep-research/layout';

const experts = [
  { role: 'Basic Fact Writer', question: 'What are the key facts?' },
  { role: 'AI Ethics Scholar', question: 'What about responsible use?' },
  { role: 'Community Organizer', question: 'What does the audience want?' },
];

const colors = ['border-primary/40', 'border-secondary/40', 'border-accent/40'];
const bgColors = ['bg-primary/10', 'bg-secondary/10', 'bg-accent/10'];
const textColors = ['text-primary', 'text-secondary', 'text-accent'];

export function StormIntroSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <div className="flex items-baseline gap-4 mb-2">
        <h2 className="text-5xl font-bold text-primary">STORM</h2>
        <span className="text-lg text-muted-foreground font-mono">Stanford 2024</span>
      </div>

      <p className="text-sm text-muted-foreground mb-4 tracking-wide">
        <span className="text-primary font-semibold">S</span>ynthesis of{' '}
        <span className="text-primary font-semibold">T</span>opic{' '}
        <span className="text-primary font-semibold">O</span>utlines through{' '}
        <span className="text-primary font-semibold">R</span>etrieval and{' '}
        <span className="text-primary font-semibold">M</span>ulti-perspective question asking
      </p>

      <p className="text-2xl text-muted-foreground mb-12 text-center max-w-2xl">
        &ldquo;Wikipedia articles are comprehensive because they synthesize
        multiple expert viewpoints&rdquo;
      </p>

      <div className="flex gap-8 mb-12">
        {experts.map((expert, i) => (
          <motion.div
            key={expert.role}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.15 }}
            className="flex flex-col items-center gap-3 w-48"
          >
            <div className={`w-14 h-14 rounded-full ${bgColors[i]} border ${colors[i]} flex items-center justify-center text-xl ${textColors[i]}`}>
              {expert.role[0]}
            </div>
            <span className="text-sm font-semibold text-center">{expert.role}</span>
            <div className={`px-3 py-2 rounded-lg bg-card border ${colors[i]} text-sm text-muted-foreground text-center`}>
              &ldquo;{expert.question}&rdquo;
            </div>
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: step >= 1 ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="text-xl text-center max-w-2xl"
      >
        Different experts ask different questions &rarr; comprehensive coverage
      </motion.p>
    </div>
  );
}
