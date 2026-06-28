import type { Metadata } from 'next';
import { InsightBrowser } from '@/components/brain/insight-browser';
import {
  getAllBrainStatuses,
  getAllBrainTags,
  getAllPublishedBrainNotes,
  getBrainGraphEdges,
} from '@/lib/brain/read-vault';

export const dynamic = 'error';
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Brain | addcommitpush.io',
  description:
    'Raw notes, research traces, source summaries, and post seeds behind addcommitpush.io.',
};

export default function BrainPage() {
  const notes = getAllPublishedBrainNotes();
  const tags = getAllBrainTags();
  const statuses = getAllBrainStatuses();
  const graphEdges = getBrainGraphEdges();

  return (
    <main className="site-container">
      <section className="py-20 sm:py-24">
        <div className="section-kicker mb-8">Second Brain</div>
        <h1 className="display-heading text-[clamp(4rem,12vw,8.5rem)]">Brain</h1>
        <p className="mt-10 max-w-3xl text-[15px] leading-[1.75] text-muted-foreground">
          A working collection of raw notes, linked insights, source summaries, diagrams, tables,
          and post seeds before they become polished writing.
        </p>
      </section>

      <InsightBrowser notes={notes} tags={tags} statuses={statuses} graphEdges={graphEdges} />

      <footer className="mt-16 flex flex-wrap justify-between gap-4 border-t border-dashed border-[var(--hair)] py-10 text-[11.5px] text-muted-foreground">
        <span>{notes.length} published notes</span>
        <span>{graphEdges.length} note links</span>
      </footer>
    </main>
  );
}
