'use client';

import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function LifeLogoutButton({ compact = false }: { compact?: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/life/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!response.ok) throw new Error('Sign-out failed.');
      window.location.assign('/life/login');
    } catch {
      setPending(false);
      setError('Sign-out failed.');
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        size={compact ? 'icon-sm' : 'sm'}
        onClick={logout}
        disabled={pending}
      >
        <LogOut aria-hidden="true" />
        {!compact && (pending ? 'Signing out…' : 'Sign out')}
        {compact && <span className="sr-only">Sign out</span>}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
