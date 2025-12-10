'use client';

import { cn } from '@/lib/utils';
import { Search, Type } from 'lucide-react';

interface TwoStageGapProps {
  className?: string;
}

export function TwoStageGap({ className }: TwoStageGapProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-muted/30 p-6 md:p-8 shadow-lg space-y-6',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-secondary">Self-Balancing</p>
          <h3 className="text-lg font-semibold">Information gap → Generation gap</h3>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-background/70 p-4 text-sm space-y-3 min-h-[200px]">
          <div className="flex items-center gap-2 font-semibold">
            <Search className="h-4 w-4 text-muted-foreground" />
            Stage 1: Information Gap (what we collect)
          </div>
          <div className="space-y-2 text-muted-foreground">
            <p className="text-xs uppercase tracking-wide">Outputs</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Top sources (3–5): OpenAI system card, Anthropic Constitutional AI, DeepMind eval
                blogs.
              </li>
              <li>Extracted facts: eval gates, red-team cadence, 2023–2025 incident summaries.</li>
              <li>Inline quotes + URLs; duplicates removed.</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Goal: close evidence gaps with primary sources before any polish.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-primary/60 bg-primary/5 p-4 text-sm space-y-3 min-h-[200px]">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Type className="h-4 w-4" />
            Stage 2: Generation Gap (what you read)
          </div>
          <div className="space-y-2 text-foreground">
            <p className="text-xs uppercase tracking-wide">Outputs</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Narrative: safety pillars per lab with inline citations; incidents + mitigations.
              </li>
              <li>Table: Lab vs eval gates vs red-team cadence vs interpretability depth.</li>
              <li>
                Clarity pass: removes repetition, smooth flow, instruction-following guaranteed.
              </li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Goal: readable, insightful synthesis once facts are locked.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
