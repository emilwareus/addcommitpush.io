import type { ReactNode } from 'react';

export function SlideShell({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex h-full w-full flex-col items-center justify-center px-8 ${className}`}>
      {children}
    </div>
  );
}

export function Claim({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h2
      data-slide-claim
      className={`mb-10 max-w-5xl text-center text-4xl font-bold leading-tight text-primary neon-glow md:text-5xl ${className}`}
    >
      {children}
    </h2>
  );
}

export function Chip({
  children,
  muted = false,
  secondary = false,
}: {
  children: ReactNode;
  muted?: boolean;
  secondary?: boolean;
}) {
  const classes = secondary
    ? 'border-secondary/35 bg-secondary/10 text-secondary'
    : muted
      ? 'border-border/60 bg-card/70 text-muted-foreground'
      : 'border-primary/35 bg-primary/10 text-primary';

  return (
    <span className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${classes}`}>
      {children}
    </span>
  );
}

export function Arrow() {
  return (
    <div className="flex items-center justify-center text-3xl font-light text-primary/45">
      -&gt;
    </div>
  );
}

export function StageLabel({ children }: { children: ReactNode }) {
  return (
    <div className="font-mono text-sm uppercase tracking-[0.24em] text-primary/70">{children}</div>
  );
}

export function CodeBlock({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <pre
      className={`rounded-lg border border-border/70 bg-zinc-950/80 p-6 text-left font-mono text-lg leading-relaxed text-zinc-100 shadow-lg shadow-black/20 ${className}`}
    >
      <code>{children}</code>
    </pre>
  );
}

export function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      data-source-link
      href={href}
      className="mt-5 inline-flex text-sm font-medium text-muted-foreground underline decoration-primary/40 underline-offset-4 hover:text-primary"
    >
      {children}
    </a>
  );
}
