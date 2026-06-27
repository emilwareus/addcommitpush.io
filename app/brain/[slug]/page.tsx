import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MarkdownInsight } from '@/components/brain/markdown-insight';
import { readInsightArticle } from '@/lib/insight-articles';
import {
  getAllBrainGraphDocuments,
  getAllInsightSlugs,
  getInsightBySlug,
  getRelatedInsights,
} from '@/lib/insights';

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

  if (insight.articlePath) {
    const markdown = readInsightArticle(insight.articlePath);

    return (
      <main className="site-container-narrow py-12">
        <article>
          <Link
            href="/brain"
            className="mb-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-muted-foreground no-underline transition-colors hover:text-primary"
          >
            ← Brain index
          </Link>

          <MarkdownInsight markdown={markdown} />
        </article>
      </main>
    );
  }

  const relatedInsights = getRelatedInsights(insight);
  const graphDocuments = getAllBrainGraphDocuments();
  const graphTargets = insight.graph.edges.map((edge) => {
    if (edge.targetType === 'insight') {
      const targetInsight = getInsightBySlug(edge.targetSlug);

      if (!targetInsight) {
        throw new Error(`Unknown graph insight target: ${edge.targetSlug}`);
      }

      return {
        edge,
        title: targetInsight.title,
        href: `/brain/${targetInsight.slug}`,
      };
    }

    const targetDocument = graphDocuments.find((document) => {
      return document.type === edge.targetType && document.slug === edge.targetSlug;
    });

    if (!targetDocument) {
      throw new Error(`Unknown graph document target: ${edge.targetType}:${edge.targetSlug}`);
    }

    return {
      edge,
      title: targetDocument.title,
      href: targetDocument.href,
    };
  });

  return (
    <main className="site-container-narrow py-12">
      <article>
        <Link
          href="/brain"
          className="mb-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-muted-foreground no-underline transition-colors hover:text-primary"
        >
          ← Brain index
        </Link>

        <header className="mb-8">
          <h1 className="display-heading mb-5 text-[clamp(2.4rem,6vw,4rem)]">{insight.title}</h1>
          <p className="break-words font-mono text-xs leading-relaxed text-muted-foreground">
            insight/{insight.slug} · topics: {insight.topics.join(', ')}
          </p>
        </header>

        <div className="mb-12 space-y-10 border-b border-dashed border-[var(--hair)] pb-10">
          {insight.sections.map((section) => (
            <section key={section.heading} className="space-y-4">
              <h2 className="display-heading text-2xl leading-tight text-balance">
                {section.heading}
              </h2>
              <div className="space-y-5 text-base leading-8 md:text-lg">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {section.quote && (
                <blockquote className="border border-dashed border-border px-5 py-4 font-serif text-lg italic leading-relaxed text-primary">
                  <p>&ldquo;{section.quote.text}&rdquo;</p>
                  <footer className="mt-2 font-mono text-xs">
                    {section.quote.sourceTitle}: {section.quote.note}
                  </footer>
                </blockquote>
              )}
            </section>
          ))}
        </div>

        <section className="mb-8" aria-labelledby="evidence">
          <h2 id="evidence" className="display-heading mb-5 text-2xl">
            Evidence Fragments
          </h2>
          <ol className="space-y-7">
            {insight.evidence.map((evidence, index) => (
              <li key={evidence.claim}>
                <h3 className="text-base font-semibold leading-relaxed">
                  {index + 1}. {evidence.claim}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {evidence.detail}
                </p>
                <p className="mt-2 break-words font-mono text-xs leading-relaxed text-muted-foreground">
                  source trace: {evidence.sourceTitles.join(', ')}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-8" aria-labelledby="sources">
          <h2 id="sources" className="display-heading mb-5 text-2xl">
            Sources
          </h2>
          <ol className="space-y-5">
            {insight.sources.map((source, index) => (
              <li key={`${source.title}-${source.url}`}>
                <p className="text-sm leading-relaxed">
                  {index + 1}.{' '}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    {source.title}
                  </a>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{source.note}</p>
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
          <h2 id="caveats" className="display-heading mb-5 text-2xl">
            Caveats
          </h2>
          <ul className="list-disc space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
            {insight.caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </section>

        <section className="mb-8" aria-labelledby="questions">
          <h2 id="questions" className="display-heading mb-5 text-2xl">
            Open Threads
          </h2>
          <ol className="space-y-5">
            {insight.openQuestions.map((openQuestion, index) => (
              <li key={openQuestion.question}>
                <h3 className="text-sm font-semibold leading-relaxed">
                  {index + 1}. {openQuestion.question}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {openQuestion.whyItMatters}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="mb-8 border-t border-dashed border-[var(--hair)] pt-5"
          aria-labelledby="links"
        >
          <h2 id="links" className="display-heading mb-5 text-2xl">
            Links
          </h2>
          <dl className="grid gap-4 text-sm md:grid-cols-3">
            <div>
              <dt className="mb-1 font-semibold">Topics</dt>
              <dd>{insight.topics.join(', ')}</dd>
            </div>
            <div>
              <dt className="mb-1 font-semibold">Used In</dt>
              <dd>{insight.usedInPosts.join(', ')}</dd>
            </div>
            <div>
              <dt className="mb-1 font-semibold">Related</dt>
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

        <section className="mb-8" aria-labelledby="graph">
          <h2 id="graph" className="display-heading mb-5 text-2xl">
            Graph Edges
          </h2>
          <ol className="space-y-5">
            {graphTargets.map(({ edge, href, title }) => (
              <li key={`${edge.targetType}:${edge.targetSlug}:${edge.relation}`}>
                <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                  {edge.relation} · {edge.targetType}/{edge.targetSlug} · strength=
                  {edge.strength}
                </p>
                {href ? (
                  <Link
                    href={href}
                    className="mt-1 block text-sm font-semibold text-primary underline underline-offset-4"
                  >
                    {title}
                  </Link>
                ) : (
                  <p className="mt-1 text-sm font-semibold">{title}</p>
                )}
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{edge.note}</p>
              </li>
            ))}
          </ol>
        </section>
      </article>
    </main>
  );
}
