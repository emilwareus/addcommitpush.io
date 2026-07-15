'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  reflectionRequestSchema,
  reflectionResponseSchema,
  type Memory,
} from '@/lib/life/contracts';

export function ReflectionAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memory, setMemory] = useState<Memory | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMemory(null);
    try {
      const form = new FormData(event.currentTarget);
      const input = reflectionRequestSchema.parse({
        prompt: String(form.get('prompt')),
        sensitivities: ['standard', 'private'],
        sensitivity: 'private',
      });
      const response = await fetch('/api/life/reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error('reflection_failed');
      setMemory(reflectionResponseSchema.parse(await response.json()).memory);
    } catch {
      setError('The reflection could not be created.');
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="border border-dashed border-border bg-card p-5 sm:p-6 lg:col-span-2">
      <p className="section-kicker">Explicit reflection</p>
      <h2 className="mt-2 font-serif text-2xl font-semibold text-primary">
        Derive a cited perspective
      </h2>
      <form onSubmit={submit} className="mt-4">
        <Textarea
          name="prompt"
          required
          rows={3}
          placeholder="Reflect on a specific theme across my memories…"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            <Sparkles aria-hidden="true" />
            {pending ? 'Reflecting…' : 'Create reflection'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Searches standard/private memory and stores the result as private.
          </p>
        </div>
      </form>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      {memory && (
        <p className="mt-4 text-sm">
          Created{' '}
          <Link href={`/life/memories/${memory.id}`} prefetch={false}>
            {memory.title}
          </Link>
          .
        </p>
      )}
    </section>
  );
}
