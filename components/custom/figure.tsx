import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface FigureProps extends React.HTMLAttributes<HTMLElement> {
  src: string;
  alt: string;
  caption?: React.ReactNode;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function Figure({
  src,
  alt,
  caption,
  width = 1200,
  height = 630,
  priority = false,
  className,
  ...props
}: FigureProps) {
  return (
    <figure
      className={cn('my-12 overflow-hidden border border-dashed border-border p-2', className)}
      {...props}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="h-auto w-full"
        priority={priority}
      />
      {caption && (
        <figcaption className="mt-3 text-center text-xs text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
