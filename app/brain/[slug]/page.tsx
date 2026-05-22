import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import {
  getAllInsightSlugs,
  getInsightBySlug,
  getRelatedInsights,
  type InsightSourceKind,
} from '@/lib/insights';

export const dynamic = 'error';
export const revalidate = false;

interface BrainInsightPageProps {
  params: Promise<{
    slug: string;
  }>;
}

const sourceKindLabels: Record<InsightSourceKind, string> = {
  paper: 'paper',
  'official-doc': 'official doc',
  'popular-article': 'popular article',
  hn: 'Hacker News',
  'local-case-study': 'local case study',
};

export async function generateStaticParams() {
  return getAllInsightSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: BrainInsightPageProps): Promise<Metadata> {
  const { slug } = await params;
  const insight = getInsightBySlug(slug);

  if (!insight) {
    notFound();
  }

  return {
    title: `${insight.title} | Brain | addcommitpush.io`,
    description: insight.summary,
  };
}

export default async function BrainInsightPage({ params }: BrainInsightPageProps) {
  const { slug } = await params;
  const insight = getInsightBySlug(slug);

  if (!insight) {
    notFound();
  }

  const relatedInsights = getRelatedInsights(insight);

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-12 md:py-20">
        <article className="max-w-5xl mx-auto">
          <Link
            href="/brain"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-10"
          >
            <ArrowLeft className="w-4 h-4" />
            Brain index
          </Link>

          <header className="mb-10 md:mb-14">
            <div className="mb-5 flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-primary/10 px-2.5 py-1 text-primary">
                {insight.status}
              </span>
              <span className="rounded-md border px-2.5 py-1">
                confidence: {insight.confidence}
              </span>
              <span className="rounded-md border px-2.5 py-1">source: {insight.sourceType}</span>
              <span className="rounded-md border px-2.5 py-1">{insight.publishedAt}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-balance mb-6">
              <span className="text-primary neon-glow">{insight.title}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-4xl">
              {insight.summary}
            </p>
          </header>

          <section className="rounded-lg border bg-card p-5 md:p-6 mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-3">
              Working conclusion
            </h2>
            <p className="text-lg leading-relaxed">{insight.conclusion}</p>
          </section>

          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <section className="rounded-lg border bg-card p-5 md:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-3">Problem</h2>
              <p className="leading-relaxed text-muted-foreground">{insight.problem}</p>
            </section>
            <section className="rounded-lg border bg-card p-5 md:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-3">Why it matters</h2>
              <p className="leading-relaxed text-muted-foreground">{insight.whyItMatters}</p>
            </section>
          </div>

          <section className="mb-8" aria-labelledby="evidence">
            <h2 id="evidence" className="text-2xl font-semibold mb-4">
              Evidence
            </h2>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="border-b px-4 py-3 font-semibold">Claim</th>
                    <th className="border-b px-4 py-3 font-semibold">Sources</th>
                    <th className="border-b px-4 py-3 font-semibold">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {insight.evidence.map((evidence) => (
                    <tr key={evidence.claim} className="align-top">
                      <td className="border-b px-4 py-3 font-medium">{evidence.claim}</td>
                      <td className="border-b px-4 py-3 text-muted-foreground">
                        {evidence.sourceTitles.join(', ')}
                      </td>
                      <td className="border-b px-4 py-3 text-muted-foreground">
                        {evidence.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8" aria-labelledby="sources">
            <h2 id="sources" className="text-2xl font-semibold mb-4">
              Sources
            </h2>
            <div className="space-y-3">
              {insight.sources.map((source) => (
                <div
                  key={`${source.title}-${source.url}`}
                  className="rounded-lg border bg-card p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                    >
                      {source.title}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <span className="w-fit rounded-md border px-2.5 py-1 text-xs text-muted-foreground">
                      {sourceKindLabels[source.kind]}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {source.note}
                  </p>
                  {source.localRef && (
                    <p className="mt-3 break-words text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">localRef:</span>{' '}
                      <code className="rounded bg-muted px-1.5 py-0.5">{source.localRef}</code>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <section className="rounded-lg border bg-card p-5 md:p-6" aria-labelledby="caveats">
              <h2 id="caveats" className="text-2xl font-semibold mb-4">
                Caveats
              </h2>
              <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                {insight.caveats.map((caveat) => (
                  <li key={caveat}>{caveat}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border bg-card p-5 md:p-6" aria-labelledby="questions">
              <h2 id="questions" className="text-2xl font-semibold mb-4">
                Open questions
              </h2>
              <div className="space-y-4">
                {insight.openQuestions.map((openQuestion) => (
                  <div key={openQuestion.question}>
                    <h3 className="font-medium">{openQuestion.question}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {openQuestion.whyItMatters}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-lg border bg-card p-5 md:p-6 mb-8" aria-labelledby="links">
            <h2 id="links" className="text-2xl font-semibold mb-4">
              Graph edges
            </h2>
            <dl className="grid gap-5 md:grid-cols-3">
              <div>
                <dt className="text-sm font-medium mb-2">Topics</dt>
                <dd className="flex flex-wrap gap-2">
                  {insight.topics.map((topic) => (
                    <span key={topic} className="rounded-md border px-2.5 py-1 text-xs">
                      {topic}
                    </span>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium mb-2">Used in posts</dt>
                <dd className="text-sm text-muted-foreground">{insight.usedInPosts.join(', ')}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium mb-2">Related insights</dt>
                <dd className="space-y-2">
                  {relatedInsights.map((relatedInsight) => (
                    <Link
                      key={relatedInsight.slug}
                      href={`/brain/${relatedInsight.slug}`}
                      className="block text-sm text-primary hover:underline"
                    >
                      {relatedInsight.title}
                    </Link>
                  ))}
                </dd>
              </div>
            </dl>
          </section>
        </article>
      </div>
    </main>
  );
}
