'use client';

import { DraftDenoising } from '@/components/animations/diffusion';

export function LoopVisualizedSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-8">
      <h2 className="text-4xl md:text-5xl font-bold mb-8 text-primary">The Draft Evolves</h2>

      <DraftDenoising className="w-full" />
    </div>
  );
}
