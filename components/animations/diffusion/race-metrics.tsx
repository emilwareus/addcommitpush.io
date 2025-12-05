'use client';

import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';

interface RACEMetricsProps {
  className?: string;
}

const metrics = [
  { key: 'Comprehensiveness', think: 52.03, gemini: 50.5, openai: 49.29, claude: 48.36 },
  { key: 'Insight', think: 53.94, gemini: 51.62, openai: 48.94, claude: 48.79 },
  { key: 'Instruction Following', think: 52.07, gemini: 51.07, openai: 50.67, claude: 49.67 },
  { key: 'Readability', think: 50.44, gemini: 50.22, openai: 48.82, claude: 48.31 },
];

const maxScore = 55;

export function RACEMetrics({ className }: RACEMetricsProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-muted/30 p-6 md:p-8 shadow-lg space-y-6',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-secondary flex items-center gap-2 mb-1">
            <Trophy className="h-4 w-4 text-primary" />
            RACE Metrics
          </p>
          <h3 className="text-xl font-bold text-foreground">ThinkDepth.ai vs peers</h3>
        </div>
      </div>

      <div className="space-y-6">
        {metrics.map(({ key, think, gemini, openai, claude }) => (
          <div key={key} className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold text-foreground">{key}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Score</span>
            </div>
            <div className="space-y-2.5">
              {[
                { label: 'ThinkDepth.ai', value: think, color: 'bg-primary' },
                { label: 'Gemini 2.5 Pro Deep Research', value: gemini, color: 'bg-secondary' },
                { label: 'OpenAI Deep Research', value: openai, color: 'bg-foreground/70' },
                { label: 'Claude Research', value: claude, color: 'bg-border' },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-4">
                  <span className="w-40 md:w-48 shrink-0 text-sm text-foreground font-medium">
                    {row.label}
                  </span>
                  <div className="relative flex-1 h-3 rounded-full bg-border/60 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', row.color)}
                      style={{ width: `${(row.value / maxScore) * 100}%` }}
                    />
                  </div>
                  <span className="w-14 text-right text-sm font-semibold text-foreground tabular-nums">
                    {row.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-border/50">
        <p className="text-sm text-muted-foreground italic leading-relaxed">
          Note: At this time, Trivy tops this benchmark with a secret model.
        </p>
      </div>
    </div>
  );
}

