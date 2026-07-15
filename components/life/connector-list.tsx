import { CONNECTOR_PROVIDERS } from '@/lib/life/constants';
import type { Connector, ConnectorView } from '@/lib/life/contracts';
import { ConnectorCard } from './connector-card';

export function ConnectorList({
  connectors,
  timezone,
}: {
  connectors: Connector[];
  timezone: string;
}) {
  const connectorViews: ConnectorView[] = connectors.map((connector) => ({
    id: connector.id,
    provider: connector.provider,
    external_account_name: connector.external_account_name,
    status: connector.status,
    scopes: connector.scopes,
    token_expires_at: connector.token_expires_at,
    last_synced_at: connector.last_synced_at,
    has_error: connector.last_error !== null,
  }));
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {CONNECTOR_PROVIDERS.map((provider) => (
        <ConnectorCard
          key={provider}
          provider={provider}
          connector={connectorViews.find((connector) => connector.provider === provider)}
          timezone={timezone}
        />
      ))}
    </div>
  );
}
