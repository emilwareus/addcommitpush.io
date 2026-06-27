import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type TerminalCommandProps = {
  children: ReactNode;
  className?: string;
};

export function TerminalCommand({ children, className }: TerminalCommandProps) {
  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap border border-dashed border-border bg-[var(--code)] px-2 py-0.5 align-baseline',
        'font-mono text-sm text-primary',
        className
      )}
    >
      {children}
    </span>
  );
}
