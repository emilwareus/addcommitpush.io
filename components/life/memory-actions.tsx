'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { memorySchema, type Memory } from '@/lib/life/contracts';
import { MemoryForm } from './memory-form';

export function MemoryActions({ memory, timezone }: { memory: Memory; timezone: string }) {
  const router = useRouter();
  const [revising, setRevising] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retract() {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/life/memories/${memory.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'retract' }),
    });
    if (!response.ok) {
      setPending(false);
      setError('The retraction could not be appended.');
      return;
    }
    const revision = memorySchema.safeParse(await response.json());
    if (!revision.success) {
      setPending(false);
      setError('Life returned an invalid retraction response.');
      return;
    }
    router.push(`/life/memories/${revision.data.id}`);
    router.refresh();
  }

  return (
    <section className="mt-8 border border-dashed border-border bg-card p-5 sm:p-6">
      <h2 className="font-serif text-2xl font-semibold text-primary">Append-only changes</h2>
      {!revising && !confirming && (
        <div className="mt-5 flex gap-3">
          <Button onClick={() => setRevising(true)}>Revise</Button>
          <Button variant="destructive" onClick={() => setConfirming(true)}>
            Retract
          </Button>
        </div>
      )}
      {revising && (
        <div className="mt-6">
          <MemoryForm memory={memory} timezone={timezone} onCancel={() => setRevising(false)} />
        </div>
      )}
      {confirming && (
        <div className="mt-5 border border-dashed border-destructive p-4">
          <p className="text-sm leading-6">
            Retraction appends a new retraction revision. It does not hard-delete history.
          </p>
          <div className="mt-4 flex gap-3">
            <Button variant="destructive" onClick={retract} disabled={pending}>
              {pending ? 'Retracting…' : 'Confirm retraction'}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
