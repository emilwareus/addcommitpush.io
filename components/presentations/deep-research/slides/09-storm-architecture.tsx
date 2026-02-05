'use client';

import { motion } from 'framer-motion';
import { useSlideStep } from '@/app/presentations/deep-research/layout';

function DownArrow({ visible }: { visible: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.3 }}
      className="flex justify-center py-1"
    >
      <svg width="24" height="28" viewBox="0 0 24 28" fill="none" className="text-muted-foreground">
        <path d="M12 2v20m0 0l-7-7m7 7l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.div>
  );
}

function Pill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`px-3 py-1.5 rounded-full text-sm font-mono whitespace-nowrap ${className}`}>
      {children}
    </span>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-2 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-secondary/20 text-secondary border border-secondary/30">
      {children}
    </span>
  );
}

function PhaseCard({
  number,
  name,
  colorClass,
  borderClass,
  bgClass,
  visible,
  delay = 0,
  badge,
  children,
}: {
  number: number;
  name: string;
  colorClass: string;
  borderClass: string;
  bgClass: string;
  visible: boolean;
  delay?: number;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 16 }}
      transition={{ duration: 0.4, delay }}
      className={`w-full rounded-lg border ${borderClass} ${bgClass} px-5 py-4`}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <span className={`font-mono text-lg font-bold ${colorClass}`}>{number}.</span>
        <span className={`font-bold text-xl tracking-wide ${colorClass}`}>{name}</span>
        {badge && <Badge>{badge}</Badge>}
      </div>
      {children}
    </motion.div>
  );
}

function MiniFlow({ items, colorClass }: { items: string[]; colorClass: string }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {items.map((item, i) => (
        <div key={item} className="flex items-center gap-1.5">
          <Pill className={`${colorClass} bg-card border border-current/20`}>{item}</Pill>
          {i < items.length - 1 && <span className="text-muted-foreground text-sm">&rarr;</span>}
        </div>
      ))}
    </div>
  );
}

function ConversationLanes() {
  const lanes = [
    { perspective: 'Perspective 1', color: 'border-primary/30 bg-primary/5' },
    { perspective: 'Perspective 2', color: 'border-secondary/30 bg-secondary/5' },
    { perspective: 'Perspective 3', color: 'border-accent/30 bg-accent/5' },
  ];

  return (
    <div className="flex gap-2">
      {lanes.map((lane) => (
        <div
          key={lane.perspective}
          className={`flex-1 rounded border ${lane.color} px-3 py-3 text-center`}
        >
          <div className="text-sm font-semibold text-muted-foreground mb-1">{lane.perspective}</div>
          <div className="text-sm font-mono text-muted-foreground">
            Writer &harr; Expert
          </div>
          <div className="text-xs text-muted-foreground/60">&times;3 turns</div>
        </div>
      ))}
    </div>
  );
}

export function StormArchitectureSlide() {
  const step = useSlideStep();

  return (
    <div className="flex flex-col items-center justify-start h-full w-full max-w-4xl mx-auto px-8 pt-10">
      <h2 className="text-4xl md:text-5xl font-bold mb-2 text-primary">STORM: Five Phases</h2>
      <p className="text-base text-muted-foreground mb-6 tracking-wide">
        <span className="text-primary font-semibold">S</span>ynthesis of{' '}
        <span className="text-primary font-semibold">T</span>opic{' '}
        <span className="text-primary font-semibold">O</span>utlines through{' '}
        <span className="text-primary font-semibold">R</span>etrieval and{' '}
        <span className="text-primary font-semibold">M</span>ulti-perspective question asking
      </p>

      <div className="w-full space-y-0">
        {/* Phase 1: DISCOVER — always visible (step 0) */}
        <PhaseCard
          number={1}
          name="DISCOVER"
          colorClass="text-primary"
          borderClass="border-primary/30"
          bgClass="bg-primary/5"
          visible
        >
          <MiniFlow
            items={['Topic', 'Search related context', '3 Personas + 1 default']}
            colorClass="text-primary"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Always includes a &ldquo;Basic fact writer&rdquo; &mdash; ensures broad factual coverage
          </p>
        </PhaseCard>

        {/* Arrow 1→2 */}
        <DownArrow visible={step >= 1} />

        {/* Phase 2: INTERVIEW — step 1 */}
        <PhaseCard
          number={2}
          name="INTERVIEW"
          colorClass="text-secondary"
          borderClass="border-secondary/30"
          bgClass="bg-secondary/5"
          visible={step >= 1}
          badge="parallel"
        >
          <ConversationLanes />
          <p className="text-sm text-muted-foreground mt-2">
            TopicExpert: QuestionToQuery &rarr; Search &rarr; AnswerQuestion with [1],[2] citations
          </p>
        </PhaseCard>

        {/* Arrow 2→3 */}
        <DownArrow visible={step >= 2} />

        {/* Phase 3: OUTLINE — step 2 */}
        <PhaseCard
          number={3}
          name="OUTLINE"
          colorClass="text-accent"
          borderClass="border-accent/30"
          bgClass="bg-accent/5"
          visible={step >= 2}
        >
          <MiniFlow
            items={['Draft (LLM knowledge)', 'Refine (+ conversation data)']}
            colorClass="text-accent"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Two-stage: structure from parametric knowledge, details from research
          </p>
        </PhaseCard>

        {/* Arrow 3→4 */}
        <DownArrow visible={step >= 2} />

        {/* Phase 4: WRITE SECTIONS — step 2 with stagger */}
        <PhaseCard
          number={4}
          name="WRITE SECTIONS"
          colorClass="text-primary"
          borderClass="border-primary/30"
          bgClass="bg-primary/5"
          visible={step >= 2}
          delay={0.2}
        >
          <MiniFlow
            items={['Per-section writing', 'Inline [1],[2] citations']}
            colorClass="text-primary"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Each top-level section written independently with collected snippets
          </p>
        </PhaseCard>

        {/* Arrow 4→5 */}
        <DownArrow visible={step >= 2} />

        {/* Phase 5: LEAD + ASSEMBLE — step 2 with longer stagger */}
        <PhaseCard
          number={5}
          name="LEAD + ASSEMBLE"
          colorClass="text-primary"
          borderClass="border-primary/30"
          bgClass="bg-primary/5"
          visible={step >= 2}
          delay={0.35}
        >
          <MiniFlow
            items={['Lead section (after body)', 'Build references', 'Final article']}
            colorClass="text-primary"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Lead written last &mdash; it reflects actual content, not a guess
          </p>
        </PhaseCard>
      </div>

      {/* Bottom callout — step 3 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: step >= 3 ? 1 : 0, y: step >= 3 ? 0 : 10 }}
        transition={{ duration: 0.4 }}
        className="mt-6 px-6 py-3 rounded-lg border border-secondary/30 bg-secondary/5 text-center"
      >
        <p className="text-lg text-secondary font-semibold">
          Linear pipeline &mdash; each phase runs <span className="underline">exactly once</span>. No backtracking.
        </p>
      </motion.div>
    </div>
  );
}
