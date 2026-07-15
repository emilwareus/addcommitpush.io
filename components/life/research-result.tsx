import { ExternalLink } from 'lucide-react';
import { EpistemicBadge } from './badges';
import { MarkdownContent } from './markdown-content';
import { MemoryCard } from './memory-card';
import type { ResearchResponse } from '@/lib/life/contracts';

export function ResearchResult({
  result,
  timezone,
}: {
  result: ResearchResponse;
  timezone: string;
}) {
  return (
    <section className="mt-8 space-y-6" aria-live="polite">
      <div className="border border-dashed border-border bg-card p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-border pb-4">
          <h2 className="font-serif text-2xl font-semibold text-primary">Research report</h2>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            Epistemic label <EpistemicBadge status="researched" />
          </span>
        </div>
        <MarkdownContent>{result.report_markdown}</MarkdownContent>
      </div>
      <div className="border border-dashed border-border bg-card p-5 sm:p-6">
        <h2 className="font-serif text-2xl font-semibold text-primary">Sources</h2>
        {result.citations.length > 0 ? (
          <ol className="mt-4 space-y-3">
            {result.citations.map((citation) => (
              <li key={citation.url}>
                <a
                  className="inline-flex items-start gap-2 break-all"
                  href={citation.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {citation.title ?? citation.url}
                  <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            The provider returned no source citations.
          </p>
        )}
      </div>
      <div className="border border-dashed border-border bg-card p-5 sm:p-6">
        <h2 className="font-serif text-2xl font-semibold text-primary">
          Created researched memories
        </h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          These are source-backed researched claims, not statements made by the owner.
        </p>
        {result.memories.length > 0 ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {result.memories.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} timezone={timezone} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            The report did not support a durable claim. This is not an error.
          </p>
        )}
      </div>
    </section>
  );
}
