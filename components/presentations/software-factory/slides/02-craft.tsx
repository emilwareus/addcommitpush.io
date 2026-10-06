'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useSlideStep } from '@/components/presentations/shared/presentation-layout';
import { FlowArrow, Label, SlideFrame } from './shared';

const craftRows = [
  { before: 'Write code', now: 'Architect solutions' },
  { before: 'Debug & test', now: 'Build feedback loops' },
  { before: 'Design systems', now: 'Enforcing designed system' },
  { before: 'Manage the process', now: 'Manage the factory' },
] as const;

const rowTextSize = 'text-[clamp(1.35rem,2.8vw,2.6rem)]';

export function CraftSlide() {
  const step = useSlideStep();
  const reduceMotion = useReducedMotion();

  return (
    <SlideFrame
      heading={{ title: 'The craft is not dead', subtitle: 'It has evolved to a higher leverage' }}
    >
      <div className="border-t border-dashed border-[var(--border)]">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-x-[clamp(1rem,3vw,2.5rem)] border-b border-dashed border-[var(--hair)] py-3">
          <Label>Before</Label>
          <span className="w-[clamp(1.25rem,2vw,1.75rem)]" />
          <Label tone="primary">Now</Label>
        </div>

        {craftRows.map((row, index) => {
          const visible = step > index;

          return (
            <div
              key={row.before}
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-[clamp(1rem,3vw,2.5rem)] border-b border-dashed border-[var(--hair)] py-[clamp(0.7rem,2.2vh,1.4rem)]"
            >
              <div className={`font-serif ${rowTextSize} leading-tight text-foreground`}>
                {row.before}
              </div>
              <motion.div
                initial={false}
                animate={{ opacity: visible ? 1 : 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.3 }}
                aria-hidden="true"
              >
                <FlowArrow />
              </motion.div>
              <motion.div
                initial={false}
                animate={{ opacity: visible ? 1 : 0, x: visible || reduceMotion ? 0 : -16 }}
                transition={{ duration: reduceMotion ? 0 : 0.4, ease: 'easeOut' }}
                aria-hidden={!visible}
                className={`font-serif ${rowTextSize} font-bold leading-tight text-primary`}
              >
                {row.now}
              </motion.div>
            </div>
          );
        })}
      </div>
    </SlideFrame>
  );
}
