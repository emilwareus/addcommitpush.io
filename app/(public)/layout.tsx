import type { Metadata } from 'next';
import type React from 'react';
import { Suspense } from 'react';
import { PostHogPageView } from '@/app/posthog-pageview';
import { PHProvider } from '@/app/providers';
import { Navigation } from '@/components/navigation';
import { feedAlternates, siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: '%s | addcommitpush.io',
  },
  description: siteConfig.description,
  alternates: { types: feedAlternates },
  icons: {
    icon: [{ url: '/icon' }],
    apple: [{ url: '/apple-icon' }],
  },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.name,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: siteConfig.title,
    description: siteConfig.description,
  },
};

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Emil Wåreus',
  url: `${siteConfig.url}/about`,
  jobTitle: 'Head of Engineering and Research',
  sameAs: [
    'https://github.com/emilwareus',
    'https://twitter.com/emilwareus',
    'https://www.linkedin.com/in/emilwareus/',
  ],
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteConfig.name,
  url: siteConfig.url,
  author: {
    '@type': 'Person',
    name: 'Emil Wåreus',
  },
};

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <PHProvider>
        <Suspense fallback={null}>
          <PostHogPageView />
        </Suspense>
        <div className="site-shell">
          <Navigation />
          {children}
        </div>
      </PHProvider>
    </>
  );
}
