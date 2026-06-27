import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type ArticleCodePanelProps = {
  children: ReactNode;
  label?: string;
  className?: string;
  contentClassName?: string;
};

export function ArticleCodePanel({
  children,
  label = 'text',
  className,
  contentClassName,
}: ArticleCodePanelProps) {
  return (
    <figure
      className={cn(
        'article-code-panel not-prose my-8 overflow-hidden border border-dashed border-border bg-[var(--code)]',
        className
      )}
    >
      <figcaption className="border-b border-dashed border-[var(--hair)] px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </figcaption>
      <div className={cn('p-4 text-foreground', contentClassName)}>{children}</div>
    </figure>
  );
}
