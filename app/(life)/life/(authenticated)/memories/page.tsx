import Link from 'next/link';
import { LifePageHeader } from '@/components/life/page-header';
import { MemoryCard } from '@/components/life/memory-card';
import { MemoryForm } from '@/components/life/memory-form';
import { MemorySearch } from '@/components/life/memory-search';
import { MEMORY_KINDS, SENSITIVITIES } from '@/lib/life/constants';
import type { Memory } from '@/lib/life/contracts';
import { enumLabel } from '@/lib/life/formatting';
import { getOwner, listMemories } from '@/lib/life/queries.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function first(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function isMemoryKind(value: string | undefined): value is Memory['kind'] {
  return value !== undefined && MEMORY_KINDS.some((kind) => kind === value);
}

function isSensitivity(value: string | undefined): value is Memory['sensitivity'] {
  return value !== undefined && SENSITIVITIES.some((sensitivity) => sensitivity === value);
}

export default async function MemoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parameters = await searchParams;
  const rawKind = first(parameters.kind);
  const kind = isMemoryKind(rawKind) ? rawKind : undefined;
  const domain = first(parameters.domain)?.trim() || undefined;
  const sensitivity = first(parameters.sensitivity);
  const selectedSensitivity = isSensitivity(sensitivity) ? sensitivity : undefined;
  const offsetValue = Number(first(parameters.offset) ?? '0');
  const offset = Number.isInteger(offsetValue) && offsetValue >= 0 ? offsetValue : 0;
  const [owner, page] = await Promise.all([
    getOwner(),
    listMemories({ kind, domain, limit: 24, offset }),
  ]);
  const memories = selectedSensitivity
    ? page.filter((memory) => memory.sensitivity === selectedSensitivity)
    : page;

  return (
    <div className="mx-auto max-w-7xl">
      <LifePageHeader
        kicker="Knowledge"
        title="Memories"
        description="Browse active assertions, run hybrid retrieval, or append a manual memory. Revising and retracting always creates history."
      />

      <MemorySearch timezone={owner.timezone} />

      <section className="mt-8 border border-dashed border-border p-5 sm:p-6">
        <h2 className="font-serif text-2xl font-semibold text-primary">Browse active memory</h2>
        <form method="get" className="mt-5 grid gap-4 sm:grid-cols-4">
          <label>
            <span className="section-kicker mb-2 block">Kind</span>
            <select
              name="kind"
              defaultValue={kind ?? ''}
              className="h-10 w-full border border-dashed border-border bg-input px-3 text-sm"
            >
              <option value="">All kinds</option>
              {MEMORY_KINDS.map((value) => (
                <option key={value} value={value}>
                  {enumLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="section-kicker mb-2 block">Domain</span>
            <input
              name="domain"
              defaultValue={domain}
              className="h-10 w-full border border-dashed border-border bg-input px-3 text-sm"
              placeholder="All domains"
            />
          </label>
          <label>
            <span className="section-kicker mb-2 block">Sensitivity</span>
            <select
              name="sensitivity"
              defaultValue={selectedSensitivity ?? ''}
              className="h-10 w-full border border-dashed border-border bg-input px-3 text-sm"
            >
              <option value="">All on this page</option>
              {SENSITIVITIES.map((value) => (
                <option key={value} value={value}>
                  {enumLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="mt-auto h-10 border border-dashed border-primary bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Apply filters
          </button>
        </form>
        {selectedSensitivity && (
          <p className="mt-3 text-xs text-warning">
            Sensitivity is filtered only across this 24-row page because the backend browse endpoint
            does not support a global sensitivity filter.
          </p>
        )}
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {memories.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} timezone={owner.timezone} />
          ))}
        </div>
        {memories.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">No active memories match this page.</p>
        )}
        <div className="mt-6 flex justify-between">
          {offset > 0 ? (
            <Link href={`/life/memories?offset=${Math.max(0, offset - 24)}`} prefetch={false}>
              Previous page
            </Link>
          ) : (
            <span />
          )}
          {page.length === 24 && (
            <Link href={`/life/memories?offset=${offset + 24}`} prefetch={false}>
              Next page
            </Link>
          )}
        </div>
      </section>

      <details className="mt-8 border border-dashed border-border bg-card p-5 sm:p-6">
        <summary className="cursor-pointer font-serif text-2xl font-semibold text-primary">
          Create a manual memory
        </summary>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Times are interpreted in {owner.timezone}. Intimate and restricted data cross the
          configured model boundary during later agent operations.
        </p>
        <div className="mt-6">
          <MemoryForm timezone={owner.timezone} />
        </div>
      </details>
    </div>
  );
}
