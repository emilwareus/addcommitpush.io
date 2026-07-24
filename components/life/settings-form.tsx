'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ownerSchema, updateOwnerRequestSchema, type Owner } from '@/lib/life/contracts';

const fieldClass =
  'h-10 w-full border border-dashed border-border bg-input px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30';

export function SettingsForm({ owner }: { owner: Owner }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const form = new FormData(event.currentTarget);
      const input = updateOwnerRequestSchema.parse({
        display_name: String(form.get('display_name')),
        timezone: String(form.get('timezone')),
        locale: String(form.get('locale')),
        profile_markdown: String(form.get('profile_markdown')),
      });
      const response = await fetch('/api/life/owner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error('update_failed');
      ownerSchema.parse(await response.json());
      setMessage('Owner profile saved.');
      router.refresh();
    } catch {
      setMessage('Check the display name, IANA timezone, locale, and profile, then try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-5 border border-dashed border-border bg-card p-5 sm:grid-cols-2 sm:p-6"
    >
      <Field label="Display name">
        <input
          className={fieldClass}
          name="display_name"
          required
          defaultValue={owner.display_name}
        />
      </Field>
      <Field label="IANA timezone">
        <input
          className={fieldClass}
          name="timezone"
          required
          defaultValue={owner.timezone}
          placeholder="Europe/Stockholm"
        />
      </Field>
      <Field label="Locale">
        <input
          className={fieldClass}
          name="locale"
          required
          defaultValue={owner.locale}
          placeholder="en-SE"
        />
      </Field>
      <Field label="Profile Markdown" className="sm:col-span-2">
        <Textarea name="profile_markdown" rows={12} defaultValue={owner.profile_markdown} />
        <p className="mt-2 text-xs leading-5 text-warning">
          This profile is included in model context for relevant agent operations. Treat it as
          private model-bound data.
        </p>
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save profile'}
        </Button>
        {message && (
          <p role="status" className="text-sm text-muted-foreground">
            {message}
          </p>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="section-kicker mb-2 block">{label}</span>
      {children}
    </label>
  );
}
