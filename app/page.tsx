import { BlogCard } from '@/components/blog-card';
import { BlogTerminalHero } from '@/components/blog-terminal-hero';
import { getAllPosts } from '@/lib/posts';
import { feedAlternates, siteConfig } from '@/lib/site';
import { Rss } from 'lucide-react';

// Fully static: error if dynamic APIs are used
export const dynamic = 'error';

export const metadata = {
  title: 'addcommitpush.io | Tech, Data, Leadership & Startups',
  description:
    "Emil Wåreus' blog on tech, data, leadership, and startups. Software engineer, founder, researcher, and investor sharing insights on building products, scaling teams, and navigating the startup ecosystem. Every post includes audio narration.",
  keywords: [
    'software engineering',
    'tech blog',
    'startup advice',
    'data engineering',
    'engineering leadership',
    'founder stories',
    'SaaS',
    'recruiting engineers',
    'Emil Wåreus',
  ],
  authors: [{ name: 'Emil Wåreus' }],
  creator: 'Emil Wåreus',
  publisher: 'Emil Wåreus',
  alternates: {
    canonical: siteConfig.url,
    types: feedAlternates,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: 'addcommitpush.io | Tech, Data, Leadership & Startups',
    description:
      "Emil Wåreus' blog on tech, data, leadership, and startups. Software engineer, founder, researcher, and investor sharing insights on building products, scaling teams, and navigating the startup ecosystem.",
  },
  twitter: {
    card: 'summary_large_image',
    title: 'addcommitpush.io | Tech, Data, Leadership & Startups',
    description:
      "Emil Wåreus' blog on tech, data, leadership, and startups. Insights on building products, scaling teams, and navigating the startup ecosystem.",
    creator: '@emilwareus',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function HomePage() {
  const blogPosts = getAllPosts();
  const totalMinutes = blogPosts.reduce((minutes, post) => {
    const [readTime] = post.readTime.split(' ');
    return minutes + Number(readTime);
  }, 0);

  return (
    <main className="site-container">
      <section className="py-16 sm:py-20">
        <BlogTerminalHero />
        <p className="mt-6 max-w-[560px] text-[13.5px] leading-[1.7] text-muted-foreground">
          Notes on tech, data, leadership & startups by Emil Wåreus: coder, founder, researcher,
          investor. Every post ships with audio narration.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-[11px] font-medium uppercase tracking-[0.08em]">
          <a
            href={siteConfig.feeds.rss}
            className="inline-flex items-center gap-2 text-muted-foreground no-underline transition-colors hover:text-primary"
          >
            <Rss className="h-3.5 w-3.5" aria-hidden="true" />
            RSS
          </a>
          <a
            href={siteConfig.feeds.atom}
            className="text-muted-foreground no-underline transition-colors hover:text-primary"
          >
            Atom
          </a>
        </div>
      </section>

      <section className="grid gap-6 pb-14 md:grid-cols-2">
        {blogPosts.map((post) => (
          <BlogCard key={post.slug} post={post} />
        ))}

        <div className="flex min-h-[290px] flex-col items-center justify-center border border-dashed border-[var(--hair)] p-7 text-center">
          <div className="font-serif text-lg italic text-muted-foreground">more soon...</div>
          <div className="mt-3 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
            {blogPosts.length} posts · ~{totalMinutes} min
          </div>
        </div>
      </section>

      <footer className="flex flex-wrap justify-between gap-4 border-t border-dashed border-[var(--hair)] py-10 text-[11.5px] text-muted-foreground">
        <span>© 2026 Emil Wåreus</span>
        <span>add commit push</span>
      </footer>
    </main>
  );
}
