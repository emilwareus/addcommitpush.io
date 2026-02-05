'use client';

import { motion } from 'framer-motion';

const items = [
  'Repetitive',
  'Inconsistent',
  'Different tones',
  'Varying quality',
  'Not the grade you wanted',
];

export function TheResultSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-5xl font-bold mb-16 text-primary">The result?</h2>

      <div className="space-y-6">
        {items.map((item, i) => (
          <motion.div
            key={item}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.12 }}
            className="text-2xl flex items-center gap-4"
          >
            <span className="text-secondary font-bold text-xl">&times;</span>
            <span>{item}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
