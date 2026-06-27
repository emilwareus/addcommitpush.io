import type { Metadata } from 'next';
import { InsightBrowser } from '@/components/brain/insight-browser';
import { getAllBrainGraphDocuments, getAllInsights, getAllInsightTopics } from '@/lib/insights';

export const dynamic = 'error';
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Brain | addcommitpush.io',
  description:
    'Raw insight traces, source references, caveats, and working conclusions behind addcommitpush.io posts.',
};

export default function BrainPage() {
  const insights = getAllInsights();
  const topics = getAllInsightTopics();
  const graphDocuments = getAllBrainGraphDocuments();

  return (
    <main className="site-container">
      <section className="py-20 sm:py-24">
        <div className="section-kicker mb-8">Second Brain</div>
        <h1 className="display-heading text-[clamp(4rem,12vw,8.5rem)]">Brain</h1>
        <p className="mt-10 max-w-3xl text-[15px] leading-[1.75] text-muted-foreground">
          A working collection of links, claims, caveats, source files, graph edges, and rough
          conclusions before they become polished posts.
        </p>
      </section>

      <InsightBrowser insights={insights} topics={topics} graphDocuments={graphDocuments} />

      <footer className="mt-16 flex flex-wrap justify-between gap-4 border-t border-dashed border-[var(--hair)] py-10 text-[11.5px] text-muted-foreground">
        <span>{insights.length} insight traces</span>
        <span>{graphDocuments.length} connected documents</span>
      </footer>
    </main>
  );
}
