import type React from 'react';

export function LifePageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-5 border-b border-dashed border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="section-kicker mb-3">{kicker}</p>
        <h1 className="display-heading text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actions}
    </header>
  );
}
