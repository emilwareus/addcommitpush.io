import Link from 'next/link';
import type { Memory, SearchHit } from '@/lib/life/contracts';
import { enumLabel, formatMemoryTime } from '@/lib/life/formatting';
import { EpistemicBadge, SensitivityBadge } from './badges';

export function MemoryCard({
  memory,
  timezone,
  score,
}: {
  memory: Memory | SearchHit;
  timezone: string;
  score?: number;
}) {
  const excerpt = memory.body_markdown.replace(/[#*_`>\[\]]/g, '').slice(0, 220);
  const time =
    'recorded_at' in memory
      ? formatMemoryTime(memory, timezone)
      : memory.occurred_start
        ? new Intl.DateTimeFormat('en', { timeZone: timezone, dateStyle: 'medium' }).format(
            new Date(memory.occurred_start)
          )
        : 'Undated';
  return (
    <article className="border border-dashed border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {enumLabel(memory.kind)} · {memory.domain}
        </span>
        <SensitivityBadge sensitivity={memory.sensitivity} />
        <EpistemicBadge status={memory.epistemic_status} />
      </div>
      <h3 className="mt-3 font-serif text-xl font-semibold text-primary">
        <Link
          href={`/life/memories/${memory.id}`}
          prefetch={false}
          className="no-underline hover:underline"
        >
          {memory.title}
        </Link>
      </h3>
      <p className="mt-3 text-sm leading-6 text-foreground">
        {excerpt}
        {memory.body_markdown.length > 220 ? '…' : ''}
      </p>
      <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
        <span>{time}</span>
        {score !== undefined && <span>Retrieval rank {score.toFixed(4)}</span>}
        {'confidence' in memory && <span>Confidence {Math.round(memory.confidence * 100)}%</span>}
        {'importance' in memory && <span>Importance {memory.importance}/10</span>}
        {memory.source_id && <span>Has source</span>}
      </div>
    </article>
  );
}
