import Link from 'next/link';
import { EpistemicBadge, SensitivityBadge } from '@/components/life/badges';
import { LifePageHeader } from '@/components/life/page-header';
import { MarkdownContent } from '@/components/life/markdown-content';
import { MemoryActions } from '@/components/life/memory-actions';
import { uuidSchema } from '@/lib/life/contracts';
import { enumLabel, formatInOwnerTimezone, formatMemoryTime } from '@/lib/life/formatting';
import { getMemoryDetail, getOwner } from '@/lib/life/queries.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MemoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = uuidSchema.parse((await params).id);
  const [owner, detail] = await Promise.all([getOwner(), getMemoryDetail(id)]);
  const { memory, edges, relatedMemories, priorRevision } = detail;
  const relatedById = new Map(relatedMemories.map((item) => [item.id, item]));

  return (
    <div className="mx-auto max-w-5xl">
      <LifePageHeader
        kicker={`${enumLabel(memory.kind)} · ${memory.domain}`}
        title={memory.title}
        description="One immutable memory revision with its trust, time, provenance, and relationships."
        actions={
          <div className="flex gap-2">
            <SensitivityBadge sensitivity={memory.sensitivity} />
            <EpistemicBadge status={memory.epistemic_status} />
          </div>
        }
      />

      <article className="border border-dashed border-border bg-card p-6 sm:p-8">
        <MarkdownContent>{memory.body_markdown}</MarkdownContent>
      </article>

      <section className="mt-8 border border-dashed border-border p-5 sm:p-6">
        <h2 className="font-serif text-2xl font-semibold text-primary">Metadata & provenance</h2>
        <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Meta label="Memory UUID" value={memory.id} />
          <Meta label="Owner UUID" value={memory.owner_id} />
          <Meta
            label="Occurred"
            value={`${formatMemoryTime(memory, owner.timezone)} (${enumLabel(memory.temporal_precision)} precision)`}
          />
          <Meta
            label="Occurred end"
            value={
              memory.occurred_end
                ? formatInOwnerTimezone(memory.occurred_end, owner.timezone)
                : null
            }
          />
          <Meta
            label="Recorded"
            value={formatInOwnerTimezone(memory.recorded_at, owner.timezone)}
          />
          <Meta label="Updated" value={formatInOwnerTimezone(memory.updated_at, owner.timezone)} />
          <Meta label="Confidence" value={`${Math.round(memory.confidence * 100)}%`} />
          <Meta label="Importance" value={`${memory.importance}/10`} />
          <Meta label="Document path" value={memory.document_path} />
          <Meta label="Source UUID" value={memory.source_id} />
          <Meta label="Source message UUID" value={memory.source_message_id} />
          <Meta label="Derived from UUID" value={memory.derived_from_id} />
          <Meta label="Subject" value={memory.subject} />
          <Meta label="Predicate" value={memory.predicate} />
          <Meta
            label="Object value"
            value={memory.object_value === null ? null : JSON.stringify(memory.object_value)}
          />
          <Meta label="Evidence excerpt" value={memory.evidence_excerpt} />
        </dl>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="border border-dashed border-border p-5">
          <h2 className="font-serif text-xl font-semibold text-primary">Relations</h2>
          <div className="mt-4 space-y-3">
            {edges.map((edge) => {
              const otherId =
                edge.from_memory_id === memory.id ? edge.to_memory_id : edge.from_memory_id;
              const other = relatedById.get(otherId);
              return (
                <div key={edge.id}>
                  <span className="text-xs text-muted-foreground">
                    {enumLabel(edge.relation)} · {Math.round(edge.confidence * 100)}%
                  </span>
                  {other && (
                    <Link
                      href={`/life/memories/${other.id}`}
                      prefetch={false}
                      className="mt-1 block text-sm text-primary"
                    >
                      {other.title}
                    </Link>
                  )}
                </div>
              );
            })}
            {edges.length === 0 && (
              <p className="text-sm text-muted-foreground">No recorded relations.</p>
            )}
          </div>
        </div>
        <div className="border border-dashed border-border p-5">
          <h2 className="font-serif text-xl font-semibold text-primary">Revision history</h2>
          {priorRevision ? (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground">This revision supersedes:</p>
              <Link
                href={`/life/memories/${priorRevision.id}`}
                prefetch={false}
                className="mt-2 block text-primary"
              >
                {priorRevision.title}
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">This is the first known revision.</p>
          )}
        </div>
      </section>

      <MemoryActions memory={memory} timezone={owner.timezone} />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="section-kicker">{label}</dt>
      <dd className="mt-1 break-words text-sm">{value ?? 'Not recorded'}</dd>
    </div>
  );
}
