'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { PresentationLayout } from '@/components/presentations/shared/presentation-layout';
import { JarvisProvider, useJarvis } from '@/components/presentations/voice-agents/jarvis/jarvis-context';
import { JarvisSidebar } from '@/components/presentations/voice-agents/jarvis/jarvis-sidebar';
import {
  getAllSlides,
  getSlideBySlug,
  getAdjacentSlugs,
  getSlideIndex,
} from '@/lib/presentations/voice-agents';

export { useSlideStep } from '@/components/presentations/shared/presentation-layout';

const slides = getAllSlides();

function SlideContextSync({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { sendSlideContext, isConnected } = useJarvis();

  useEffect(() => {
    if (!isConnected) return;

    const currentSlug = pathname.split('/').pop() ?? '';
    const slide = getSlideBySlug(currentSlug);
    if (!slide) return;

    const adjacent = getAdjacentSlugs(currentSlug);
    const nextSlide = adjacent.next ? getSlideBySlug(adjacent.next) : null;
    const idx = getSlideIndex(currentSlug);

    sendSlideContext({
      current_title: slide.title,
      current_notes: '',
      next_title: nextSlide?.title ?? 'End of presentation',
      remaining: slides.length - idx - 1,
    });
  }, [pathname, isConnected, sendSlideContext]);

  return <>{children}</>;
}

export default function VoiceAgentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <JarvisProvider>
      <SlideContextSync>
        <PresentationLayout
          basePath="/presentations/voice-agents"
          slides={slides}
          sidebar={<JarvisSidebar />}
        >
          {children}
        </PresentationLayout>
      </SlideContextSync>
    </JarvisProvider>
  );
}
