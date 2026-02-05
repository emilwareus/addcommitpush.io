'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FilePenLine, FileCheck2 } from 'lucide-react';

const stages = [
  {
    label: 'Noisy draft (LLM knowledge only)',
    render: (
      <p>
        Foo Café is a <span className="bg-muted px-1 rounded">[community space?]</span> in Malmö
        that hosts <span className="bg-muted px-1 rounded">[tech events?]</span>. They may have
        connections to <span className="bg-muted px-1 rounded">[startups?]</span>...
      </p>
    ),
  },
  {
    label: 'After research + refinement',
    render: (
      <p>
        Foo Café is a community-driven tech space in Malmö founded in 2012. They host hack nights,
        tech talks, and pitch evenings. <span className="bg-muted px-1 rounded">[attendance?]</span>{' '}
        [Source: foocafe.org]
      </p>
    ),
  },
  {
    label: 'Evidence-complete draft',
    render: (
      <p>
        Foo Café hosts ~300 events/year with 1,691 Meetup members. Weekly hack nights see ~84%
        RSVP conversion. Topics: AI/ML, FinTech, Web Dev. [Source: meetup.com/foocafe]
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
  const [iteration, setIteration] = useState(1);

  useEffect(() => {
    if (!isInView) return;
    const isAtEnd = iteration >= 8;
    const delay = isAtEnd ? 5000 : 900; // 5s hold on 8/8 before restarting

    const id = setTimeout(() => setIteration((prev) => (prev >= 8 ? 1 : prev + 1)), delay);
    return () => clearTimeout(id);
  }, [isInView, iteration]);

  const progress = Math.min(iteration / 8, 1);
  const stageIndex = Math.min(2, Math.floor((iteration - 1) / 3)); // 1-3, 4-5, 6-8
  const stage = stages[stageIndex];

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-border/60 bg-muted/30 p-6 md:p-8 shadow-lg space-y-4',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-secondary">Draft Denoising</p>
          <h3 className="text-lg font-semibold">Noisy → clean report</h3>
        </div>
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
              Each iteration replaces speculation with verified evidence. The supervisor keeps
              researching until findings are comprehensive — not until the draft looks good.
            </p>
          </div>
        </motion.div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Iteration {iteration || 1} / 8</span>
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
