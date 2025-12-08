'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PromptProps = {
  value: string;
  label?: string;
  className?: string;
};

export function Prompt({ value, label = 'Prompt', className }: PromptProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('Copy failed', error);
    }
  };

  return (
    <div className={cn('not-prose my-8 rounded-lg border border-border bg-muted/70 shadow-sm', className)}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2 text-xs">
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy
            </>
          )}
        </Button>
      </div>
      <div className="p-4 pt-3">
        <pre
          className="m-0 whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-foreground"
          style={{
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace',
          }}
        >
          {value}
        </pre>
      </div>
    </div>
  );
}


