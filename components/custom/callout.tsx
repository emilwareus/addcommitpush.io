"use client";

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Info, AlertTriangle, Lightbulb, FileText } from 'lucide-react';

const calloutVariants = cva('my-6 p-5 rounded-lg border-l-4 bg-card/50 backdrop-blur', {
  variants: {
    variant: {
      info: 'border-primary text-foreground',
      warning: 'border-yellow-500 text-foreground',
      tip: 'border-green-500 text-foreground',
      note: 'border-accent text-foreground',
    },
  },
  defaultVariants: {
    variant: 'info',
  },
});

const iconMap = {
  info: Info,
  warning: AlertTriangle,
  tip: Lightbulb,
  note: FileText,
};

export interface CalloutProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof calloutVariants> {
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
  const IconComponent = iconMap[variant];

  return (
    <div className={cn(calloutVariants({ variant }), className)} role="note" {...props}>
      <div className="flex items-start gap-3">
        <span className="text-current mt-0.5" aria-hidden="true">
          {icon ?? <IconComponent className="w-5 h-5" />}
        </span>
        <div className="flex-1">
          {title && <h4 className="font-bold mb-2 text-foreground">{title}</h4>}
          <div className="text-muted-foreground leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}
