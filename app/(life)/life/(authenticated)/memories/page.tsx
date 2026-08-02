import Link from 'next/link';
import { LifePageHeader } from '@/components/life/page-header';
import { MemoryCard } from '@/components/life/memory-card';
import { MemoryForm } from '@/components/life/memory-form';
import { MemorySearch } from '@/components/life/memory-search';
import { getOwner, listMemories } from '@/lib/life/queries.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function first(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export default async function MemoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parameters = await searchParams;
  const offsetValue = Number(first(parameters.offset) ?? '0');
  const offset = Number.isInteger(offsetValue) && offsetValue >= 0 ? offsetValue : 0;
  const [owner, page] = await Promise.all([getOwner(), listMemories({ limit: 24, offset })]);

  return (
    <div className="mx-auto max-w-7xl">
      <LifePageHeader
        kicker="Knowledge"
        title="Memories"
        description="Search what you have shared, browse every memory, or add one by hand."
      />

      <MemorySearch timezone={owner.timezone} />

      <section className="mt-8 border border-dashed border-border p-5 sm:p-6">
        <h2 className="font-serif text-2xl font-semibold text-primary">All memories</h2>
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {page.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} timezone={owner.timezone} />
          ))}
        </div>
        {page.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">No memories yet.</p>
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
          Times are interpreted in {owner.timezone}.
        </p>
        <div className="mt-6">
          <MemoryForm timezone={owner.timezone} />
        </div>
      </details>
    </div>
  );
}
