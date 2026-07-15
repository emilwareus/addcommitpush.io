import Link from 'next/link';
import type React from 'react';
import {
  BookOpen,
  Clock3,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  LockKeyhole,
  MessagesSquare,
  Mic,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { LifeLogoutButton } from './logout-button';

const links = [
  { href: '/life', label: 'Overview', icon: LayoutDashboard },
  { href: '/life/voice', label: 'Voice', icon: Mic },
  { href: '/life/memories', label: 'Memories', icon: BookOpen },
  { href: '/life/timeline', label: 'Timeline', icon: Clock3 },
  { href: '/life/conversations', label: 'Conversations', icon: MessagesSquare },
  { href: '/life/research', label: 'Research', icon: FlaskConical },
  { href: '/life/health', label: 'Health', icon: HeartPulse },
  { href: '/life/contradictions', label: 'Review', icon: ShieldAlert },
  { href: '/life/settings', label: 'Settings', icon: Settings },
];

export function LifeShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[230px_minmax(0,1fr)]">
      <header className="border-b border-dashed border-border bg-background lg:min-h-screen lg:border-r lg:border-b-0">
        <div className="flex h-16 items-center justify-between px-5 lg:h-auto lg:items-start lg:px-6 lg:py-8">
          <Link href="/life" className="no-underline" prefetch={false}>
            <span className="display-heading text-2xl normal-case">Life</span>
            <span className="ml-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <LockKeyhole className="h-3 w-3" aria-hidden="true" /> Private
            </span>
          </Link>
          <div className="lg:hidden">
            <LifeLogoutButton compact />
          </div>
        </div>
        <nav
          aria-label="Life navigation"
          className="flex overflow-x-auto border-t border-dashed border-border px-3 py-2 lg:flex-col lg:gap-1 lg:border-t-0 lg:px-3 lg:py-2"
        >
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className="inline-flex shrink-0 items-center gap-2 border border-transparent px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground no-underline hover:border-border hover:bg-card hover:text-primary"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden px-6 py-8 lg:block">
          <LifeLogoutButton />
        </div>
      </header>
      <main className="min-w-0 px-4 py-8 sm:px-7 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
