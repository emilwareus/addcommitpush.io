'use client';

import { LifeErrorPanel } from '@/components/life/error-panel';
import { Button } from '@/components/ui/button';

export default function LifeError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <LifeErrorPanel />
      <div className="mt-5 flex gap-3">
        <Button type="button" onClick={reset}>
          Retry
        </Button>
        <Button type="button" variant="outline" onClick={() => window.location.assign('/life')}>
          Return to Life
        </Button>
      </div>
    </main>
  );
}
