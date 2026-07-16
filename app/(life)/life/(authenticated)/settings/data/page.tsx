import { DataExport } from '@/components/life/data-export';
import { LifePageHeader } from '@/components/life/page-header';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function DataSettingsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <LifePageHeader
        kicker="Settings"
        title="Data export"
        description="Download a portable copy of everything Life remembers."
      />
      <DataExport />
    </div>
  );
}
