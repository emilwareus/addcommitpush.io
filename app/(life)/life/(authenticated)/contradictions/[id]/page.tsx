import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { ContradictionResolver } from '@/components/life/contradiction-resolver';
import { LifePageHeader } from '@/components/life/page-header';
import { MarkdownContent } from '@/components/life/markdown-content';
import { LifeApiError } from '@/lib/life/errors';
import { enumLabel, formatInOwnerTimezone } from '@/lib/life/formatting';
import { getContradiction, getMemory, getOwner } from '@/lib/life/queries.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function loadContradictionDetail(id: string) {
  try {
    const contradiction = await getContradiction(id);
    const [owner, left, right] = await Promise.all([
      getOwner(),
      getMemory(contradiction.left_memory_id),
      getMemory(contradiction.right_memory_id),
    ]);
    return { contradiction, owner, left, right };
  } catch (error) {
    if (error instanceof LifeApiError && error.status === 404) notFound();
    throw error;
  }
}

export default async function ContradictionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { contradiction, owner, left, right } = await loadContradictionDetail(id);
  return (
    <div className="mx-auto max-w-6xl">
      <LifePageHeader
        kicker="Contradiction detail"
        title="Review conflict"
        description={contradiction.explanation}
        actions={
          <Badge variant={contradiction.status === 'pending' ? 'destructive' : 'outline'}>
            {enumLabel(contradiction.status)}
          </Badge>
        }
      />
      <p className="mb-6 text-xs text-muted-foreground">
        Detected {formatInOwnerTimezone(contradiction.detected_at, owner.timezone)}
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        <MemorySide label="Left memory" id={left.id} title={left.title} body={left.body_markdown} />
        <MemorySide
          label="Right memory"
          id={right.id}
          title={right.title}
          body={right.body_markdown}
        />
      </div>
      <div className="mt-6">
        <ContradictionResolver contradiction={contradiction} />
      </div>
    </div>
  );
}

function MemorySide({
  label,
  id,
  title,
  body,
}: {
  label: string;
  id: string;
  title: string;
  body: string;
}) {
  return (
    <section className="border border-dashed border-border bg-card p-5 sm:p-6">
      <p className="section-kicker">{label}</p>
      <h2 className="mt-2 font-serif text-2xl font-semibold text-primary">
        <Link href={`/life/memories/${id}`} prefetch={false}>
          {title}
        </Link>
      </h2>
      <div className="mt-5">
        <MarkdownContent>{body}</MarkdownContent>
      </div>
    </section>
  );
}
