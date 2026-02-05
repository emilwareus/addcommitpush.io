'use client';

import { DiffusionOverview } from '@/components/animations/diffusion';

export function DiffusionArchitectureSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <div className="flex items-baseline gap-4 mb-8">
        <h2 className="text-4xl font-bold text-primary">Diffusion Deep Research</h2>
        <span className="text-lg text-muted-foreground font-mono">Google 2025</span>
      </div>

      <DiffusionOverview className="w-full" />

      <p className="mt-8 text-lg text-center px-6 py-3 rounded-lg border border-primary/30 bg-primary/5">
        Loop stops when <span className="text-primary font-semibold neon-glow">EVIDENCE</span> is complete,
        not when draft looks good
      </p>
    </div>
  );
}
