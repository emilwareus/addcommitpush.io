'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ExternalLink, RefreshCw, RotateCcw, Unplug } from 'lucide-react';
import { JobStatusBadge } from './job-status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ingestionJobViewSchema,
  oauthStartResponseSchema,
  type ConnectorView,
  type IngestionJobView,
} from '@/lib/life/contracts';
import { enumLabel, formatInOwnerTimezone } from '@/lib/life/formatting';

type Provider = ConnectorView['provider'];
type ConfirmAction = 'reset' | 'revoke' | null;

async function jobFetcher(url: string): Promise<IngestionJobView> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('job_request_failed');
  return ingestionJobViewSchema.parse(await response.json());
}

async function jsonMutation(url: string, method: 'POST' | 'DELETE', body: unknown) {
  return fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function ConnectorCard({
  provider,
  connector,
  timezone,
}: {
  provider: Provider;
  connector?: ConnectorView;
  timezone: string;
}) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const refreshedJob = useRef<string | null>(null);
  const {
    data: job,
    error: pollingError,
    mutate,
  } = useSWR(jobId ? `/api/life/jobs/${jobId}` : null, jobFetcher, {
    refreshInterval: (latest) =>
      latest?.status === 'completed' || latest?.status === 'failed' ? 0 : 1_500,
    revalidateOnFocus: false,
  });

  useEffect(() => {
    if (job?.status === 'completed' && refreshedJob.current !== job.id) {
      refreshedJob.current = job.id;
      router.refresh();
    }
  }, [job, router]);

  async function connect() {
    setPendingAction('connect');
    setError(null);
    try {
      const response = await jsonMutation(`/api/life/connectors/${provider}/start`, 'POST', {});
      if (!response.ok) throw new Error('connect_failed');
      const started = oauthStartResponseSchema.parse(await response.json());
      window.location.assign(started.authorization_url);
    } catch {
      setError(`The ${enumLabel(provider)} authorization could not be started.`);
      setPendingAction(null);
    }
  }

  async function sync() {
    if (!connector) return;
    setPendingAction('sync');
    setError(null);
    try {
      const response = await jsonMutation(`/api/life/connectors/${connector.id}/sync`, 'POST', {});
      if (!response.ok) throw new Error('sync_failed');
      const nextJob = ingestionJobViewSchema.parse(await response.json());
      setJobId(nextJob.id);
      await mutate(nextJob, {
        revalidate: nextJob.status === 'queued' || nextJob.status === 'running',
      });
    } catch {
      setError('The connector sync could not be queued.');
    } finally {
      setPendingAction(null);
    }
  }

  async function retry() {
    if (!job) return;
    setPendingAction('retry');
    setError(null);
    try {
      const response = await jsonMutation(`/api/life/jobs/${job.id}/retry`, 'POST', {});
      if (!response.ok) throw new Error('retry_failed');
      const retried = ingestionJobViewSchema.parse(await response.json());
      refreshedJob.current = null;
      await mutate(retried, { revalidate: true });
    } catch {
      setError('The failed job could not be retried.');
    } finally {
      setPendingAction(null);
    }
  }

  async function confirmSensitiveAction() {
    if (!connector || !confirmAction) return;
    const action = confirmAction;
    setConfirmAction(null);
    setPendingAction(action);
    setError(null);
    try {
      const response =
        action === 'reset'
          ? await jsonMutation(`/api/life/connectors/${connector.id}/reset-cursor`, 'POST', {
              confirm: 'reset Gmail cursor',
            })
          : await jsonMutation(`/api/life/connectors/${connector.id}`, 'DELETE', {
              confirm: 'revoke',
            });
      if (!response.ok) throw new Error('sensitive_action_failed');
      setJobId(null);
      router.refresh();
    } catch {
      setError(
        action === 'reset' ? 'The Gmail cursor was not reset.' : 'The connector was not revoked.'
      );
    } finally {
      setPendingAction(null);
    }
  }

  const status = connector?.status ?? 'revoked';
  const canSync = connector && ['connected', 'error'].includes(connector.status);

  return (
    <article className="border border-dashed border-border bg-card p-5 sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-primary">{enumLabel(provider)}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {connector?.external_account_name ?? 'No connected account'}
          </p>
        </div>
        <Badge variant={status === 'error' ? 'destructive' : 'outline'}>{enumLabel(status)}</Badge>
      </header>

      <dl className="mt-5 grid gap-3 text-xs sm:grid-cols-2">
        <Detail label="Scopes" value={connector?.scopes.join(', ') || 'None'} />
        <Detail
          label="Token expiry"
          value={
            connector?.token_expires_at
              ? formatInOwnerTimezone(connector.token_expires_at, timezone)
              : 'Not set'
          }
        />
        <Detail
          label="Last sync"
          value={
            connector?.last_synced_at
              ? formatInOwnerTimezone(connector.last_synced_at, timezone)
              : 'Never'
          }
        />
        <Detail
          label="Current error"
          value={connector?.has_error ? 'A connector error is recorded.' : 'None'}
        />
      </dl>

      {job && (
        <div
          className="mt-5 border border-dashed border-border bg-background p-4"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="section-kicker">Sync job</p>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Attempt {job.attempts} ·{' '}
            {job.status === 'failed'
              ? 'The sync failed. You can retry it explicitly.'
              : 'Status updates stop after completion or failure.'}
          </p>
          {job.status === 'failed' && (
            <Button
              className="mt-3"
              size="sm"
              variant="outline"
              onClick={retry}
              disabled={pendingAction !== null}
            >
              <RotateCcw aria-hidden="true" /> Retry failed job
            </Button>
          )}
        </div>
      )}

      {(error || pollingError) && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error ?? 'Job status could not be refreshed.'}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" onClick={connect} disabled={pendingAction !== null}>
          <ExternalLink aria-hidden="true" />
          {connector && connector.status !== 'revoked' ? 'Reconnect' : 'Connect'}
        </Button>
        {canSync && (
          <Button type="button" variant="outline" onClick={sync} disabled={pendingAction !== null}>
            <RefreshCw aria-hidden="true" /> Sync now
          </Button>
        )}
        {provider === 'gmail' && connector && connector.status !== 'revoked' && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmAction('reset')}
            disabled={pendingAction !== null}
          >
            <RotateCcw aria-hidden="true" /> Reset cursor
          </Button>
        )}
        {connector && connector.status !== 'revoked' && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmAction('revoke')}
            disabled={pendingAction !== null}
          >
            <Unplug aria-hidden="true" /> Revoke
          </Button>
        )}
      </div>

      {confirmAction && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-4"
          role="presentation"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`${provider}-confirm-title`}
            className="max-w-lg border border-dashed border-border bg-background p-6 shadow-xl"
          >
            <h3
              id={`${provider}-confirm-title`}
              className="font-serif text-2xl font-semibold text-primary"
            >
              {confirmAction === 'reset'
                ? 'Reset Gmail history cursor?'
                : `Revoke ${enumLabel(provider)}?`}
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {confirmAction === 'reset'
                ? 'The next Gmail sync will use its initial import mode. This is deliberate recovery for an invalid or stale history cursor.'
                : 'Life will erase its local encrypted credentials. This does not revoke the grant at the provider; remove that separately in the provider account.'}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirmAction(null)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={confirmSensitiveAction}>
                {confirmAction === 'reset' ? 'Reset cursor' : 'Revoke connector'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="section-kicker">{label}</dt>
      <dd className="mt-1 break-words text-foreground">{value}</dd>
    </div>
  );
}
