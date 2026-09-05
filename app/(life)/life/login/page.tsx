import { redirect } from 'next/navigation';
import { LifeLoginForm } from '@/components/life/login-form';
import { getLifeSession } from '@/lib/life/session.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function safeNextPath(value: string | string[] | undefined): string {
  if (typeof value !== 'string' || value.startsWith('//')) return '/life';
  const parsed = new URL(value, 'https://life.invalid');
  if (
    parsed.origin !== 'https://life.invalid' ||
    (parsed.pathname !== '/life' && !parsed.pathname.startsWith('/life/'))
  ) {
    return '/life';
  }
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export default async function LifeLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const nextPath = safeNextPath((await searchParams).next);
  if (await getLifeSession()) redirect(nextPath);

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-sm border border-dashed border-border bg-card p-7 sm:p-9">
        <p className="section-kicker">Private workspace</p>
        <h1 className="display-heading mt-3 text-5xl normal-case">Life</h1>
        <LifeLoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}
