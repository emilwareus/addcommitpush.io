import { EpistemicBadge } from '@/components/life/badges';
import { LifePageHeader } from '@/components/life/page-header';
import { MarkdownContent } from '@/components/life/markdown-content';
import { MemoryActions } from '@/components/life/memory-actions';
import { uuidSchema } from '@/lib/life/contracts';
import { enumLabel, formatInOwnerTimezone, formatMemoryTime } from '@/lib/life/formatting';
import { getMemory, getOwner } from '@/lib/life/queries.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MemoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = uuidSchema.parse((await params).id);
  const [owner, memory] = await Promise.all([getOwner(), getMemory(id)]);

  return (
    <div className="mx-auto max-w-4xl">
      <LifePageHeader
        kicker={`${enumLabel(memory.kind)} · ${memory.domain}`}
        title={memory.title}
        description={formatMemoryTime(memory, owner.timezone)}
        actions={<EpistemicBadge status={memory.epistemic_status} />}
      />

      <article className="border border-dashed border-border bg-card p-6 sm:p-8">
        <MarkdownContent>{memory.body_markdown}</MarkdownContent>
      </article>

      <dl className="mt-6 grid gap-4 border border-dashed border-border p-5 text-sm sm:grid-cols-3">
        <Meta label="Kind" value={enumLabel(memory.kind)} />
        <Meta label="Domain" value={memory.domain} />
        <Meta
          label="Recorded"
          value={formatInOwnerTimezone(memory.recorded_at, owner.timezone)}
        />
      </dl>

      <MemoryActions memory={memory} timezone={owner.timezone} />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="section-kicker">{label}</dt>
      <dd className="mt-1 break-words">{value}</dd>
    </div>
  );
}
