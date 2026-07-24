'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MEMORY_KINDS } from '@/lib/life/constants';
import { memoryInputSchema, memorySchema, type Memory } from '@/lib/life/contracts';
import { enumLabel, isoToOwnerDateTime, ownerLocalDateTimeToIso } from '@/lib/life/formatting';

const fieldClass =
  'h-10 w-full border border-dashed border-border bg-input px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30';

export function MemoryForm({
  timezone,
  memory,
  onCancel,
}: {
  timezone: string;
  memory?: Memory;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      const occurredLocal = String(form.get('occurred_start') ?? '').trim();
      const occurredStart = occurredLocal ? ownerLocalDateTimeToIso(occurredLocal, timezone) : null;
      const input = memoryInputSchema.parse({
        kind: String(form.get('kind')),
        title: String(form.get('title')),
        body_markdown: String(form.get('body_markdown')),
        domain: String(form.get('domain')),
        occurred_start: occurredStart,
        occurred_end: null,
        temporal_precision: occurredStart ? 'minute' : 'unknown',
        epistemic_status: memory?.epistemic_status ?? 'user_stated',
        confidence: memory?.confidence ?? 1,
        importance: memory?.importance ?? 5,
        document_path: memory?.document_path ?? null,
        subject: memory?.subject ?? null,
        predicate: memory?.predicate ?? null,
        object_value: memory?.object_value ?? null,
        source_id: memory?.source_id ?? null,
        source_message_id: memory?.source_message_id ?? null,
        evidence_excerpt: memory?.evidence_excerpt ?? null,
        derived_from_id: memory?.derived_from_id ?? null,
      });
      const response = await fetch(
        memory ? `/api/life/memories/${memory.id}` : '/api/life/memories',
        {
          method: memory ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        }
      );
      if (!response.ok) throw new Error('request_failed');
      const saved = memorySchema.parse(await response.json());
      router.push(`/life/memories/${saved.id}`);
      router.refresh();
    } catch {
      setError('Check the memory details and try again.');
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <Field label="Title" className="sm:col-span-2">
        <input className={fieldClass} name="title" required defaultValue={memory?.title} />
      </Field>
      <Field label="Kind">
        <select className={fieldClass} name="kind" defaultValue={memory?.kind ?? 'fact'}>
          {MEMORY_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {enumLabel(kind)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Domain">
        <input
          className={fieldClass}
          name="domain"
          required
          defaultValue={memory?.domain ?? 'personal'}
        />
      </Field>
      <Field label="Memory" className="sm:col-span-2">
        <Textarea name="body_markdown" required rows={8} defaultValue={memory?.body_markdown} />
      </Field>
      <Field label={`When (${timezone})`} className="sm:col-span-2">
        <input
          className={fieldClass}
          name="occurred_start"
          type="datetime-local"
          defaultValue={
            memory?.occurred_start ? isoToOwnerDateTime(memory.occurred_start, timezone) : ''
          }
        />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-danger sm:col-span-2">
          {error}
        </p>
      )}
      <div className="flex gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : memory ? 'Save revision' : 'Create memory'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
