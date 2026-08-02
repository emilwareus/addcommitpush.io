'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { KeyRound, RefreshCw, RotateCcw, Unplug } from 'lucide-react';
import { JobStatusBadge } from './job-status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  connectorViewSchema,
  ingestionJobViewSchema,
  type ConnectorView,
  type IngestionJobView,
} from '@/lib/life/contracts';
import { CONNECTOR_PROVIDERS } from '@/lib/life/constants';
import { enumLabel, formatInOwnerTimezone } from '@/lib/life/formatting';

type Provider = (typeof CONNECTOR_PROVIDERS)[number];
type ConfirmAction = 'reset' | 'revoke' | null;

const fieldClassName =
  'h-11 w-full border border-dashed border-border bg-input px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30';

async function jobFetcher(url: string): Promise<IngestionJobView> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('job_request_failed');
  return ingestionJobViewSchema.parse(await response.json());
}

async function jsonMutation(url: string, method: 'POST' | 'PATCH' | 'DELETE', body: unknown) {
  return fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function toConnectorView(connector: ConnectorView): ConnectorView {
  return connectorViewSchema.parse(connector);
}

export function ConnectorList({
  connectors,
  timezone,
}: {
  connectors: ConnectorView[];
  timezone: string;
}) {
  return (
    <div className="grid gap-8">
      {CONNECTOR_PROVIDERS.map((provider) => {
        const providerConnectors = connectors.filter((connector) => connector.provider === provider);
        return (
          <section key={provider} className="grid gap-4">
            <header>
              <h2 className="font-serif text-2xl font-semibold text-primary">
                {enumLabel(provider)}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {providerHelp(provider)} You can add multiple accounts.
              </p>
            </header>
            <div className="grid gap-4 xl:grid-cols-2">
              {providerConnectors.map((connector) => (
                <ConnectorCard
                  key={connector.id}
                  connector={toConnectorView(connector)}
                  timezone={timezone}
                />
              ))}
              <AddConnectorCard provider={provider} />
            </div>
          </section>
        );
      })}
    </div>
  );
}

function providerHelp(provider: Provider): string {
  switch (provider) {
    case 'github':
      return 'Paste a fine-scoped personal access token with read access to your activity.';
    case 'linear':
      return 'Paste a personal API key from Linear settings.';
    case 'slack':
      return 'Paste a bot token (xoxb-…) and invite the bot to channels you want Life to read.';
    case 'email':
      return 'Use IMAP with an app password (Gmail, Fastmail, and similar).';
  }
}

function AddConnectorCard({ provider }: { provider: Provider }) {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [imapHost, setImapHost] = useState(provider === 'email' ? 'imap.gmail.com' : '');
  const [imapPort, setImapPort] = useState('993');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const credential =
        provider === 'email'
          ? {
              type: 'imap' as const,
              username,
              password,
              imap_host: imapHost,
              imap_port: Number(imapPort),
            }
          : { type: 'api_key' as const, api_key: apiKey };
      const response = await jsonMutation('/api/life/connectors', 'POST', {
        provider,
        label,
        credential,
      });
      if (!response.ok) throw new Error('connect_failed');
      setLabel('');
      setApiKey('');
      setUsername('');
      setPassword('');
      router.refresh();
    } catch {
      setError(`The ${enumLabel(provider)} connector could not be added. Check the credentials.`);
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="border border-dashed border-border bg-card p-5 sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-xl font-semibold text-primary">Add account</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Credentials are validated live, encrypted at rest, and never returned to the browser.
          </p>
        </div>
        <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
      </header>
      <form className="mt-5 grid gap-3" onSubmit={submit} autoComplete="off">
        <Field
          id={`${provider}-label`}
          label="Label"
          value={label}
          onChange={setLabel}
          placeholder={provider === 'email' ? 'Personal inbox' : 'Work'}
          required
        />
        {provider === 'email' ? (
          <>
            <Field
              id={`${provider}-username`}
              label="IMAP username"
              value={username}
              onChange={setUsername}
              placeholder="you@example.com"
              required
              autoComplete="username"
            />
            <Field
              id={`${provider}-password`}
              label="App password"
              value={password}
              onChange={setPassword}
              type="password"
              required
              autoComplete="new-password"
            />
            <Field
              id={`${provider}-host`}
              label="IMAP host"
              value={imapHost}
              onChange={setImapHost}
              required
            />
            <Field
              id={`${provider}-port`}
              label="IMAP port"
              value={imapPort}
              onChange={setImapPort}
              required
            />
          </>
        ) : (
          <Field
            id={`${provider}-api-key`}
            label={provider === 'slack' ? 'Bot token' : 'API key'}
            value={apiKey}
            onChange={setApiKey}
            type="password"
            required
            autoComplete="new-password"
            placeholder={provider === 'slack' ? 'xoxb-…' : undefined}
          />
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? 'Validating…' : `Add ${enumLabel(provider)}`}
        </Button>
      </form>
    </article>
  );
}

export function ConnectorCard({
  connector,
  timezone,
}: {
  connector: ConnectorView;
  timezone: string;
}) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [rotateKey, setRotateKey] = useState('');
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

  async function sync() {
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

  async function rotateCredential(event: FormEvent) {
    event.preventDefault();
    setPendingAction('rotate');
    setError(null);
    try {
      if (connector.provider === 'email') {
        setError('Rotate email credentials by revoking and adding the account again.');
        return;
      }
      const response = await jsonMutation(`/api/life/connectors/${connector.id}`, 'PATCH', {
        credential: { type: 'api_key', api_key: rotateKey },
      });
      if (!response.ok) throw new Error('rotate_failed');
      setRotateKey('');
      router.refresh();
    } catch {
      setError('The credential could not be rotated.');
    } finally {
      setPendingAction(null);
    }
  }

  async function confirmDestructiveAction() {
    const action = confirmAction;
    if (!action) return;
    setConfirmAction(null);
    setPendingAction(action);
    setError(null);
    try {
      const response =
        action === 'reset'
          ? await jsonMutation(`/api/life/connectors/${connector.id}/reset-cursor`, 'POST', {
              confirm: 'reset cursor',
            })
          : await jsonMutation(`/api/life/connectors/${connector.id}`, 'DELETE', {
              confirm: 'revoke',
            });
      if (!response.ok) throw new Error('destructive_action_failed');
      setJobId(null);
      router.refresh();
    } catch {
      setError(action === 'reset' ? 'The cursor was not reset.' : 'The connector was not revoked.');
    } finally {
      setPendingAction(null);
    }
  }

  const canSync = ['connected', 'error'].includes(connector.status);

  return (
    <article className="border border-dashed border-border bg-card p-5 sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-xl font-semibold text-primary">{connector.label}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {connector.external_account_name ?? 'Validated account'}
          </p>
        </div>
        <Badge variant={connector.status === 'error' ? 'destructive' : 'outline'}>
          {enumLabel(connector.status)}
        </Badge>
      </header>

      <dl className="mt-5 grid gap-3 text-xs sm:grid-cols-2">
        <Detail
          label="Last sync"
          value={
            connector.last_synced_at
              ? formatInOwnerTimezone(connector.last_synced_at, timezone)
              : 'Never'
          }
        />
        <Detail
          label="Current error"
          value={connector.has_error ? 'A connector error is recorded.' : 'None'}
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
              : 'Cloud sync also runs about every 15 minutes.'}
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

      {connector.provider !== 'email' && connector.status !== 'revoked' && (
        <form className="mt-5 grid gap-2" onSubmit={rotateCredential} autoComplete="off">
          <label htmlFor={`${connector.id}-rotate`} className="section-kicker">
            Rotate API key
          </label>
          <input
            id={`${connector.id}-rotate`}
            type="password"
            value={rotateKey}
            onChange={(event) => setRotateKey(event.target.value)}
            autoComplete="new-password"
            required
            className={fieldClassName}
          />
          <Button type="submit" size="sm" variant="outline" disabled={pendingAction !== null}>
            Save new key
          </Button>
        </form>
      )}

      {(error || pollingError) && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error ?? 'Job status could not be refreshed.'}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {canSync && (
          <Button type="button" variant="outline" onClick={sync} disabled={pendingAction !== null}>
            <RefreshCw aria-hidden="true" /> Sync now
          </Button>
        )}
        {connector.status !== 'revoked' && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmAction('reset')}
              disabled={pendingAction !== null}
            >
              <RotateCcw aria-hidden="true" /> Reset cursor
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmAction('revoke')}
              disabled={pendingAction !== null}
            >
              <Unplug aria-hidden="true" /> Revoke
            </Button>
          </>
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
            aria-labelledby={`${connector.id}-confirm-title`}
            className="max-w-lg border border-dashed border-border bg-background p-6 shadow-xl"
          >
            <h3
              id={`${connector.id}-confirm-title`}
              className="font-serif text-2xl font-semibold text-primary"
            >
              {confirmAction === 'reset' ? 'Reset sync cursor?' : `Revoke ${connector.label}?`}
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {confirmAction === 'reset'
                ? 'The next sync will re-import from the provider’s initial window. Use this only for recovery.'
                : 'Life will erase its local encrypted credentials. Revoke or delete the key at the provider too.'}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirmAction(null)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={confirmDestructiveAction}>
                {confirmAction === 'reset' ? 'Reset cursor' : 'Revoke connector'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="section-kicker mb-2 block">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className={fieldClassName}
      />
    </div>
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
