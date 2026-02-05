'use client';

import { ParallelAgents } from '@/components/animations/diffusion';

export function ParallelAgentsSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-4xl md:text-5xl font-bold mb-8 text-primary">Parallel Research, Isolated Contexts</h2>

      <ParallelAgents className="w-full" />

      <p className="mt-8 text-lg text-muted-foreground text-center">
        Why isolated? Independent perspectives. <span className="text-secondary">No cross-contamination.</span>
      </p>
    </div>
  );
}
