'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FileText, FilePenLine, Repeat2, FileCheck2, type LucideIcon } from 'lucide-react';

interface DiffusionOverviewProps {
  className?: string;
}

const diffusionLoopStages = [
  'Identify Gaps → ask research questions',
  'Conduct Research in parallel + citations',
  'Refine Draft Report → assess completeness',
];

// Per-phase dwell times (ms): brief, initial draft, diffusion loop (slower), final report (faster)
const phaseDurations = [3200, 3200, 8000, 2400];
const loopStageDuration = 2500; // slower so all three loop stages are visible

const phases: { label: string; icon: LucideIcon; text: string; isLoop?: boolean }[] = [
  {
    label: 'Brief Generation',
    icon: FileText,
    text: 'Expands the user query into a structured research brief with sources, constraints, and scope.',
  },
  {
    label: 'Initial Draft',
    icon: FilePenLine,
    text: 'Creates a noisy draft from model knowledge only—no external facts yet, just structure and placeholders.',
  },
  {
    label: 'Diffusion Loop',
    icon: Repeat2,
    text: diffusionLoopStages[0],
    isLoop: true,
  },
  {
    label: 'Final Report',
    icon: FileCheck2,
    text: 'Apply Insightfulness + Helpfulness rules, clean citations, and finalize into a benchmark-ready report.',
  },
];

export function DiffusionOverview({ className }: DiffusionOverviewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: '-20% 0px -20% 0px', amount: 0.3 });
  const [index, setIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [loopStep, setLoopStep] = useState(0);

  // Phase advance with custom dwell times per phase
  useEffect(() => {
    if (!isInView) return;
    const duration = phaseDurations[index] ?? 3200;
    const id = setTimeout(() => {
      setIndex((prev) => (prev + 1) % phases.length);
      setCharIndex(0);
      setLoopStep(0);
    }, duration);
    return () => clearTimeout(id);
  }, [isInView, index]);

  const isLoopPhase = phases[index]?.isLoop;

  // Loop sub-steps advance slower than phase change so all three are visible
  useEffect(() => {
    if (!isLoopPhase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoopStep(0);
    }
  }, [isLoopPhase]);

  useEffect(() => {
    if (!isInView || !isLoopPhase) return;
    const id = setInterval(() => {
      setLoopStep((prev) => {
        const next = (prev + 1) % diffusionLoopStages.length;
        setCharIndex(0);
        return next;
      });
    }, loopStageDuration);
    return () => clearInterval(id);
  }, [isInView, isLoopPhase]);

  useEffect(() => {
    const active = phases[index];
    const activeText = active.isLoop ? diffusionLoopStages[loopStep] : active.text;
    const id = setInterval(() => {
      setCharIndex((p) => (p >= activeText.length ? activeText.length : p + 3));
    }, 35);
    return () => clearInterval(id);
  }, [index, loopStep]);

  return (
    <div
      ref={ref}
      className={cn(
        'w-full rounded-2xl border border-border/60 bg-muted/30 p-6 md:p-8 shadow-lg',
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-secondary">Diffusion Overview</p>
          <h3 className="text-lg font-semibold">4-phase pipeline</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {phases.map(({ label, icon: Icon, text, isLoop }, i) => {
          const active = i === index;
          const content = isLoop ? diffusionLoopStages[loopStep] : text;
          const streamed =
            active && charIndex > 0
              ? content.slice(0, charIndex)
              : content.slice(0, 100) + (content.length > 100 ? '…' : '');
          return (
            <motion.div
              key={label}
              initial={{ opacity: 0.4, scale: 0.98 }}
              animate={{ opacity: active ? 1 : 0.5, scale: active ? 1.02 : 0.98 }}
              transition={{ duration: 0.4 }}
              className={cn(
                'rounded-xl border border-border/70 bg-background/70 p-4 text-sm h-full flex flex-col gap-2 min-h-[220px] max-h-[220px]',
                active && 'border-primary/80 shadow-primary/30 shadow-lg'
              )}
            >
              <div className="flex items-center gap-2 font-semibold">
                <Icon
                  className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')}
                />
                <span>{label}</span>
              </div>
              <div
                className={cn(
                  'text-left text-muted-foreground leading-snug transition-colors min-h-[64px]',
                  active && 'text-foreground'
                )}
              >
                {streamed}
                {active && charIndex < text.length && <span className="animate-pulse">▌</span>}
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        className="mt-6 h-2 rounded-full bg-border/60 overflow-hidden"
        initial={{ width: '0%' }}
        animate={{ width: `${((index + 1) / phases.length) * 100}%` }}
        transition={{ duration: 0.6 }}
      >
        <span className="sr-only">progress</span>
      </motion.div>
    </div>
  );
}
