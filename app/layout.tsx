import type React from 'react';
import type { Metadata } from 'next';
import { IBM_Plex_Mono, Spectral } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import { Navigation } from '@/components/navigation';
import { feedAlternates, siteConfig } from '@/lib/site';
import { PHProvider } from './providers';
import { PostHogPageView } from './posthog-pageview';

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

const spectral = Spectral({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: '%s | addcommitpush.io',
  },
  description: siteConfig.description,
  alternates: {
    types: feedAlternates,
  },
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${ibmPlexMono.variable} ${spectral.variable}`}>
        <PHProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          <div className="site-shell">
            <Navigation />
            {children}
          </div>
        </PHProvider>
      </body>
    </html>
  );
}
