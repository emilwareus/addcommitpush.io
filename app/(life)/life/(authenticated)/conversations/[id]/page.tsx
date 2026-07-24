import Link from 'next/link';
import { ConversationComposer } from '@/components/life/conversation-composer';
import { LifePageHeader } from '@/components/life/page-header';
import { MarkdownContent } from '@/components/life/markdown-content';
import { Badge } from '@/components/ui/badge';
import { uuidSchema } from '@/lib/life/contracts';
import { enumLabel, formatInOwnerTimezone } from '@/lib/life/formatting';
import { getConversationDetail, getOwner } from '@/lib/life/queries.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = uuidSchema.parse((await params).id);
  const [owner, detail] = await Promise.all([getOwner(), getConversationDetail(id)]);
  const { conversation, messages } = detail;

  return (
    <div className="mx-auto max-w-4xl">
      <LifePageHeader
        kicker={enumLabel(conversation.mode)}
        title={conversation.title}
        description={`Created ${formatInOwnerTimezone(conversation.created_at, owner.timezone)}. Messages are durable and ordered by commit time.`}
        actions={<Badge variant="outline">{enumLabel(conversation.status)}</Badge>}
      />
      <section aria-label="Transcript" className="space-y-5">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`border border-dashed p-5 ${message.role === 'assistant' ? 'border-primary bg-card' : 'border-border bg-background'}`}
          >
            <header className="mb-4 flex flex-wrap justify-between gap-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <span>
                {enumLabel(message.role)} · {enumLabel(message.input_modality)}
              </span>
              <time>{formatInOwnerTimezone(message.created_at, owner.timezone)}</time>
            </header>
            <MarkdownContent>{message.content}</MarkdownContent>
            {message.cited_memory_ids.length > 0 && (
              <div className="mt-4 border-t border-dashed border-border pt-3">
                <p className="section-kicker">Cited memories</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {message.cited_memory_ids.map((memoryId) => (
                    <Link
                      key={memoryId}
                      href={`/life/memories/${memoryId}`}
                      prefetch={false}
                      className="text-xs"
                    >
                      {memoryId}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            This conversation has no committed messages.
          </p>
        )}
      </section>
      {conversation.status === 'active' && (
        <ConversationComposer conversationId={conversation.id} />
      )}
    </div>
  );
}
