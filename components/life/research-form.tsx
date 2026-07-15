'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { ResearchResult } from './research-result';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SENSITIVITIES } from '@/lib/life/constants';
import {
  researchRequestSchema,
  researchResponseSchema,
  type ResearchResponse,
} from '@/lib/life/contracts';
import { enumLabel } from '@/lib/life/formatting';

export function ResearchForm({ timezone }: { timezone: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchResponse | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData(event.currentTarget);
      const input = researchRequestSchema.parse({
        query: String(form.get('query')),
        sensitivity: String(form.get('sensitivity')),
      });
      const response = await fetch('/api/life/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error('research_failed');
      setResult(researchResponseSchema.parse(await response.json()));
    } catch {
      setError('Research could not be completed. Refine the query or try again later.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="border border-dashed border-border bg-card p-5 sm:p-6">
        <label>
          <span className="section-kicker mb-2 block">Explicit research query</span>
          <Textarea
            name="query"
            required
            rows={5}
            placeholder="What should Life research about me?"
          />
        </label>
        <label className="mt-5 block">
          <span className="section-kicker mb-2 block">Sensitivity for stored claims</span>
          <select
            name="sensitivity"
            defaultValue="standard"
            className="h-10 w-full max-w-sm border border-dashed border-border bg-input px-3 text-sm"
          >
            {SENSITIVITIES.map((value) => (
              <option key={value} value={value}>
                {enumLabel(value)}
                {value === 'standard' ? ' — default' : ''}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Private, intimate, and restricted are explicit opt-ins. Profile Markdown is supplied to
          the research agent only to disambiguate the owner. Research never runs from ordinary
          memory search.
        </p>
        <Button className="mt-5" type="submit" disabled={pending}>
          <Search aria-hidden="true" />
          {pending ? 'Researching…' : 'Run research'}
        </Button>
        {error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        )}
      </form>
      {result && <ResearchResult result={result} timezone={timezone} />}
    </>
  );
}
