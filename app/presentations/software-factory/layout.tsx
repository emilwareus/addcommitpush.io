'use client';

import { PresentationLayout } from '@/components/presentations/shared/presentation-layout';
import { getAllSlides } from '@/lib/presentations/software-factory';

export default function SoftwareFactoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <PresentationLayout basePath="/presentations/software-factory" slides={getAllSlides()}>
      {children}
    </PresentationLayout>
  );
}
