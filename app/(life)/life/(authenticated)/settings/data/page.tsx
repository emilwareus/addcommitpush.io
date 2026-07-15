import { DataExport } from '@/components/life/data-export';
import { OwnerDeletion } from '@/components/life/owner-deletion';
import { LifePageHeader } from '@/components/life/page-header';
import { getOwner } from '@/lib/life/queries.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DataSettingsPage() {
  const owner = await getOwner();
  return (
    <div className="mx-auto max-w-5xl">
      <LifePageHeader
        kicker="Settings"
        title="Data and privacy"
        description="Download portable copies or deliberately remove the online owner graph."
      />
      <div className="space-y-6">
        <DataExport />
        <OwnerDeletion displayName={owner.display_name} />
      </div>
    </div>
  );
}
