import { Badge } from '@/components/ui/badge';
import type { IngestionJob } from '@/lib/life/contracts';
import { enumLabel } from '@/lib/life/formatting';

export function JobStatusBadge({ status }: { status: IngestionJob['status'] }) {
  const variant =
    status === 'failed' ? 'destructive' : status === 'completed' ? 'secondary' : 'outline';
  return <Badge variant={variant}>{enumLabel(status)}</Badge>;
}
