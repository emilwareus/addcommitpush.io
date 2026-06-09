'use client';

import { PresentationLayout } from '@/components/presentations/shared/presentation-layout';
import { getAllSlides } from '@/lib/presentations/write-code-ai-agents-love';

export { useSlideStep } from '@/components/presentations/shared/presentation-layout';

export default function WriteCodeAiAgentsLoveLayout({ children }: { children: React.ReactNode }) {
  return (
    <PresentationLayout basePath="/presentations/write-code-ai-agents-love" slides={getAllSlides()}>
      {children}
    </PresentationLayout>
  );
}
