import { ConnectorList } from '@/components/life/connector-list';
import { LifePageHeader } from '@/components/life/page-header';
import type { ConnectorView } from '@/lib/life/contracts';
import { getOwner, listConnectors } from '@/lib/life/queries.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ConnectorsPage() {
  const [owner, connectors] = await Promise.all([getOwner(), listConnectors()]);
  const views: ConnectorView[] = connectors
    .filter((connector) => connector.status !== 'revoked')
    .map((connector) => ({
      id: connector.id,
      provider: connector.provider,
      label: connector.label,
      external_account_name: connector.external_account_name,
      status: connector.status,
      last_synced_at: connector.last_synced_at,
      has_error: connector.last_error !== null,
    }));
  return (
    <div className="mx-auto max-w-7xl">
      <LifePageHeader
        kicker="Settings"
        title="Connectors"
        description="Paste API keys or IMAP app passwords for as many accounts as you need. Life encrypts them, validates them live, and syncs on a 15-minute cloud job."
      />
      <ConnectorList connectors={views} timezone={owner.timezone} />
    </div>
  );
}
