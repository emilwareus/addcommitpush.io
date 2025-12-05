import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getPostBySlug, getAllSlugs } from '@/lib/posts';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

// Fully static: error if dynamic APIs are used
export const dynamic = 'error';

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
    title: `${post.title} | addcommitpush.io`,
    description: post.description,
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

  // Dynamic content import
  const postContent = await (async () => {
    switch (slug) {
      case 'recruiting-engineers-as-a-startup': {
        const { RecruitingEngineersContent } = await import(
          '@/components/blog-posts/recruiting-engineers-as-a-startup'
        );
        return <RecruitingEngineersContent />;
      }
      case 'saas-zero-to-one-hindsight': {
        const { SaasZeroToOneHindsightContent } = await import(
          '@/components/blog-posts/saas-zero-to-one-hindsight'
        );
        return <SaasZeroToOneHindsightContent />;
      }
      case 'diffusion-deep-research': {
        const { DiffusionDeepResearchContent } = await import(
          '@/components/blog-posts/diffusion-deep-research'
        );
        return <DiffusionDeepResearchContent />;
      }
      case 'context-engineering-claude-code': {
        const { ContextEngineeringClaudeCodeContent } = await import(
          '@/components/blog-posts/context-engineering-claude-code'
        );
        return <ContextEngineeringClaudeCodeContent />;
      }
      default:
        notFound();
    }
  })();

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-12 md:py-20">
        <div className="max-w-3xl mx-auto">
          <Link href="/">
            <Button variant="ghost" className="mb-8 md:mb-12 -ml-2 md:-ml-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Back to Blog</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>

          <article>
            <header className="mb-12 md:mb-16">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 md:mb-8 text-balance leading-tight">
                {post.title}
              </h1>

              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-8">
                <time dateTime={post.publishedAt}>
                  {new Date(post.publishedAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </time>
                <span>·</span>
                <span>{post.readTime}</span>
                <span>·</span>
                <span>Emil Wåreus</span>
              </div>
            </header>

            {postContent}

            <footer className="mt-12 pt-8 border-t border-border">
              <div className="flex flex-wrap gap-2">
                {post.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-sm px-3 py-1">
                    {tag}
                  </Badge>
                ))}
              </div>
            </footer>
          </article>
        </div>
      </div>
    </main>
  );
}
