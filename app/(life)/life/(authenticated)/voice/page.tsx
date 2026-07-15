import { LifePageHeader } from '@/components/life/page-header';
import { VoiceSession } from '@/components/life/voice/voice-session';
import { getOwner } from '@/lib/life/queries.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function VoicePage() {
  const owner = await getOwner();
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: owner.timezone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date())
  );
  const defaultTitle =
    hour < 12 ? 'Morning reflection' : hour < 18 ? 'Afternoon conversation' : 'Evening reflection';
  return (
    <div className="mx-auto max-w-7xl">
      <LifePageHeader
        kicker="Realtime voice"
        title="Talk with Life"
        description="A private WebRTC conversation with live transcripts, fixed memory sensitivity, and explicit durable saves. Realtime errors never switch to uploaded audio."
      />
      <VoiceSession defaultTitle={defaultTitle} />
    </div>
  );
}
