import type { Memory } from '@/lib/life/contracts';
import { enumLabel, formatMemoryTime, timelineGroupLabel } from '@/lib/life/formatting';
import { SensitivityBadge } from './badges';

export function TimelineRail({ memories, timezone }: { memories: Memory[]; timezone: string }) {
  const groups = new Map<string, Memory[]>();
  for (const memory of memories) {
    const label = timelineGroupLabel(memory, timezone);
    groups.set(label, [...(groups.get(label) ?? []), memory]);
  }

  return (
    <div className="space-y-8">
      {[...groups.entries()].map(([label, items]) => (
        <section key={label} className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
          <h2 className="font-serif text-xl font-semibold text-primary">{label}</h2>
          <div className="border-l border-dashed border-border pl-5">
            {items.map((memory) => (
              <article
                key={memory.id}
                className="relative border-b border-dashed border-border py-4 first:pt-0 last:border-b-0"
              >
                <span className="absolute top-5 -left-[1.48rem] h-2 w-2 bg-primary first:top-1" />
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <span>
                    {enumLabel(memory.kind)} · {memory.domain}
                  </span>
                  <SensitivityBadge sensitivity={memory.sensitivity} />
                </div>
                <a
                  href={`/life/memories/${memory.id}`}
                  className="mt-2 block font-serif text-lg font-semibold text-primary no-underline hover:underline"
                >
                  {memory.title}
                </a>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatMemoryTime(memory, timezone)}
                  {memory.occurred_end
                    ? ` → ${formatMemoryTime({ ...memory, occurred_start: memory.occurred_end }, timezone)}`
                    : ''}
                  {' · '}
                  {enumLabel(memory.temporal_precision)} precision
                </p>
              </article>
            ))}
          </div>
        </section>
      ))}
      {memories.length === 0 && (
        <p className="text-sm text-muted-foreground">No timeline entries match these bounds.</p>
      )}
    </div>
  );
}
