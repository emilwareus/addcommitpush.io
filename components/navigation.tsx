'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Activity, Cpu, Earth, Menu, X } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';

export function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const links = [
    { href: '/', label: 'Blog', icon: Earth },
    { href: '/about', label: 'About', icon: Cpu },
    { href: '/status', label: 'Status', icon: Activity },
  ];

  return (
    <nav className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
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
            <span className="text-base md:text-xl font-bold text-primary neon-glow">
              <span className="hidden sm:inline">addcommitpush.io</span>
              <span className="sm:hidden">acp.io</span>
            </span>
          </Link>

          <div className="hidden md:flex gap-8">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary',
                    pathname === link.href ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          <button
            className="md:hidden text-muted-foreground hover:text-primary transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-3 border-t border-border/50 pt-4">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 text-base font-medium transition-colors hover:text-primary py-2',
                    pathname === link.href ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
