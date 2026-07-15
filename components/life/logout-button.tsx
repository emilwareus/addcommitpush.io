'use client';

import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function LifeLogoutButton({ compact = false }: { compact?: boolean }) {
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    const response = await fetch('/api/life/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (response.ok) window.location.assign('/life/login');
    else setPending(false);
  }

  return (
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
  );
}
