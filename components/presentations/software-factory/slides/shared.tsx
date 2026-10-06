import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

export type LeverageRegionId = 'most' | 'more' | 'a-lot';

interface LeverageRegion {
  weight: string;
  part: string;
  topic: string;
  levers: readonly string[];
}

export const leverageRegionOrder: readonly LeverageRegionId[] = ['a-lot', 'more', 'most'];

export const leverageRegions: Record<LeverageRegionId, LeverageRegion> = {
  most: {
    weight: 'Most',
    part: 'Part 3',
    topic: 'Product',
    levers: ['Where you wait', 'Build to learn', 'What not to build'],
  },
  more: {
    weight: 'More',
    part: 'Part 2',
    topic: 'Workflow',
    levers: [
      'Feedback loops',
      'Spec-driven development',
      'Issue to merge',
      'A server',
      'Production visibility',
    ],
  },
  'a-lot': {
    weight: 'A lot',
    part: 'Part 1',
    topic: 'Code',
    levers: ['Architecture', 'Code quality', 'Linting', 'Tests', 'Generated SDKs'],
  },
};

// The rising wedge of the leverage bar, one polygon per region in a 100x120 viewBox.
export const leverageWedges: Record<LeverageRegionId, { points: string; opacity: number }> = {
  'a-lot': { points: '0,90 100,60 100,120 0,120', opacity: 0.28 },
  more: { points: '0,60 100,30 100,120 0,120', opacity: 0.55 },
  most: { points: '0,30 100,0 100,120 0,120', opacity: 1 },
};

function ChapterMarker({ chapter }: { chapter: LeverageRegionId }) {
  const region = leverageRegions[chapter];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[13px] uppercase tracking-[0.2em] text-muted-foreground">
      <div className="flex gap-1" aria-hidden="true">
        {leverageRegionOrder.map((id) => (
          <span
            key={id}
            className={`h-1.5 w-8 ${id === chapter ? 'bg-primary' : 'bg-[var(--hair)]'}`}
          />
        ))}
      </div>
      <span className="font-semibold text-primary">
        {region.part} / {region.topic}
      </span>
    </div>
  );
}

export interface SlideSource {
  href: string;
  label: string;
}

export interface SlideHeading {
  title: string;
  subtitle?: string;
  aside?: ReactNode;
}

// Content slides pass `heading`: the title block sits at the same spot on every slide and
// the body starts a fixed distance below it. Cover-style slides omit it and centre everything.
export function SlideFrame({
  chapter,
  heading,
  source,
  children,
}: {
  chapter?: LeverageRegionId;
  heading?: SlideHeading;
  source?: SlideSource;
  children: ReactNode;
}) {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col px-6 pt-10 pb-14 sm:px-10 lg:px-16">
        <div className="flex min-h-8 shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-1">
          {chapter ? <ChapterMarker chapter={chapter} /> : null}
          {source ? <SourceNote href={source.href}>{source.label}</SourceNote> : null}
        </div>
        {heading ? <SlideHeader {...heading} /> : null}
        <div
          className={`flex flex-1 flex-col gap-[clamp(1.25rem,4vh,2.75rem)] ${
            heading
              ? 'justify-start pt-[clamp(2rem,7vh,4.5rem)] pb-[clamp(1.25rem,4vh,2.75rem)]'
              : 'justify-center py-[clamp(1.25rem,4vh,2.75rem)]'
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function SlideHeader({ title, subtitle, aside }: SlideHeading) {
  return (
    <header className="mt-[clamp(1rem,4vh,2.5rem)] shrink-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-[clamp(1.6rem,2.9vw,2.9rem)] font-bold leading-none text-primary">
          {title}
        </h2>
        {aside}
      </div>
      {subtitle ? (
        <p className="mt-[clamp(0.5rem,1.5vh,1rem)] font-serif text-[clamp(1.15rem,2vw,2rem)] leading-tight text-foreground">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}

export function Label({
  children,
  tone = 'muted',
  className = '',
}: {
  children: ReactNode;
  tone?: 'muted' | 'primary';
  className?: string;
}) {
  const toneClasses = tone === 'primary' ? 'font-semibold text-primary' : 'text-muted-foreground';

  return (
    <div
      className={`font-mono text-xs uppercase tracking-[0.2em] sm:text-[13px] ${toneClasses} ${className}`}
    >
      {children}
    </div>
  );
}

export function FlowArrow({ className = '' }: { className?: string }) {
  return (
    <ArrowRight
      aria-hidden="true"
      strokeWidth={1.75}
      className={`h-[clamp(1.25rem,2vw,1.75rem)] w-[clamp(1.25rem,2vw,1.75rem)] shrink-0 text-primary ${className}`}
    />
  );
}

export function SourceNote({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="font-mono text-sm text-muted-foreground underline decoration-dashed underline-offset-4 hover:text-primary"
    >
      {children}
    </a>
  );
}
