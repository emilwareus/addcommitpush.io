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

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <PHProvider>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <div className="site-shell">
        <Navigation />
        {children}
      </div>
    </PHProvider>
  );
}
