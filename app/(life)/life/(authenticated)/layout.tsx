import type React from 'react';
import { redirect } from 'next/navigation';
import { LifeShell } from '@/components/life/life-shell';
import { LifeSessionError, requireLifeSession } from '@/lib/life/session.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AuthenticatedLifeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  try {
    await requireLifeSession();
  } catch (error) {
    if (error instanceof LifeSessionError) redirect('/life/login');
    throw error;
  }
  return <LifeShell>{children}</LifeShell>;
}
