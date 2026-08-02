import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MarkdownInsight } from '@/components/brain/markdown-insight';
import {
  getAllPublishedBrainSlugs,
  getPublishedBrainNoteBySlug,
  getPublishedBrainSlugSet,
} from '@/lib/brain/read-vault';

export const dynamic = 'error';
export const revalidate = false;

interface BrainNotePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return getAllPublishedBrainSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: BrainNotePageProps): Promise<Metadata> {
  const { slug } = await params;
  const note = getPublishedBrainNoteBySlug(slug);

  if (!note) {
    notFound();
  }

  return {
    title: `${note.title} | Brain | addcommitpush.io`,
    description: note.excerpt,
  };
}

export default async function BrainNotePage({ params }: BrainNotePageProps) {
  const { slug } = await params;
  const note = getPublishedBrainNoteBySlug(slug);

  if (!note) {
    notFound();
  }

  return (
    <main className="site-container-narrow py-12">
      <article>
        <Link
          href="/brain"
          className="mb-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-muted-foreground no-underline transition-colors hover:text-primary"
        >
          ← Brain index
        </Link>

        <div className="mb-8 border-b border-dashed border-[var(--hair)] pb-5">
          <p className="break-words font-mono text-xs leading-relaxed text-muted-foreground">
            {note.type}/{note.slug} · {note.status} · tags: {note.tags.join(', ')}
          </p>
        </div>

        <MarkdownInsight
          markdown={note.content}
          publishedSlugs={getPublishedBrainSlugSet()}
          sourceLabel={note.filePath}
        />
      </article>
    </main>
  );
}
