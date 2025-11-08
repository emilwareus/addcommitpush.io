import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CitationProps extends React.HTMLAttributes<HTMLElement> {
  author?: string;
  source?: string;
}

export function Citation({ author, source, className, children, ...props }: CitationProps) {
  return (
    <figure className={cn('my-8', className)} {...props}>
      <blockquote className="relative pl-6 pr-4 py-4 border-l-4 border-secondary neon-border bg-card/30 rounded-r-lg">
        <p className="text-muted-foreground italic text-lg leading-relaxed">{children}</p>
      </blockquote>
      {(author || source) && (
        <figcaption className="mt-3 pl-6 text-sm text-accent">
          — {author}
          {source && <cite className="ml-2 text-muted-foreground not-italic">({source})</cite>}
        </figcaption>
      )}
    </figure>
  );
}
