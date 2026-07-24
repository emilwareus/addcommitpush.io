import { z } from 'zod';
import { ConnectorList } from '@/components/life/connector-list';
import { LifePageHeader } from '@/components/life/page-header';
import { CONNECTOR_PROVIDERS } from '@/lib/life/constants';
import { enumLabel } from '@/lib/life/formatting';
import { getOwner, listConnectors } from '@/lib/life/queries.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ConnectorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [owner, connectors, parameters] = await Promise.all([
    getOwner(),
    listConnectors(),
    searchParams,
  ]);
  const oauth = z.enum(CONNECTOR_PROVIDERS).safeParse(parameters.oauth);
  const status = z.enum(['connected', 'error']).safeParse(parameters.status);
  return (
    <div className="mx-auto max-w-7xl">
      <LifePageHeader
        kicker="Settings"
        title="Connectors"
        description="Authorize sources, start explicit syncs, and inspect bounded ingestion jobs. Provider grants remain separate from Life's local credentials."
      />
      {oauth.success && status.success && (
        <p
          role="status"
          className={`mb-5 border border-dashed p-4 text-sm ${status.data === 'connected' ? 'border-primary text-primary' : 'border-danger text-danger'}`}
        >
          {status.data === 'connected'
            ? `${enumLabel(oauth.data)} connected. You can sync it now.`
            : `${enumLabel(oauth.data)} authorization did not complete. No provider secret was included in this redirect.`}
        </p>
      )}
      <ConnectorList connectors={connectors} timezone={owner.timezone} />
    </div>
  );
}
