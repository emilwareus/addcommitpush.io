import { AlertTriangle } from 'lucide-react';

export function LifeErrorPanel({
  title = 'Life could not load this view',
  message = 'The private service returned an error. Retry the request or sign out and back in.',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <section role="alert" className="border border-dashed border-destructive bg-card p-6">
      <AlertTriangle className="h-5 w-5 text-danger" aria-hidden="true" />
      <h1 className="mt-4 font-serif text-2xl font-semibold text-primary">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{message}</p>
    </section>
  );
}
