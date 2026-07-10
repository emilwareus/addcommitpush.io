import Link from 'next/link';
import { getPostBySlug, getAllSlugs } from '@/lib/posts';
import { feedAlternates } from '@/lib/site';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Fully static: error if dynamic APIs are used
export const dynamic = 'error';
export const revalidate = false;

export async function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found | addcommitpush.io',
    };
  }

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `/blog/${post.slug}`,
      types: feedAlternates,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: new Date(post.publishedAt).toISOString(),
      authors: ['Emil Wåreus'],
      tags: post.tags,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const postContent = await (async (): Promise<{
    content: ReactNode;
    references: ReactNode;
  }> => {
    switch (slug) {
      case 'recruiting-engineers-as-a-startup': {
        const { RecruitingEngineersContent } =
          await import('@/components/blog-posts/recruiting-engineers-as-a-startup');
        return { content: <RecruitingEngineersContent />, references: null };
      }
      case 'saas-zero-to-one-hindsight': {
        const { SaasZeroToOneHindsightContent } =
          await import('@/components/blog-posts/saas-zero-to-one-hindsight');
        return { content: <SaasZeroToOneHindsightContent />, references: null };
      }
      case 'diffusion-deep-research': {
        const { DiffusionDeepResearchContent } =
          await import('@/components/blog-posts/diffusion-deep-research');
        return { content: <DiffusionDeepResearchContent />, references: null };
      }
      case 'context-engineering-claude-code': {
        const { ContextEngineeringClaudeCodeContent } =
          await import('@/components/blog-posts/context-engineering-claude-code');
        return { content: <ContextEngineeringClaudeCodeContent />, references: null };
      }
      case 'write-code-that-ai-agents-love': {
        const { WriteCodeThatAiAgentsLoveContent, WriteCodeThatAiAgentsLoveReferences } =
          await import('@/components/blog-posts/write-code-that-ai-agents-love');
        return {
          content: <WriteCodeThatAiAgentsLoveContent />,
          references: <WriteCodeThatAiAgentsLoveReferences />,
        };
      }
      case 'the-rules-of-vibe-coding': {
        const { TheRulesOfVibeCodingContent } =
          await import('@/components/blog-posts/the-rules-of-vibe-coding');
        return { content: <TheRulesOfVibeCodingContent />, references: null };
      }
      default:
        notFound();
    }
  })();

  return (
    <main className="site-container-narrow">
      <Link
        href="/"
        className="mt-11 inline-flex items-center gap-2 text-xs uppercase tracking-[0.04em] text-muted-foreground no-underline transition-colors hover:text-primary"
      >
        ← Index
      </Link>

      <article className="pt-8">
        <header>
          <h1 className="display-heading text-[clamp(2.35rem,6vw,3.75rem)]">{post.title}</h1>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-b border-dashed border-[var(--hair)] pb-6 text-xs uppercase tracking-[0.04em] text-muted-foreground">
            <time dateTime={post.publishedAt}>
              {new Date(post.publishedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </time>
            <span>·</span>
            <span>{post.readTime}</span>
            {post.tags?.map((tag) => (
              <span key={tag}>· {tag}</span>
            ))}
          </div>
        </header>

        <div className="article-body">{postContent.content}</div>

        <div className="my-12 border border-dashed border-border p-5">
          <div className="font-serif text-lg font-bold uppercase text-primary">Emil Wåreus</div>
          <div className="mt-1 text-xs text-muted-foreground">
            coder, founder, researcher, investor
          </div>
        </div>

        {postContent.references && <div className="article-body">{postContent.references}</div>}
      </article>

      <Link
        href="/"
        className="mb-16 flex items-center justify-center border border-dashed border-border p-4 text-xs uppercase tracking-[0.06em] text-muted-foreground no-underline transition-colors hover:bg-[var(--hover)] hover:text-primary"
      >
        ← All Posts
      </Link>
    </main>
  );
}
