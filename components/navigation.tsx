'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Activity, Cpu, Earth, Menu, X } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';
import { ThemeSelector } from '@/components/theme-selector';

export function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const links = [
    { href: '/', label: 'Blog', icon: Earth },
    { href: '/about', label: 'About', icon: Cpu },
    { href: '/status', label: 'Status', icon: Activity },
  ];

  return (
    <nav
      className="border-b backdrop-blur-sm sticky top-0 z-50"
      style={{
        backgroundColor: 'var(--navbar)',
        borderColor: 'var(--navbar-border)',
        color: 'var(--navbar-foreground)',
      }}
    >
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/code-icon.svg"
              alt="Code Icon"
              width={24}
              height={24}
              className="w-5 h-5 md:w-6 md:h-6"
            />
            <span
              className="text-base md:text-xl font-bold neon-glow"
              style={{ color: 'var(--navbar-active)' }}
            >
              <span className="hidden sm:inline">addcommitpush.io</span>
              <span className="sm:hidden">acp.io</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-2 text-sm font-medium transition-colors',
                    pathname === link.href ? '' : ''
                  )}
                  style={{
                    color:
                      pathname === link.href ? 'var(--navbar-active)' : 'var(--navbar-foreground)',
                  }}
                  onMouseEnter={(e) => {
                    if (pathname !== link.href) {
                      e.currentTarget.style.color = 'var(--navbar-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (pathname !== link.href) {
                      e.currentTarget.style.color = 'var(--navbar-foreground)';
                    }
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
            <ThemeSelector />
          </div>

          <button
            className="md:hidden transition-colors"
            style={{ color: 'var(--navbar-foreground)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--navbar-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--navbar-foreground)';
            }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div
            className="md:hidden mt-4 pb-4 space-y-3 border-t pt-4"
            style={{ borderColor: 'var(--navbar-border)' }}
          >
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 text-base font-medium transition-colors py-2'
                  )}
                  style={{
                    color:
                      pathname === link.href ? 'var(--navbar-active)' : 'var(--navbar-foreground)',
                  }}
                  onMouseEnter={(e) => {
                    if (pathname !== link.href) {
                      e.currentTarget.style.color = 'var(--navbar-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (pathname !== link.href) {
                      e.currentTarget.style.color = 'var(--navbar-foreground)';
                    }
                  }}
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-2">
              <ThemeSelector />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
