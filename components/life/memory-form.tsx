'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  EPISTEMIC_STATUSES,
  MEMORY_KINDS,
  SENSITIVITIES,
  TEMPORAL_PRECISIONS,
} from '@/lib/life/constants';
import { memoryInputSchema, memorySchema, type JsonValue, type Memory } from '@/lib/life/contracts';
import { enumLabel, isoToOwnerDateTime, ownerLocalDateTimeToIso } from '@/lib/life/formatting';

const fieldClass =
  'h-10 w-full border border-dashed border-border bg-input px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30';

function nullableText(form: FormData, name: string): string | null {
  const value = String(form.get(name) ?? '').trim();
  return value || null;
}

function parseObjectValue(value: string): JsonValue | null {
  if (!value.trim()) return null;
  return JSON.parse(value) as unknown as JsonValue;
}

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
      const occurredStart = nullableText(form, 'occurred_start');
      const occurredEnd = nullableText(form, 'occurred_end');
      const input = memoryInputSchema.parse({
        kind: String(form.get('kind')),
        title: String(form.get('title')),
        body_markdown: String(form.get('body_markdown')),
        document_path: nullableText(form, 'document_path'),
        domain: String(form.get('domain')),
        subject: nullableText(form, 'subject'),
        predicate: nullableText(form, 'predicate'),
        object_value: parseObjectValue(String(form.get('object_value') ?? '')),
        epistemic_status: String(form.get('epistemic_status')),
        sensitivity: String(form.get('sensitivity')),
        confidence: Number(form.get('confidence')),
        importance: Number(form.get('importance')),
        occurred_start: occurredStart ? ownerLocalDateTimeToIso(occurredStart, timezone) : null,
        occurred_end: occurredEnd ? ownerLocalDateTimeToIso(occurredEnd, timezone) : null,
        temporal_precision: String(form.get('temporal_precision')),
        source_id: nullableText(form, 'source_id'),
        source_message_id: nullableText(form, 'source_message_id'),
        evidence_excerpt: nullableText(form, 'evidence_excerpt'),
        derived_from_id: nullableText(form, 'derived_from_id'),
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
      setError('Check every field, including JSON and time bounds, then try again.');
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <Field label="Title" className="sm:col-span-2">
        <input className={fieldClass} name="title" required defaultValue={memory?.title} />
      </Field>
      <Field label="Kind">
        <Select name="kind" values={MEMORY_KINDS} defaultValue={memory?.kind ?? 'fact'} />
      </Field>
      <Field label="Domain">
        <input
          className={fieldClass}
          name="domain"
          required
          defaultValue={memory?.domain ?? 'personal'}
        />
      </Field>
      <Field label="Body (Markdown)" className="sm:col-span-2">
        <Textarea name="body_markdown" required rows={8} defaultValue={memory?.body_markdown} />
      </Field>
      <Field label="Sensitivity">
        <Select
          name="sensitivity"
          values={SENSITIVITIES}
          defaultValue={memory?.sensitivity ?? 'private'}
        />
      </Field>
      <Field label="Epistemic status">
        <Select
          name="epistemic_status"
          values={EPISTEMIC_STATUSES}
          defaultValue={memory?.epistemic_status ?? 'user_stated'}
        />
      </Field>
      <Field label="Confidence (0–1)">
        <input
          className={fieldClass}
          name="confidence"
          type="number"
          min="0"
          max="1"
          step="0.01"
          required
          defaultValue={memory?.confidence ?? 1}
        />
      </Field>
      <Field label="Importance (0–10)">
        <input
          className={fieldClass}
          name="importance"
          type="number"
          min="0"
          max="10"
          step="1"
          required
          defaultValue={memory?.importance ?? 5}
        />
      </Field>
      <Field label={`Occurred start (${timezone})`}>
        <input
          className={fieldClass}
          name="occurred_start"
          type="datetime-local"
          defaultValue={
            memory?.occurred_start ? isoToOwnerDateTime(memory.occurred_start, timezone) : ''
          }
        />
      </Field>
      <Field label={`Occurred end (${timezone})`}>
        <input
          className={fieldClass}
          name="occurred_end"
          type="datetime-local"
          defaultValue={
            memory?.occurred_end ? isoToOwnerDateTime(memory.occurred_end, timezone) : ''
          }
        />
      </Field>
      <Field label="Temporal precision">
        <Select
          name="temporal_precision"
          values={TEMPORAL_PRECISIONS}
          defaultValue={memory?.temporal_precision ?? 'unknown'}
        />
      </Field>
      <Field label="Document path">
        <input
          className={fieldClass}
          name="document_path"
          placeholder="notes/example.md"
          defaultValue={memory?.document_path ?? ''}
        />
      </Field>
      <Field label="Subject">
        <input className={fieldClass} name="subject" defaultValue={memory?.subject ?? ''} />
      </Field>
      <Field label="Predicate">
        <input className={fieldClass} name="predicate" defaultValue={memory?.predicate ?? ''} />
      </Field>
      <Field label="Object value (JSON)" className="sm:col-span-2">
        <Textarea
          name="object_value"
          rows={4}
          defaultValue={
            !memory || memory.object_value === null
              ? ''
              : JSON.stringify(memory.object_value, null, 2)
          }
        />
      </Field>
      <details className="border border-dashed border-border p-4 sm:col-span-2">
        <summary className="cursor-pointer text-xs font-medium uppercase tracking-[0.1em] text-primary">
          Provenance fields
        </summary>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Source UUID">
            <input className={fieldClass} name="source_id" defaultValue={memory?.source_id ?? ''} />
          </Field>
          <Field label="Source message UUID">
            <input
              className={fieldClass}
              name="source_message_id"
              defaultValue={memory?.source_message_id ?? ''}
            />
          </Field>
          <Field label="Derived-from UUID">
            <input
              className={fieldClass}
              name="derived_from_id"
              defaultValue={memory?.derived_from_id ?? ''}
            />
          </Field>
          <Field label="Evidence excerpt">
            <Textarea
              name="evidence_excerpt"
              rows={3}
              defaultValue={memory?.evidence_excerpt ?? ''}
            />
          </Field>
        </div>
      </details>
      {error && (
        <p role="alert" className="text-sm text-danger sm:col-span-2">
          {error}
        </p>
      )}
      <div className="flex gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving revision…' : memory ? 'Create revision' : 'Create memory'}
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

function Select<T extends readonly string[]>({
  name,
  values,
  defaultValue,
}: {
  name: string;
  values: T;
  defaultValue: T[number];
}) {
  return (
    <select className={fieldClass} name={name} defaultValue={defaultValue}>
      {values.map((value) => (
        <option key={value} value={value}>
          {enumLabel(value)}
        </option>
      ))}
    </select>
  );
}
