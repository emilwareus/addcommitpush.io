import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type TerminalProps = {
  children: ReactNode;
  className?: string;
};

export function Terminal({ children, className }: TerminalProps) {
  return (
    <div
      className={cn(
        'not-prose my-8 border border-dashed border-border bg-[var(--hover)]',
        className
      )}
    >
      <div className="p-4">
        <pre className="m-0 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground">
          {children}
        </pre>
      </div>
    </div>
  );
}
