'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/deep-research/layout';

const people = [
  { name: 'Sigrid', section: 'Intro' },
  { name: 'Torbjörn', section: 'History' },
  { name: 'Hjördis', section: 'Theory' },
  { name: 'Gunnar', section: 'Conclusion' },
];

export function GroupProjectSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-5xl font-bold mb-16 text-primary">Remember group projects?</h2>

      <div className="flex flex-col items-center gap-8">
        <div className="flex gap-8">
          {people.map((person, i) => (
            <motion.div
              key={person.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/40 flex items-center justify-center text-2xl text-primary">
                {person.name[0]}
              </div>
              <span className="text-sm text-muted-foreground">{person.name}</span>
              <div className="px-4 py-2 rounded bg-card border border-border/60 text-sm">
                {person.section}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2 mt-4">
          <div className="flex gap-4">
            {people.map((person) => (
              <div key={person.name} className="w-0.5 h-8 bg-primary/20" />
            ))}
          </div>
          <div className="px-6 py-3 rounded-lg bg-card border-2 border-secondary/40 text-lg font-semibold text-secondary">
            &ldquo;The Report&rdquo; &mdash; 3hrs before deadline
          </div>
        </div>
      </div>
    </div>
  );
}
