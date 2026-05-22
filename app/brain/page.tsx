import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Brain, Database, FileText, Hash } from 'lucide-react';
import { getAllInsights, getAllInsightTopics } from '@/lib/insights';

export const dynamic = 'error';
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Brain | addcommitpush.io',
  description:
    'Raw insight traces, source references, caveats, and working conclusions behind addcommitpush.io posts.',
};

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

export default function BrainPage() {
  const insights = getAllInsights();
  const topics = getAllInsightTopics();
  const sourceCount = insights.reduce((total, insight) => total + insight.sources.length, 0);
  const evidenceCount = insights.reduce((total, insight) => total + insight.evidence.length, 0);

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-12 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12 md:mb-16">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 md:mb-8 text-balance">
              <span className="text-primary neon-glow flex items-center gap-4">
                <Brain className="w-10 h-10 md:w-14 md:h-14" />
                Brain
              </span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl text-pretty leading-relaxed">
              Raw insight traces: claims, caveats, source files, and open questions before they
              become polished blog posts.
            </p>
          </div>

          <section className="grid gap-4 md:grid-cols-3 mb-10" aria-label="Brain stats">
            <div className="rounded-lg border bg-card p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Database className="w-4 h-4" />
                Insight nodes
              </div>
              <p className="text-3xl font-semibold">{insights.length}</p>
            </div>
            <div className="rounded-lg border bg-card p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <FileText className="w-4 h-4" />
                Source refs
              </div>
              <p className="text-3xl font-semibold">{sourceCount}</p>
            </div>
            <div className="rounded-lg border bg-card p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Hash className="w-4 h-4" />
                Evidence rows
              </div>
              <p className="text-3xl font-semibold">{evidenceCount}</p>
            </div>
          </section>

          <section className="mb-10" aria-labelledby="brain-topics">
            <h2 id="brain-topics" className="text-sm font-semibold uppercase tracking-wide mb-3">
              Topics
            </h2>
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => (
                <span
                  key={topic}
                  className="rounded-md border px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {topic}
                </span>
              ))}
            </div>
          </section>

          <section className="space-y-4" aria-labelledby="brain-insights">
            <h2 id="brain-insights" className="text-sm font-semibold uppercase tracking-wide">
              Insight traces
            </h2>

            {insights.map((insight) => (
              <Link
                key={insight.slug}
                href={`/brain/${insight.slug}`}
                className="group block rounded-lg border bg-card p-5 transition-colors hover:border-primary/50"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-xl font-semibold text-balance group-hover:text-primary transition-colors">
                      {insight.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {insight.summary}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed">
                      <span className="font-medium">Conclusion:</span> {insight.conclusion}
                    </p>
                  </div>
                  <ArrowRight className="hidden md:block w-5 h-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>

                <div className="mt-5 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md bg-primary/10 px-2.5 py-1 text-primary">
                    {insight.status}
                  </span>
                  <span className="rounded-md border px-2.5 py-1">
                    confidence: {insight.confidence}
                  </span>
                  <span className="rounded-md border px-2.5 py-1">
                    source: {sourceTypeLabels[insight.sourceType]}
                  </span>
                  <span className="rounded-md border px-2.5 py-1">
                    {countLabel(insight.evidence.length, 'evidence row', 'evidence rows')}
                  </span>
                  <span className="rounded-md border px-2.5 py-1">
                    {countLabel(insight.sources.length, 'source', 'sources')}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-xs text-muted-foreground md:grid-cols-2">
                  <p>
                    <span className="font-medium text-foreground">Topics:</span>{' '}
                    {insight.topics.join(', ')}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Used in:</span>{' '}
                    {insight.usedInPosts.join(', ')}
                  </p>
                </div>
              </Link>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
