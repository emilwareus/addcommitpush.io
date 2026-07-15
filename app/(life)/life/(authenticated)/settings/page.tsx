import Link from 'next/link';
import { Database, Plug } from 'lucide-react';
import { LifePageHeader } from '@/components/life/page-header';
import { SettingsForm } from '@/components/life/settings-form';
import { getOwner } from '@/lib/life/queries.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SettingsPage() {
  const owner = await getOwner();
  return (
    <div className="mx-auto max-w-5xl">
      <LifePageHeader
        kicker="Owner controls"
        title="Settings"
        description="Manage the owner profile and the private integrations attached to this Life workspace."
      />
      <SettingsForm owner={owner} />
      <nav className="mt-6 grid gap-4 sm:grid-cols-2" aria-label="Settings sections">
        <SettingsLink
          href="/life/settings/connectors"
          title="Connectors"
          description="Manage GitHub, Linear, Gmail, and sync jobs."
          icon={Plug}
        />
        <SettingsLink
          href="/life/settings/data"
          title="Data and privacy"
          description="Export data or delete the owner graph."
          icon={Database}
        />
      </nav>
    </div>
  );
}

function SettingsLink({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: typeof Plug;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="border border-dashed border-border bg-card p-5 no-underline hover:border-primary"
    >
      <span className="flex items-center gap-2 font-serif text-xl font-semibold text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {title}
      </span>
      <span className="mt-2 block text-sm text-muted-foreground">{description}</span>
    </Link>
  );
}
