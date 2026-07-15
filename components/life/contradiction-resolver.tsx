'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  contradictionSchema,
  resolveContradictionRequestSchema,
  type Contradiction,
} from '@/lib/life/contracts';
import { enumLabel } from '@/lib/life/formatting';

const TERMINAL_STATUSES = ['confirmed', 'not_a_contradiction', 'resolved'] as const;

export function ContradictionResolver({ contradiction }: { contradiction: Contradiction }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (contradiction.status !== 'pending')
    return (
      <p className="border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
        This contradiction is terminal: {enumLabel(contradiction.status)}.
      </p>
    );
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const form = new FormData(event.currentTarget);
      const input = resolveContradictionRequestSchema.parse({
        status: String(form.get('status')),
        resolution_markdown: String(form.get('resolution_markdown')),
      });
      const response = await fetch(`/api/life/contradictions/${contradiction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error('resolution_failed');
      contradictionSchema.parse(await response.json());
      setMessage('Resolution recorded.');
      router.refresh();
    } catch {
      setMessage('Choose a supported terminal status and add a non-empty resolution note.');
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="border border-dashed border-border bg-card p-5 sm:p-6">
      <h2 className="font-serif text-2xl font-semibold text-primary">Resolve contradiction</h2>
      <label className="mt-5 block">
        <span className="section-kicker mb-2 block">Terminal status</span>
        <select
          name="status"
          required
          defaultValue="resolved"
          className="h-10 w-full border border-dashed border-border bg-input px-3 text-sm"
        >
          {TERMINAL_STATUSES.map((status) => (
            <option key={status} value={status}>
              {enumLabel(status)}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-5 block">
        <span className="section-kicker mb-2 block">Resolution note</span>
        <Textarea name="resolution_markdown" rows={6} required />
      </label>
      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Recording…' : 'Record resolution'}
        </Button>
        {message && (
          <p role="status" className="text-sm text-muted-foreground">
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
