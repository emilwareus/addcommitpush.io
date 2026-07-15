'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DEFAULT_SEARCH_SENSITIVITIES, SENSITIVITIES } from '@/lib/life/constants';
import { searchHitListSchema, type SearchHit } from '@/lib/life/contracts';
import { enumLabel } from '@/lib/life/formatting';
import { MemoryCard } from './memory-card';

export function MemorySearch({ timezone }: { timezone: string }) {
  const [query, setQuery] = useState('');
  const [sensitivities, setSensitivities] = useState<string[]>([...DEFAULT_SEARCH_SENSITIVITIES]);
  const [results, setResults] = useState<SearchHit[] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSensitivity(value: string) {
    setSensitivities((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sensitivities.length === 0) {
      setError('Select at least one sensitivity.');
      return;
    }
    setPending(true);
    setError(null);
    const response = await fetch('/api/life/memories/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 20, sensitivities }),
    });
    if (!response.ok) {
      setPending(false);
      setError('Search could not be completed.');
      return;
    }
    const parsed = searchHitListSchema.safeParse(await response.json());
    if (!parsed.success) {
      setPending(false);
      setError('Search returned an invalid response.');
      return;
    }
    setResults(parsed.data);
    setPending(false);
  }

  return (
    <section className="border border-dashed border-border bg-card p-5 sm:p-6">
      <h2 className="font-serif text-2xl font-semibold text-primary">Hybrid search</h2>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Search text stays out of the URL and browser history. Rank is retrieval ordering, not
        confidence.
      </p>
      <form onSubmit={submit} className="mt-5">
        <div className="flex gap-2">
          <input
            type="search"
            required
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 min-w-0 flex-1 border border-dashed border-border bg-input px-3 text-sm outline-none focus:border-primary"
            placeholder="Search Life memory"
          />
          <Button type="submit" disabled={pending}>
            <Search aria-hidden="true" />
            {pending ? 'Searching…' : 'Search'}
          </Button>
        </div>
        <fieldset className="mt-4">
          <legend className="section-kicker">Sensitivity scope</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {SENSITIVITIES.map((value) => (
              <label key={value} className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={sensitivities.includes(value)}
                  onChange={() => toggleSensitivity(value)}
                />
                {enumLabel(value)}
                {(value === 'intimate' || value === 'restricted') && ' (explicit opt-in)'}
              </label>
            ))}
          </div>
        </fieldset>
      </form>
      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
      {results && (
        <div className="mt-6 space-y-4">
          {results.map((hit) => (
            <MemoryCard key={hit.id} memory={hit} timezone={timezone} score={hit.score} />
          ))}
          {results.length === 0 && (
            <p className="text-sm text-muted-foreground">No matching memories.</p>
          )}
        </div>
      )}
    </section>
  );
}
