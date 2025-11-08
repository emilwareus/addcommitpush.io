import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

export interface BlogListItemProps extends React.HTMLAttributes<HTMLLIElement> {
  icon?: React.ReactNode;
}

export function BlogListItem({ icon, className, children, ...props }: BlogListItemProps) {
  return (
    <li
      className={cn('flex items-start gap-3 text-foreground leading-relaxed my-3', className)}
      {...props}
    >
      <span className="text-secondary mt-1 flex-shrink-0" aria-hidden="true">
        {icon || <ChevronRight className="w-4 h-4" />}
      </span>
      <span className="flex-1">{children}</span>
    </li>
  );
}
