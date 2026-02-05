'use client';

import { motion } from 'framer-motion';

const takeaways = [
  { title: 'Start with a draft', description: 'Even rough \u2014 reveals gaps faster than blank page' },
  { title: 'Completion = evidence, not aesthetics', description: 'Stop when queries yield no new facts' },
  { title: 'Information first, generation second', description: "Don't polish hallucinations" },
  { title: 'Isolate sub-agent contexts', description: 'Context Engineering is key! Make sure that only high signal content make it to the main agent loop.' },
  { title: 'Read the reports and verify references', description: 'Your human judgement > LLM as a judge/metrics.' },
];

export function TakeawaysSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-5xl font-bold mb-12 text-primary">What You Can Apply Today</h2>

      <div className="space-y-8 w-full max-w-3xl">
        {takeaways.map((takeaway, i) => (
          <motion.div
            key={takeaway.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
            className="flex items-start gap-5"
          >
            <span className="text-primary font-mono text-3xl mt-0.5 shrink-0 w-8 text-right neon-glow">
              {i + 1}
            </span>
            <div>
              <p className="font-semibold text-2xl text-foreground">{takeaway.title}</p>
              <p className="text-lg text-muted-foreground mt-1">{takeaway.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
