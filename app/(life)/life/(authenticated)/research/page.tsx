import { LifePageHeader } from '@/components/life/page-header';
import { ResearchForm } from '@/components/life/research-form';
import { getOwner } from '@/lib/life/queries.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ResearchPage() {
  const owner = await getOwner();
  return (
    <div className="mx-auto max-w-6xl">
      <LifePageHeader
        kicker="Explicit operation"
        title="Research"
        description="Run one deliberate web research query, inspect its citations, and keep any supported claims visibly labeled as researched."
      />
      <ResearchForm timezone={owner.timezone} />
    </div>
  );
}
