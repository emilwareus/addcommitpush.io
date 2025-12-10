import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const listVariants = cva('my-6 space-y-2', {
  variants: {
    variant: {
      unordered: 'list-none pl-0',
      ordered: 'list-decimal pl-6 marker:text-primary marker:font-bold',
      checklist: 'list-none pl-0',
    },
  },
  defaultVariants: {
    variant: 'unordered',
  },
});

export interface BlogListProps
  extends
    React.HTMLAttributes<HTMLUListElement | HTMLOListElement>,
    VariantProps<typeof listVariants> {
  variant?: 'unordered' | 'ordered' | 'checklist';
}

export function BlogList({ variant = 'unordered', className, children, ...props }: BlogListProps) {
  const Comp = variant === 'ordered' ? 'ol' : 'ul';

  return React.createElement(
    Comp,
    {
      className: cn(listVariants({ variant }), className),
      ...props,
    },
    children
  );
}
