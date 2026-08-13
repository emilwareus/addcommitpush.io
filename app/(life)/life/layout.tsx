import type { Metadata } from 'next';
import type React from 'react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Life',
  description: 'Private Life workspace',
  robots: { index: false, follow: false, nocache: true },
};

export default function LifeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen bg-background text-foreground">{children}</div>;
}
