'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/deep-research/layout';

const traceLines = [
  { phase: 'THINK', text: '"I need to find when WASM 2.0 was released"', color: 'text-primary' },
  { phase: 'ACT', text: 'search("WebAssembly 2.0 release date")', color: 'text-secondary' },
  { phase: 'OBSERVE', text: '"W3C published the recommendation April 2024"', color: 'text-accent' },
  { phase: 'THINK', text: '"Now I can answer with a verified fact."', color: 'text-primary' },
];

export function ReactSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-4xl md:text-5xl font-bold mb-12 text-primary">
        ReAct: Reasoning + Acting
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-5xl items-start">
        {/* Loop diagram */}
        <div className="flex flex-col items-center justify-center">
          <svg viewBox="0 0 260 230" className="w-80 h-auto" aria-label="Think Act Observe loop diagram">
            {/* Arrows */}
            <defs>
              <marker id="arrowPrimary" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <path d="M0,0 L8,3 L0,6" className="fill-primary" />
              </marker>
              <marker id="arrowSecondary" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <path d="M0,0 L8,3 L0,6" className="fill-secondary" />
              </marker>
              <marker id="arrowAccent" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <path d="M0,0 L8,3 L0,6" className="fill-accent" />
              </marker>
            </defs>

            {/* Think -> Act */}
            <line x1="155" y1="55" x2="220" y2="145" className="stroke-primary" strokeWidth="2" markerEnd="url(#arrowPrimary)" />
            {/* Act -> Observe */}
            <line x1="200" y1="175" x2="60" y2="175" className="stroke-secondary" strokeWidth="2" markerEnd="url(#arrowSecondary)" />
            {/* Observe -> Think */}
            <line x1="45" y1="145" x2="110" y2="55" className="stroke-accent" strokeWidth="2" markerEnd="url(#arrowAccent)" />

            {/* Nodes */}
            <circle cx="130" cy="40" r="32" className="fill-primary/15 stroke-primary" strokeWidth="2" />
            <text x="130" y="45" textAnchor="middle" className="fill-primary text-sm font-bold" fontSize="14">Think</text>

            <circle cx="225" cy="170" r="32" className="fill-secondary/15 stroke-secondary" strokeWidth="2" />
            <text x="225" y="175" textAnchor="middle" className="fill-secondary text-sm font-bold" fontSize="14">Act</text>

            <circle cx="35" cy="170" r="32" className="fill-accent/15 stroke-accent" strokeWidth="2" />
            <text x="35" y="175" textAnchor="middle" className="fill-accent text-sm font-bold" fontSize="13">Observe</text>
          </svg>
        </div>

        {/* Example trace */}
        <div className="rounded-xl bg-card border border-border p-8 font-mono text-base space-y-4">
          {traceLines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.15 }}
              className="flex gap-4"
            >
              <span className={`${line.color} font-bold w-24 shrink-0 text-lg`}>{line.phase}</span>
              <span className="text-muted-foreground">{line.text}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom insight */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: step >= 1 ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="mt-12 px-8 py-4 rounded-lg bg-card border border-primary/30 text-center max-w-3xl"
      >
        <span className="text-lg text-muted-foreground">
          CoT gave LLMs reasoning. ReAct gave them hands. This is when LLMs became{' '}
          <span className="text-primary font-semibold">agents</span>.
        </span>
      </motion.div>
    </div>
  );
}
