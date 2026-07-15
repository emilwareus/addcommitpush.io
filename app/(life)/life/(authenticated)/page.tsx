import Link from 'next/link';
import { AlertTriangle, ArrowRight, Database, HeartPulse, Plug, ScrollText } from 'lucide-react';
import { LifePageHeader } from '@/components/life/page-header';
import { MemoryCard } from '@/components/life/memory-card';
import { StartConversation } from '@/components/life/start-conversation';
import { ReflectionAction } from '@/components/life/reflection-action';
import { Badge } from '@/components/ui/badge';
import { enumLabel, formatInOwnerTimezone, formatMemoryTime } from '@/lib/life/formatting';
import { getDashboardData } from '@/lib/life/queries.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LifeDashboardPage() {
  const data = await getDashboardData();
  const connectorErrors = data.connectors.filter((connector) => connector.status === 'error');

  return (
    <div className="mx-auto max-w-7xl">
      <LifePageHeader
        kicker="Owner workspace"
        title="Overview"
        description={`Private, owner-scoped view in ${data.owner.timezone}. Recent knowledge and operations only.`}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <StartConversation />
        <ReflectionAction />

        <DashboardPanel title="Recent memories" icon={Database} href="/life/memories">
          <div className="space-y-3">
            {data.memories.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} timezone={data.owner.timezone} />
            ))}
            {data.memories.length === 0 && <EmptyState>No active memories yet.</EmptyState>}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Timeline" icon={ScrollText} href="/life/timeline">
          <div className="space-y-4">
            {data.timeline.map((memory) => (
              <div
                key={memory.id}
                className="border-b border-dashed border-border pb-4 last:border-0"
              >
                <Link
                  href={`/life/memories/${memory.id}`}
                  prefetch={false}
                  className="font-serif font-semibold text-primary no-underline hover:underline"
                >
                  {memory.title}
                </Link>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatMemoryTime(memory, data.owner.timezone)} ·{' '}
                  {enumLabel(memory.temporal_precision)} precision
                </p>
              </div>
            ))}
            {data.timeline.length === 0 && <EmptyState>No timeline entries yet.</EmptyState>}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Conversations" href="/life/conversations">
          <div className="space-y-4">
            {data.conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/life/conversations/${conversation.id}`}
                prefetch={false}
                className="block border-b border-dashed border-border pb-4 no-underline last:border-0"
              >
                <span className="font-serif font-semibold text-primary">{conversation.title}</span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  {enumLabel(conversation.mode)} · {enumLabel(conversation.status)} ·{' '}
                  {formatInOwnerTimezone(conversation.updated_at, data.owner.timezone)}
                </span>
              </Link>
            ))}
            {data.conversations.length === 0 && <EmptyState>No conversations yet.</EmptyState>}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Sources" icon={Plug}>
          <div className="space-y-4">
            {data.connectors.map((connector) => (
              <div
                key={connector.id}
                className="flex items-start justify-between gap-3 border-b border-dashed border-border pb-4 last:border-0"
              >
                <div>
                  <p className="font-medium text-primary">{enumLabel(connector.provider)}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {connector.last_synced_at
                      ? `Synced ${formatInOwnerTimezone(connector.last_synced_at, data.owner.timezone)}`
                      : 'Never synced'}
                  </p>
                  {connector.last_error && (
                    <p className="mt-2 text-xs text-danger">Connector error recorded.</p>
                  )}
                </div>
                <Badge variant={connector.status === 'error' ? 'destructive' : 'outline'}>
                  {enumLabel(connector.status)}
                </Badge>
              </div>
            ))}
            {data.connectors.length === 0 && <EmptyState>No connectors configured.</EmptyState>}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Health" icon={HeartPulse}>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.health.map((measurement) => (
              <div key={measurement.id} className="border border-dashed border-border p-4">
                <p className="section-kicker">{enumLabel(measurement.metric_code)}</p>
                <p className="mt-2 font-serif text-2xl font-semibold text-primary">
                  {measurement.value} <span className="text-sm">{measurement.unit}</span>
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {formatInOwnerTimezone(measurement.measured_at, data.owner.timezone)}
                </p>
              </div>
            ))}
            {data.health.length === 0 && <EmptyState>No measurements yet.</EmptyState>}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Needs review" icon={AlertTriangle}>
          <p className="text-sm leading-6">
            <strong>{data.pendingContradictions.length}</strong> pending contradictions and{' '}
            <strong>{connectorErrors.length}</strong> connector errors.
          </p>
          <div className="mt-3 flex gap-4 text-xs">
            <Link href="/life/contradictions" prefetch={false}>
              Review contradictions
            </Link>
            <Link href="/life/settings/connectors" prefetch={false}>
              Review connectors
            </Link>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Activity" icon={ScrollText}>
          <div className="space-y-3">
            {data.audit.map((event) => (
              <details
                key={event.id}
                className="border-b border-dashed border-border pb-3 last:border-0"
              >
                <summary className="cursor-pointer text-sm text-primary">
                  {enumLabel(event.action)} · {enumLabel(event.resource_kind)}
                </summary>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {formatInOwnerTimezone(event.occurred_at, data.owner.timezone)} · Request metadata
                  available in the audit record.
                </p>
                <pre className="mt-2 overflow-x-auto border border-dashed border-border bg-code p-2 text-[10px]">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              </details>
            ))}
            {data.audit.length === 0 && <EmptyState>No audit activity yet.</EmptyState>}
          </div>
        </DashboardPanel>
      </div>
    </div>
  );
}

function DashboardPanel({
  title,
  icon: Icon,
  href,
  children,
}: {
  title: string;
  icon?: typeof Database;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-dashed border-border bg-card p-5 sm:p-6">
      <header className="mb-5 flex items-center justify-between gap-4 border-b border-dashed border-border pb-4">
        <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-primary">
          {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            prefetch={false}
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-primary no-underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
