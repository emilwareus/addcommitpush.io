'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const calloutVariants = cva('my-7 border border-dashed border-border bg-[var(--hover)] p-5', {
  variants: {
    variant: {
      info: 'text-foreground',
      warning: 'text-foreground',
      tip: 'text-foreground',
      note: 'text-foreground',
    },
  },
  defaultVariants: {
    variant: 'info',
  },
});

export interface CalloutProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof calloutVariants> {
  variant?: 'info' | 'warning' | 'tip' | 'note';
  title?: string;
  icon?: React.ReactNode;
}

export function Callout({
  variant = 'info',
  title,
  icon,
  className,
  children,
  ...props
}: CalloutProps) {
  return (
    <div className={cn(calloutVariants({ variant }), className)} role="note" {...props}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-primary" aria-hidden="true">
          {icon ?? '›'}
        </span>
        <div className="flex-1">
          {title && (
            <h4 className="mb-2 font-serif text-lg font-bold uppercase text-primary">{title}</h4>
          )}
          <div className="leading-relaxed text-muted-foreground">{children}</div>
        </div>
      </div>
    </div>
  );
}
