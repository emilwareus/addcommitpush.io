import { Badge } from '@/components/ui/badge';
import type { Memory } from '@/lib/life/contracts';
import { enumLabel } from '@/lib/life/formatting';

export function SensitivityBadge({ sensitivity }: { sensitivity: Memory['sensitivity'] }) {
  return (
    <Badge variant={sensitivity === 'restricted' ? 'destructive' : 'outline'}>
      {enumLabel(sensitivity)}
    </Badge>
  );
}

export function EpistemicBadge({ status }: { status: Memory['epistemic_status'] }) {
  return (
    <Badge variant={status === 'disputed' ? 'destructive' : 'outline'}>{enumLabel(status)}</Badge>
  );
}
