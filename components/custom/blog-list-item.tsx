import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BlogListItemProps extends React.HTMLAttributes<HTMLLIElement> {
  icon?: React.ReactNode;
}

export function BlogListItem({ icon, className, children, ...props }: BlogListItemProps) {
  return (
    <li
      className={cn('my-3 flex items-start gap-3 leading-relaxed text-foreground', className)}
      {...props}
    >
      <span className="mt-0.5 flex-shrink-0 text-primary" aria-hidden="true">
        {icon || '›'}
      </span>
      <span className="flex-1">{children}</span>
    </li>
  );
}
