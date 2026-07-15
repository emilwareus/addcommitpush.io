import Link from 'next/link';
import { LifePageHeader } from '@/components/life/page-header';
import { Badge } from '@/components/ui/badge';
import { enumLabel, formatInOwnerTimezone } from '@/lib/life/formatting';
import { getOwner, listConversations } from '@/lib/life/queries.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ConversationsPage() {
  const [owner, conversations] = await Promise.all([getOwner(), listConversations()]);
  return (
    <div className="mx-auto max-w-5xl">
      <LifePageHeader
        kicker="Durable transcripts"
        title="Conversations"
        description="Owner-scoped text, interview, research, and future Realtime conversation records."
      />
      <div className="space-y-4">
        {conversations.map((conversation) => (
          <Link
            key={conversation.id}
            href={`/life/conversations/${conversation.id}`}
            prefetch={false}
            className="block border border-dashed border-border bg-card p-5 no-underline hover:border-primary"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="section-kicker">{enumLabel(conversation.mode)}</p>
                <h2 className="mt-2 font-serif text-xl font-semibold text-primary">
                  {conversation.title}
                </h2>
              </div>
              <Badge variant="outline">{enumLabel(conversation.status)}</Badge>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Created {formatInOwnerTimezone(conversation.created_at, owner.timezone)} · Updated{' '}
              {formatInOwnerTimezone(conversation.updated_at, owner.timezone)}
            </p>
          </Link>
        ))}
        {conversations.length === 0 && (
          <p className="text-sm text-muted-foreground">No durable conversations yet.</p>
        )}
      </div>
    </div>
  );
}
