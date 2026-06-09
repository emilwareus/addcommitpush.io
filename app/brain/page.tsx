import type { Metadata } from 'next';
import { Brain } from 'lucide-react';
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

          <InsightBrowser insights={insights} topics={topics} graphDocuments={graphDocuments} />
        </div>
      </div>
    </main>
  );
}
