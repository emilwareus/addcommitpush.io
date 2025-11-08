import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface BlogLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}

export function BlogLink({ href, children, className, external = false, ...props }: BlogLinkProps) {
  const baseClasses = 'font-bold text-primary hover:underline';

  if (external || href.startsWith('http')) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(baseClasses, className)}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={cn(baseClasses, className)} {...props}>
      {children}
    </Link>
  );
}
