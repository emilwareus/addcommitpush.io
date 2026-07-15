'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { healthMeasurementInputSchema, healthMeasurementSchema } from '@/lib/life/contracts';
import { ownerLocalDateTimeToIso } from '@/lib/life/formatting';

const fieldClass =
  'h-10 w-full border border-dashed border-border bg-input px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30';

export function HealthMeasurementForm({ timezone }: { timezone: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setPending(true);
    setMessage(null);
    try {
      const form = new FormData(formElement);
      const end = String(form.get('ended_at') ?? '').trim();
      const dimensions = JSON.parse(String(form.get('dimensions') ?? '{}')) as unknown;
      const input = healthMeasurementInputSchema.parse({
        metric_code: String(form.get('metric_code')),
        value: Number(form.get('value')),
        unit: String(form.get('unit')),
        measured_at: ownerLocalDateTimeToIso(String(form.get('measured_at')), timezone),
        ended_at: end ? ownerLocalDateTimeToIso(end, timezone) : null,
        dimensions,
      });
      const response = await fetch('/api/life/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error('measurement_failed');
      healthMeasurementSchema.parse(await response.json());
      formElement.reset();
      setMessage('Measurement added.');
      router.refresh();
    } catch {
      setMessage(
        'Check the metric, finite numeric value, unit, time interval, and JSON dimensions.'
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="grid gap-4 border border-dashed border-border bg-card p-5 sm:grid-cols-2 sm:p-6"
    >
      <h2 className="font-serif text-2xl font-semibold text-primary sm:col-span-2">
        Add a manual measurement
      </h2>
      <Field label="Metric code">
        <input
          className={fieldClass}
          name="metric_code"
          required
          placeholder="resting_heart_rate"
        />
      </Field>
      <Field label="Numeric value">
        <input className={fieldClass} name="value" type="number" step="any" required />
      </Field>
      <Field label="Unit">
        <input className={fieldClass} name="unit" required placeholder="bpm" />
      </Field>
      <Field label={`Measured at (${timezone})`}>
        <input className={fieldClass} name="measured_at" type="datetime-local" required />
      </Field>
      <Field label={`Optional end (${timezone})`}>
        <input className={fieldClass} name="ended_at" type="datetime-local" />
      </Field>
      <Field label="JSON dimensions">
        <textarea
          className="min-h-24 w-full border border-dashed border-border bg-input p-3 font-mono text-xs"
          name="dimensions"
          defaultValue="{}"
          required
        />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add measurement'}
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
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="section-kicker mb-2 block">{label}</span>
      {children}
    </label>
  );
}
