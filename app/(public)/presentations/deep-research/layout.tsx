'use client';

import { PresentationLayout } from '@/components/presentations/shared/presentation-layout';
import { getAllSlides } from '@/lib/presentations/deep-research';

export { useSlideStep } from '@/components/presentations/shared/presentation-layout';

export default function DeepResearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <PresentationLayout basePath="/presentations/deep-research" slides={getAllSlides()}>
      {children}
    </PresentationLayout>
  );
}
