'use client';

import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PublishedInsight } from '@/lib/insights';
import { cn } from '@/lib/utils';

interface InsightBrowserProps {
  insights: PublishedInsight[];
  topics: string[];
}

function toSearchText(insight: PublishedInsight) {
  return [
    insight.title,
    insight.summary,
    insight.conclusion,
    insight.problem,
    insight.whyItMatters,
    ...insight.topics,
    ...insight.tags,
    ...insight.sources.map((source) => source.title),
    ...insight.evidence.flatMap((evidence) => [
      evidence.claim,
      evidence.detail,
      ...evidence.sourceTitles,
    ]),
  ]
    .join(' ')
    .toLowerCase();
}

export function InsightBrowser({ insights, topics }: InsightBrowserProps) {
  const [query, setQuery] = useState('');
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredInsights = useMemo(() => {
    return insights.filter((insight) => {
      const matchesTopic = !activeTopic || insight.topics.includes(activeTopic);
      const matchesQuery = !normalizedQuery || toSearchText(insight).includes(normalizedQuery);

      return matchesTopic && matchesQuery;
    });
  }, [activeTopic, insights, normalizedQuery]);

  return (
    <section aria-labelledby="brain-insights">
      <div className="mb-5">
        <label htmlFor="brain-search" className="sr-only">
          Search insights
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="brain-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search raw insights, claims, sources..."
            className="h-11 w-full rounded-lg border bg-card pl-10 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2" aria-label="Topic filters">
        <button
          type="button"
          onClick={() => setActiveTopic(null)}
          className={cn(
            'rounded-md border px-2.5 py-1 text-xs transition-colors',
            activeTopic
              ? 'text-muted-foreground hover:border-primary/50 hover:text-foreground'
              : 'border-primary bg-primary/10 text-primary'
          )}
        >
          all
        </button>
        {topics.map((topic) => (
          <button
            key={topic}
            type="button"
            onClick={() =>
              setActiveTopic((currentTopic) => (currentTopic === topic ? null : topic))
            }
            className={cn(
              'rounded-md border px-2.5 py-1 text-xs transition-colors',
              activeTopic === topic
                ? 'border-primary bg-primary/10 text-primary'
                : 'text-muted-foreground hover:border-primary/50 hover:text-foreground'
            )}
          >
            {topic}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 id="brain-insights" className="text-sm font-semibold uppercase tracking-wide">
          Insight traces
        </h2>
        <p className="text-xs text-muted-foreground">
          {filteredInsights.length} / {insights.length}
        </p>
      </div>

      {filteredInsights.length > 0 ? (
        <div className="divide-y rounded-lg border">
          {filteredInsights.map((insight) => (
            <Link
              key={insight.slug}
              href={`/brain/${insight.slug}`}
              className="block p-3 transition-colors hover:bg-muted/30 sm:p-4"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="text-sm font-semibold leading-snug text-balance">{insight.title}</h3>
                <p className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  sources={insight.sources.length} evidence={insight.evidence.length}
                </p>
              </div>

              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {insight.summary}
              </p>

              <p className="mt-2 break-words font-mono text-[11px] leading-relaxed text-muted-foreground">
                topics=[{insight.topics.join(', ')}]
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          No insight traces match this query.
        </div>
      )}
    </section>
  );
}
