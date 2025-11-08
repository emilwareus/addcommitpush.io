import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type TerminalProps = {
  children: ReactNode;
  className?: string;
};

export function Terminal({ children, className }: TerminalProps) {
  return (
    <div className={cn('not-prose my-8 rounded-md border border-border bg-muted/70', className)}>
      <div className="p-4">
        <pre
          className="m-0 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground"
          style={{
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace',
          }}
        >
          {children}
        </pre>
      </div>
    </div>
  );
}
