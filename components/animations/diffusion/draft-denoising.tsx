'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FilePenLine, FileCheck2 } from 'lucide-react';

const stages = [
  {
    label: 'Bullets',
    render: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Compare OpenAI, Anthropic, DeepMind safety pillars</li>
        <li>Pull 3–5 primary sources (2023–2025)</li>
      </ul>
    ),
  },
  {
    label: 'Masked draft',
    render: (
      <p>
        The report covers <span className="bg-muted px-1 rounded">[pillars]</span> across labs,
        highlighting <span className="bg-muted px-1 rounded">[methods]</span> with citations to
        <span className="bg-muted px-1 rounded">[sources]</span>.
      </p>
    ),
  },
  {
    label: 'Refined text',
    render: (
      <p>
        OpenAI: RLHF + eval gates. Anthropic: Constitutional AI + red-team. DeepMind: interpretability
        + strict evals. Cited incidents and mitigations mapped to primary URLs.
      </p>
    ),
  },
];

interface DraftDenoisingProps {
  className?: string;
}

export function DraftDenoising({ className }: DraftDenoisingProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.35 });
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (!isInView || !isPlaying) return;
    const id = setInterval(() => {
      setProgress((p) => (p >= 1 ? 0 : Math.min(1, p + 0.08)));
    }, 500);
    return () => clearInterval(id);
  }, [isInView, isPlaying]);

  useEffect(() => {
    if (!isInView || !isPlaying) return;
    const id = setInterval(() => {
      setStageIndex((p) => (p + 1) % stages.length);
    }, 2200);
    return () => clearInterval(id);
  }, [isInView, isPlaying]);

  const iteration = Math.round(progress * 15);
  const stage = stages[stageIndex];

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-border/60 bg-muted/30 p-6 md:p-8 shadow-lg space-y-4',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-secondary">Draft Denoising</p>
          <h3 className="text-lg font-semibold">Noisy → clean report</h3>
        </div>
        <button
          type="button"
          onClick={() => setIsPlaying((p) => !p)}
          className="text-sm text-secondary hover:text-primary"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div
          className="rounded-xl border border-border/70 bg-background/70 p-4 text-sm leading-relaxed min-h-[220px] max-h-[220px] flex flex-col"
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <p className="font-semibold mb-2 flex items-center gap-2">
            <FilePenLine className="h-4 w-4 text-muted-foreground" />
            Draft (iteration {iteration || 1})
          </p>
          <div className="space-y-2 flex-1 overflow-hidden">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {stage.label}
            </div>
            <motion.div
              key={stageIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              {stage.render}
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          className="rounded-xl border border-primary/60 bg-primary/5 p-4 text-sm leading-relaxed min-h-[220px] max-h-[220px] flex flex-col"
          initial={false}
          animate={{ opacity: 0.4 + progress * 0.6 }}
          transition={{ duration: 0.4 }}
        >
          <p className="font-semibold mb-2 text-primary flex items-center gap-2">
            <FileCheck2 className="h-4 w-4" />
            Refined report
          </p>
          <div className="flex-1 overflow-hidden">
            <p>
              The report converges toward a comprehensive, insight-rich, and readable deliverable with
              clean citations that pass the FACT evaluation.
            </p>
          </div>
        </motion.div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Iteration {iteration || 1} / 15</span>
          <span>{Math.round(progress * 100)}% denoised</span>
        </div>
        <div className="h-2 rounded-full bg-border/60 overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: '0%' }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
}


