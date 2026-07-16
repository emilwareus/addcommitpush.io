'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { searchHitListSchema, type SearchHit } from '@/lib/life/contracts';
import { MemoryCard } from './memory-card';

export function MemorySearch({ timezone }: { timezone: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const response = await fetch('/api/life/memories/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 20 }),
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
      <h2 className="font-serif text-2xl font-semibold text-primary">Search memories</h2>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Find a detail, person, project, or moment you have shared.
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
