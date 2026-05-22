'use client';

import Link from 'next/link';
import { ArrowRight, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PublishedInsight } from '@/lib/insights';
import { cn } from '@/lib/utils';

interface InsightBrowserProps {
  insights: PublishedInsight[];
  topics: string[];
}

const sourceTypeLabels = {
  research: 'research',
  experience: 'experience',
  'case-study': 'case study',
  opinion: 'opinion',
  mixed: 'mixed',
} as const;

function countLabel(count: number, singular: string, plural: string) {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
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
        <div className="grid gap-3 md:grid-cols-2">
          {filteredInsights.map((insight) => (
            <Link
              key={insight.slug}
              href={`/brain/${insight.slug}`}
              className="group flex min-h-48 flex-col rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold leading-snug text-balance group-hover:text-primary transition-colors">
                  {insight.title}
                </h3>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </div>

              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                {insight.summary}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-primary">
                  {insight.status}
                </span>
                <span className="rounded-md border px-2 py-0.5">
                  confidence: {insight.confidence}
                </span>
                <span className="rounded-md border px-2 py-0.5">
                  {sourceTypeLabels[insight.sourceType]}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                {insight.topics.slice(0, 3).map((topic) => (
                  <span key={topic} className="rounded-md border px-2 py-0.5">
                    {topic}
                  </span>
                ))}
              </div>

              <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-4 text-[11px] text-muted-foreground">
                <span>{countLabel(insight.evidence.length, 'evidence row', 'evidence rows')}</span>
                <span>{countLabel(insight.sources.length, 'source', 'sources')}</span>
              </div>
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
