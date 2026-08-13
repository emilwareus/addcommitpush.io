import { Badge } from '@/components/ui/badge';
import type { Memory } from '@/lib/life/contracts';
import { enumLabel } from '@/lib/life/formatting';

export function EpistemicBadge({ status }: { status: Memory['epistemic_status'] }) {
  return (
    <Badge variant={status === 'disputed' ? 'destructive' : 'outline'}>{enumLabel(status)}</Badge>
  );
}
