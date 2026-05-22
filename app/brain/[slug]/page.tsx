import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getAllInsightSlugs, getInsightBySlug, getRelatedInsights } from '@/lib/insights';

export const dynamic = 'error';
export const revalidate = false;

interface BrainInsightPageProps {
  params: Promise<{
    slug: string;
  }>;
}

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
        <article className="max-w-4xl mx-auto">
          <Link
            href="/brain"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-10"
          >
            <ArrowLeft className="w-4 h-4" />
            Brain index
          </Link>

          <header className="mb-8 border-b pb-8">
            <p className="mb-3 break-words font-mono text-xs text-muted-foreground">
              insight/{insight.slug}
            </p>
            <h1 className="mb-5 text-3xl font-semibold leading-tight text-balance md:text-5xl">
              {insight.title}
            </h1>
            <div className="space-y-1 font-mono text-xs leading-relaxed text-muted-foreground">
              <p>status: {insight.status}</p>
              <p>confidence: {insight.confidence}</p>
              <p>source_type: {insight.sourceType}</p>
              <p>created: {insight.publishedAt}</p>
              <p>topics: {insight.topics.join(', ')}</p>
              <p>tags: {insight.tags.join(', ')}</p>
              <p>used_in: {insight.usedInPosts.join(', ')}</p>
            </div>
          </header>

          <section className="mb-10 space-y-5 border-b pb-8" aria-labelledby="raw-note">
            <h2 id="raw-note" className="font-mono text-xs uppercase tracking-wide">
              raw note
            </h2>
            <div className="space-y-4 text-sm leading-relaxed">
              <p>
                <span className="font-mono text-xs text-muted-foreground">summary: </span>
                {insight.summary}
              </p>
              <p>
                <span className="font-mono text-xs text-muted-foreground">
                  current_conclusion:{' '}
                </span>
                {insight.conclusion}
              </p>
              <p>
                <span className="font-mono text-xs text-muted-foreground">problem: </span>
                {insight.problem}
              </p>
              <p>
                <span className="font-mono text-xs text-muted-foreground">why_it_matters: </span>
                {insight.whyItMatters}
              </p>
            </div>
          </section>

          <section className="mb-8" aria-labelledby="evidence">
            <h2 id="evidence" className="mb-3 font-mono text-xs uppercase tracking-wide">
              evidence
            </h2>
            <ol className="border-t">
              {insight.evidence.map((evidence, index) => (
                <li key={evidence.claim} className="border-b py-4">
                  <p className="font-mono text-xs text-muted-foreground">[{index + 1}] claim</p>
                  <p className="mt-1 text-sm leading-relaxed">{evidence.claim}</p>
                  <p className="mt-2 break-words font-mono text-xs leading-relaxed text-muted-foreground">
                    sources: {evidence.sourceTitles.join(', ')}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {evidence.detail}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section className="mb-8" aria-labelledby="sources">
            <h2 id="sources" className="mb-3 font-mono text-xs uppercase tracking-wide">
              sources
            </h2>
            <ol className="border-t">
              {insight.sources.map((source, index) => (
                <li key={`${source.title}-${source.url}`} className="border-b py-4">
                  <p className="font-mono text-xs text-muted-foreground">
                    [{index + 1}] {source.kind}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline underline-offset-4"
                    >
                      {source.title}
                    </a>
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {source.note}
                  </p>
                  <p className="mt-2 break-words font-mono text-xs leading-relaxed text-muted-foreground">
                    url: {source.url}
                  </p>
                  {source.localRef && (
                    <p className="mt-1 break-words font-mono text-xs leading-relaxed text-muted-foreground">
                      local_ref: {source.localRef}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section className="mb-8" aria-labelledby="caveats">
            <h2 id="caveats" className="mb-3 font-mono text-xs uppercase tracking-wide">
              caveats
            </h2>
            <ul className="border-t text-sm leading-relaxed text-muted-foreground">
              {insight.caveats.map((caveat) => (
                <li key={caveat} className="border-b py-3">
                  {caveat}
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-8" aria-labelledby="questions">
            <h2 id="questions" className="mb-3 font-mono text-xs uppercase tracking-wide">
              open questions
            </h2>
            <ol className="border-t">
              {insight.openQuestions.map((openQuestion, index) => (
                <li key={openQuestion.question} className="border-b py-4">
                  <p className="font-mono text-xs text-muted-foreground">[{index + 1}] question</p>
                  <p className="mt-1 text-sm leading-relaxed">{openQuestion.question}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {openQuestion.whyItMatters}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section className="mb-8 border-t pt-5" aria-labelledby="links">
            <h2 id="links" className="mb-3 font-mono text-xs uppercase tracking-wide">
              graph edges
            </h2>
            <dl className="grid gap-4 text-sm md:grid-cols-3">
              <div>
                <dt className="mb-1 font-mono text-xs text-muted-foreground">topics</dt>
                <dd>{insight.topics.join(', ')}</dd>
              </div>
              <div>
                <dt className="mb-1 font-mono text-xs text-muted-foreground">used_in</dt>
                <dd>{insight.usedInPosts.join(', ')}</dd>
              </div>
              <div>
                <dt className="mb-1 font-mono text-xs text-muted-foreground">related</dt>
                <dd className="space-y-2">
                  {relatedInsights.map((relatedInsight) => (
                    <Link
                      key={relatedInsight.slug}
                      href={`/brain/${relatedInsight.slug}`}
                      className="block text-primary underline underline-offset-4"
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
