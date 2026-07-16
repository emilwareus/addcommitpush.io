import { LifePageHeader } from '@/components/life/page-header';
import { TimelineRail } from '@/components/life/timeline-rail';
import { getOwner, getTimeline } from '@/lib/life/queries.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TimelinePage() {
  const [owner, memories] = await Promise.all([
    getOwner(),
    getTimeline({ limit: 500 }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <LifePageHeader
        kicker="Your history"
        title="Timeline"
        description="Memories in chronological order."
      />
      <TimelineRail memories={memories} timezone={owner.timezone} />
    </div>
  );
}
