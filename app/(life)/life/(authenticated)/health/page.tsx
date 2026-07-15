import { HealthChart } from '@/components/life/health-chart';
import { HealthMeasurementForm } from '@/components/life/health-measurement-form';
import { LifePageHeader } from '@/components/life/page-header';
import type { HealthMeasurement } from '@/lib/life/contracts';
import { getOwner, listHealthMeasurements } from '@/lib/life/queries.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function groupMeasurements(measurements: HealthMeasurement[]) {
  const groups = new Map<string, HealthMeasurement[]>();
  for (const measurement of measurements) {
    const key = JSON.stringify([measurement.metric_code, measurement.unit]);
    const group = groups.get(key) ?? [];
    group.push(measurement);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export default async function HealthPage() {
  const [owner, measurements] = await Promise.all([getOwner(), listHealthMeasurements()]);
  const groups = groupMeasurements(measurements);
  return (
    <div className="mx-auto max-w-7xl">
      <LifePageHeader
        kicker="Measurements"
        title="Health"
        description="Exact vendor-neutral measurements grouped only when both metric code and unit match. Charts never normalize or combine incompatible series."
      />
      <HealthMeasurementForm timezone={owner.timezone} />
      <div className="mt-8 space-y-6">
        {groups.map((group) => (
          <HealthChart
            key={`${group[0].metric_code}\u0000${group[0].unit}`}
            measurements={group}
            timezone={owner.timezone}
          />
        ))}
        {groups.length === 0 && (
          <p className="border border-dashed border-border p-6 text-sm text-muted-foreground">
            No health measurements yet.
          </p>
        )}
      </div>
    </div>
  );
}
