'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { ThemeSelector } from '@/components/theme-selector';
import { cn } from '@/lib/utils';

const links = [
  { href: '/', label: 'Blog' },
  { href: '/brain', label: 'Brain' },
  { href: '/presentations', label: 'Presentations' },
  { href: '/about', label: 'About' },
  { href: '/status', label: 'Status' },
];

export function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-dashed border-[var(--navbar-border)] bg-[color-mix(in_srgb,var(--navbar)_84%,transparent)] backdrop-blur-md">
      <div className="site-container flex h-16 items-center justify-between gap-6">
        <Link
          href="/"
          className="shrink-0 text-[14.5px] font-semibold text-primary no-underline"
          onClick={() => setMobileMenuOpen(false)}
        >
          addcommitpush<span className="opacity-60">.io</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] no-underline transition-colors',
                isActive(link.href)
                  ? 'font-semibold text-[var(--navbar-active)]'
                  : 'text-[var(--navbar-foreground)] hover:text-[var(--navbar-hover)]'
              )}
            >
              {link.label}
            </Link>
          ))}
          <ThemeSelector />
        </nav>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center border border-dashed border-border text-primary lg:hidden"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="site-container border-t border-dashed border-[var(--navbar-border)] py-4 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'px-1 py-2 text-xs font-medium uppercase tracking-[0.1em] no-underline',
                  isActive(link.href) ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3">
              <ThemeSelector />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
