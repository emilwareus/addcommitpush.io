import { BlogCard } from '@/components/blog-card';
import { getAllPosts } from '@/lib/posts';

export const dynamic = 'error';
export const revalidate = false;

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
    canonical: 'https://addcommitpush.io',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://addcommitpush.io',
    siteName: 'addcommitpush.io',
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
  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="mb-16 md:mb-24">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 md:mb-8 text-balance">
              <span className="text-primary neon-glow">[add commit push]</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl text-pretty leading-relaxed">
              Welcome to my trash yard of a blog! My name is Emil, and I&apos;m a sphagetti coder,
              founder, research, and investor. Here I share my thoughts on tech, data, leadership,
              and startups (and maybe even some politics in the future..).
              <br />
              Enjoy!
            </p>
          </div>

          <div className="space-y-8 md:space-y-10">
            {blogPosts.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
