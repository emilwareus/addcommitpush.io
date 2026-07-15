'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

const fieldClass =
  'h-10 w-full border border-dashed border-border bg-input px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30';

export function OwnerDeletion({ displayName }: { displayName: string }) {
  const [typedName, setTypedName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [showFinalConfirmation, setShowFinalConfirmation] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = typedName === displayName && password.length > 0 && confirmed;

  async function deleteOwner() {
    if (!ready) return;
    setShowFinalConfirmation(false);
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/life/owner', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm_display_name: typedName,
          password,
          confirmed: true,
        }),
      });
      if (response.status !== 204) throw new Error('delete_failed');
      window.location.assign('/life/login');
    } catch {
      setError('Deletion was not completed. Check the exact display name and password.');
      setPending(false);
    }
  }

  return (
    <section className="border border-dashed border-danger bg-card p-5 sm:p-6">
      <p className="section-kicker text-danger">Danger zone</p>
      <h2 className="mt-2 font-serif text-2xl font-semibold text-primary">Delete owner data</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
        This cascades through online PostgreSQL data. Backups, application logs, downloaded exports,
        provider-held data, provider grants, and OpenAI retention follow separate lifecycles and are
        not erased by this action.
      </p>
      <div className="mt-5 grid max-w-xl gap-4">
        <label>
          <span className="section-kicker mb-2 block">Type “{displayName}” exactly</span>
          <input
            className={fieldClass}
            value={typedName}
            onChange={(event) => setTypedName(event.target.value)}
            autoComplete="off"
          />
        </label>
        <label>
          <span className="section-kicker mb-2 block">Fresh Life UI password</span>
          <input
            className={fieldClass}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        <label className="flex items-start gap-3 text-sm leading-6">
          <input
            className="mt-1"
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>
            I understand the online deletion is irreversible and other retention lifecycles are
            separate.
          </span>
        </label>
        <Button
          type="button"
          variant="destructive"
          disabled={!ready || pending}
          onClick={() => setShowFinalConfirmation(true)}
        >
          {pending ? 'Deleting…' : 'Delete owner permanently'}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
      {showFinalConfirmation && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-4"
          role="presentation"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-owner-title"
            className="max-w-lg border border-dashed border-danger bg-background p-6 shadow-xl"
          >
            <h3 id="delete-owner-title" className="font-serif text-2xl font-semibold text-primary">
              Final confirmation
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Delete all online Life data for {displayName} and end this UI session?
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFinalConfirmation(false)}
              >
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={deleteOwner}>
                Delete permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
