import { ContradictionCard } from '@/components/life/contradiction-card';
import { LifePageHeader } from '@/components/life/page-header';
import { getOwner, listContradictions } from '@/lib/life/queries.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ContradictionsPage() {
  const [owner, contradictions] = await Promise.all([getOwner(), listContradictions()]);
  return (
    <div className="mx-auto max-w-6xl">
      <LifePageHeader
        kicker="Knowledge review"
        title="Contradictions"
        description="Inspect conflicts without rewriting memory history. Resolution records a terminal review status and note."
      />
      <div className="grid gap-5 xl:grid-cols-2">
        {contradictions.map((contradiction) => (
          <ContradictionCard
            key={contradiction.id}
            contradiction={contradiction}
            timezone={owner.timezone}
          />
        ))}
      </div>
      {contradictions.length === 0 && (
        <p className="border border-dashed border-border p-6 text-sm text-muted-foreground">
          No contradictions detected.
        </p>
      )}
    </div>
  );
}
