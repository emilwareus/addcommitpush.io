'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/deep-research/layout';

const entries = [
  { date: 'Jan 2022', label: 'Chain-of-Thought', star: true, url: 'https://arxiv.org/abs/2201.11903' },
  { date: 'Oct 2022', label: 'ReAct', star: true, url: 'https://arxiv.org/abs/2210.03629' },
  { date: 'Jul 2023', label: 'GPT Researcher', star: false, url: 'https://github.com/assafelovic/gpt-researcher' },
  { date: 'Feb 2024', label: 'STORM', star: true, url: 'https://github.com/stanford-oval/storm' },
  { date: 'Feb 2025', label: 'OpenAI Deep Research', star: false, url: 'https://openai.com/index/introducing-deep-research/' },
  { date: 'Mar 2025', label: 'Perplexity Deep Research', star: false, url: 'https://www.perplexity.ai/hub/blog/introducing-perplexity-deep-research' },
  { date: 'Jul 2025', label: 'Diffusion Deep Research', star: true, url: 'https://arxiv.org/abs/2502.12018' },
];

export function TimelineSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-4xl md:text-5xl font-bold mb-16 text-primary">The Evolution of Research Agents</h2>

      <div className="relative w-full max-w-4xl">
        {/* Timeline line — vertically centered on the dots (dot is h-4 = 16px, center at 8px) */}
        <div className="absolute top-[7px] left-0 right-0 h-0.5 bg-primary/20" />

        <div className="flex justify-between relative">
          {entries.map((entry, i) => (
            <motion.div
              key={`${entry.date}-${entry.label}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex flex-col items-center text-center w-36"
            >
              <div
                className={`w-4 h-4 rounded-full border-2 mb-4 ${
                  entry.star
                    ? 'bg-primary border-primary'
                    : 'bg-background border-muted-foreground/40'
                }`}
                style={entry.star ? { boxShadow: '0 0 8px var(--primary)' } : undefined}
              />
              <span className="text-sm font-mono text-muted-foreground mb-1">
                {entry.date}
              </span>
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-sm font-semibold underline decoration-primary/30 hover:decoration-primary transition-colors ${entry.star ? 'text-primary' : 'hover:text-primary'}`}
              >
                {entry.label}
              </a>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: step >= 1 ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="mt-16 px-8 py-4 rounded-lg bg-card border border-primary/30 text-center"
      >
        <span className="text-lg text-muted-foreground">
          Single calls &rarr; Agents &rarr; Multi-agent &rarr;{' '}
          <span className="text-primary font-semibold">Iterative</span>
        </span>
      </motion.div>
    </div>
  );
}
