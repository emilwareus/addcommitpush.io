'use client';

import { PresentationLayout } from '@/components/presentations/shared/presentation-layout';
import { getAllSlides } from '@/lib/presentations/voice-agents';

export { useSlideStep } from '@/components/presentations/shared/presentation-layout';

export default function VoiceAgentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PresentationLayout
      basePath="/presentations/voice-agents"
      slides={getAllSlides()}
    >
      {children}
    </PresentationLayout>
  );
}
