import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Contradiction } from '@/lib/life/contracts';
import { enumLabel, formatInOwnerTimezone } from '@/lib/life/formatting';

export function ContradictionCard({
  contradiction,
  timezone,
}: {
  contradiction: Contradiction;
  timezone: string;
}) {
  return (
    <article className="border border-dashed border-border bg-card p-5 sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="section-kicker">
            Detected {formatInOwnerTimezone(contradiction.detected_at, timezone)}
          </p>
          <h2 className="mt-2 font-serif text-xl font-semibold text-primary">Memory conflict</h2>
        </div>
        <Badge variant={contradiction.status === 'pending' ? 'destructive' : 'outline'}>
          {enumLabel(contradiction.status)}
        </Badge>
      </header>
      <p className="mt-4 text-sm leading-6 text-foreground">{contradiction.explanation}</p>
      <dl className="mt-4 grid gap-2 text-xs text-muted-foreground">
        <div>
          <dt className="inline font-medium text-foreground">Left: </dt>
          <dd className="inline">{contradiction.left_memory_id}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-foreground">Right: </dt>
          <dd className="inline">{contradiction.right_memory_id}</dd>
        </div>
      </dl>
      {contradiction.resolution_markdown && (
        <p className="mt-4 border-l-2 border-primary pl-3 text-sm">
          {contradiction.resolution_markdown}
        </p>
      )}
      <Link
        href={`/life/contradictions/${contradiction.id}`}
        prefetch={false}
        className="mt-5 inline-flex items-center gap-2 text-sm font-medium"
      >
        Review details <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </Link>
    </article>
  );
}
