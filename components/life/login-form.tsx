'use client';

import { LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function LifeLoginForm({ nextPath }: { nextPath: string }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/life/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, next: nextPath }),
      });
      if (!response.ok) throw new Error('Sign-in failed.');
      window.location.assign(nextPath);
    } catch {
      setPending(false);
      setError('Sign-in failed.');
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <div>
        <label htmlFor="life-password" className="section-kicker block mb-2">
          Password
        </label>
        <input
          id="life-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-11 w-full border border-dashed border-border bg-input px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        <LockKeyhole aria-hidden="true" />
        {pending ? 'Verifying…' : 'Unlock Life'}
      </Button>
    </form>
  );
}
