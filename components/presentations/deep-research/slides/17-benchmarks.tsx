'use client';

import { motion } from 'framer-motion';

const leaderboard = [
  { rank: 4, name: 'ThinkDepth', model: 'Diffusion-based', score: 52.43, license: 'MIT', highlight: true },
  { rank: 8, name: 'Gemini 2.5 Pro', model: 'Diffusion-based', score: 49.71, license: 'Proprietary', highlight: false },
  { rank: 10, name: 'OpenAI', model: 'Deep Research', score: 46.45, license: 'Proprietary', highlight: false },
  { rank: 11, name: 'Claude', model: 'Deep Research', score: 45.00, license: 'Proprietary', highlight: false },
];

export function BenchmarksSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-5xl font-bold mb-8 text-primary">The Results</h2>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="px-10 py-5 rounded-xl border-2 border-primary/40 bg-primary/5 mb-8 text-center"
        style={{ boxShadow: '0 0 20px oklch(0.7 0.14 195 / 0.2), inset 0 0 20px oklch(0.7 0.14 195 / 0.05)' }}
      >
        <p className="text-base text-muted-foreground mb-1">Google Diffusion vs OpenAI Deep Research (DeepConsult)</p>
        <p className="text-5xl font-bold text-primary neon-glow">74.5%</p>
        <p className="text-lg text-muted-foreground mt-1">WIN RATE</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="w-full max-w-3xl"
      >
        <p className="text-lg font-semibold text-muted-foreground mb-3 text-center">
          <a
            href="https://huggingface.co/spaces/muset-ai/DeepResearch-Bench-Leaderboard"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-primary transition-colors"
          >
            DeepResearch Bench Leaderboard
          </a>
          {' '}
          <span className="text-sm font-normal">(RACE Score)</span>
        </p>
        <p className="text-sm text-muted-foreground/70 mb-3 text-center max-w-2xl mx-auto">
          100 PhD-level research tasks across 22 fields, scored by 70+ expert annotators.
          RACE evaluates Comprehensiveness, Insight, Instruction Following, Readability.
        </p>

        <div className="rounded-lg border border-border/60 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-card/80 border-b border-border/40">
                <th className="px-4 py-2.5 text-sm font-semibold text-muted-foreground w-16">#</th>
                <th className="px-4 py-2.5 text-sm font-semibold text-muted-foreground">System</th>
                <th className="px-4 py-2.5 text-sm font-semibold text-muted-foreground text-right">RACE</th>
                <th className="px-4 py-2.5 text-sm font-semibold text-muted-foreground text-right">License</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, i) => (
                <motion.tr
                  key={entry.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + i * 0.08 }}
                  className={`border-b border-border/20 ${
                    entry.highlight
                      ? 'bg-primary/10 border-l-2 border-l-primary'
                      : 'bg-card/40'
                  }`}
                >
                  <td className="px-4 py-3 text-lg font-mono text-muted-foreground">{entry.rank}</td>
                  <td className="px-4 py-3">
                    <span className={`text-lg font-semibold ${entry.highlight ? 'text-primary' : 'text-foreground'}`}>
                      {entry.name}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">{entry.model}</span>
                  </td>
                  <td className={`px-4 py-3 text-xl font-bold text-right ${
                    entry.highlight ? 'text-primary' : 'text-foreground'
                  }`}>
                    {entry.score.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground text-right">{entry.license}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.8 }}
        className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
      >
        <span>Sources:</span>
        <a
          href="https://arxiv.org/html/2507.16075v1"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-primary transition-colors"
        >
          arXiv:2507.16075
        </a>
        <a
          href="https://research.google/blog/deep-researcher-with-test-time-diffusion/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-primary transition-colors"
        >
          Google Research Blog
        </a>
        <a
          href="https://huggingface.co/spaces/muset-ai/DeepResearch-Bench-Leaderboard"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-primary transition-colors"
        >
          DeepResearch Bench
        </a>
      </motion.div>
    </div>
  );
}
