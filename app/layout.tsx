import type React from 'react';
import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import { Navigation } from '@/components/navigation';
import { PHProvider } from './providers';
import { PostHogPageView } from './posthog-pageview';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'addcommitpush.io - Emil Wåreus',
    template: '%s | addcommitpush.io',
  },
  description:
    'Tech blog by Emil Wåreus. Head of Engineering and Research. Writing about machine learning, data engineering, leadership, and startups.',
  icons: {
    icon: [{ url: '/icon' }],
    apple: [{ url: '/apple-icon' }],
  },
  openGraph: {
    title: 'addcommitpush.io - Emil Wåreus',
    description:
      'Tech blog by Emil Wåreus. Head of Engineering and Research. Writing about machine learning, data engineering, leadership, and startups.',
    siteName: 'addcommitpush.io',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'addcommitpush.io - Emil Wåreus',
    description:
      'Tech blog by Emil Wåreus. Head of Engineering and Research. Writing about machine learning, data engineering, leadership, and startups.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${spaceGrotesk.className} font-sans antialiased`}>
        <PHProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          <div className="min-h-screen grid-bg">
            <Navigation />
            {children}
          </div>
        </PHProvider>
      </body>
    </html>
  );
}
