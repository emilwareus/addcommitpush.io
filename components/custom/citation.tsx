import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CitationProps extends React.HTMLAttributes<HTMLElement> {
  author?: string;
  source?: string;
}

export function Citation({ author, source, className, children, ...props }: CitationProps) {
  return (
    <figure className={cn('my-8', className)} {...props}>
      <blockquote className="border border-dashed border-border px-5 py-4 font-serif text-lg italic leading-relaxed text-primary">
        <p>{children}</p>
      </blockquote>
      {(author || source) && (
        <figcaption className="mt-3 text-sm text-muted-foreground">
          - {author}
          {source && <cite className="ml-2 text-muted-foreground not-italic">({source})</cite>}
        </figcaption>
      )}
    </figure>
  );
}
