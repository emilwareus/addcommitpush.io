import { getAllSlideSlugs, getSlideBySlug } from '@/lib/presentations/voice-agents';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const dynamic = 'error';
export const revalidate = false;

export async function generateStaticParams() {
  return getAllSlideSlugs().map((slide) => ({ slide }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slide: string }>;
}): Promise<Metadata> {
  const { slide } = await params;
  const slideData = getSlideBySlug(slide);
  if (!slideData) return { title: 'Slide Not Found' };

  return {
    title: `${slideData.title} — Building Real-Time Voice Agents`,
    description: 'Building Real-Time Voice Agents — Barrel.ai',
  };
}

export default async function SlidePage({
  params,
}: {
  params: Promise<{ slide: string }>;
}) {
  const { slide } = await params;
  const slideData = getSlideBySlug(slide);
  if (!slideData) notFound();

  const slideContent = await (async () => {
    switch (slide) {
      case '01-title': {
        const { TitleSlide } = await import('@/components/presentations/voice-agents/slides/01-title');
        return <TitleSlide />;
      }
      case '02-about': {
        const { AboutSlide } = await import('@/components/presentations/voice-agents/slides/02-about');
        return <AboutSlide />;
      }
      case '03-the-dream': {
        const { TheDreamSlide } = await import('@/components/presentations/voice-agents/slides/03-the-dream');
        return <TheDreamSlide />;
      }
      case '04-architecture-overview': {
        const { ArchitectureOverviewSlide } = await import('@/components/presentations/voice-agents/slides/04-architecture-overview');
        return <ArchitectureOverviewSlide />;
      }
      case '05-stt-landscape': {
        const { SttLandscapeSlide } = await import('@/components/presentations/voice-agents/slides/05-stt-landscape');
        return <SttLandscapeSlide />;
      }
      case '06-whisper-deep-dive': {
        const { WhisperDeepDiveSlide } = await import('@/components/presentations/voice-agents/slides/06-whisper-deep-dive');
        return <WhisperDeepDiveSlide />;
      }
      case '07-tts-landscape': {
        const { TtsLandscapeSlide } = await import('@/components/presentations/voice-agents/slides/07-tts-landscape');
        return <TtsLandscapeSlide />;
      }
      case '08-kokoro-deep-dive': {
        const { KokoroDeepDiveSlide } = await import('@/components/presentations/voice-agents/slides/08-kokoro-deep-dive');
        return <KokoroDeepDiveSlide />;
      }
      case '09-vad': {
        const { VadSlide } = await import('@/components/presentations/voice-agents/slides/09-vad');
        return <VadSlide />;
      }
      case '10-realtime-transport': {
        const { RealtimeTransportSlide } = await import('@/components/presentations/voice-agents/slides/10-realtime-transport');
        return <RealtimeTransportSlide />;
      }
      case '11-latency-budget': {
        const { LatencyBudgetSlide } = await import('@/components/presentations/voice-agents/slides/11-latency-budget');
        return <LatencyBudgetSlide />;
      }
      case '12-code-walkthrough': {
        const { CodeWalkthroughSlide } = await import('@/components/presentations/voice-agents/slides/12-code-walkthrough');
        return <CodeWalkthroughSlide />;
      }
      case '13-homegrown-vs-api': {
        const { HomegrownVsApiSlide } = await import('@/components/presentations/voice-agents/slides/13-homegrown-vs-api');
        return <HomegrownVsApiSlide />;
      }
      case '14-how-jarvis-works': {
        const { HowJarvisWorksSlide } = await import('@/components/presentations/voice-agents/slides/14-how-jarvis-works');
        return <HowJarvisWorksSlide />;
      }
      case '15-resources': {
        const { ResourcesSlide } = await import('@/components/presentations/voice-agents/slides/15-resources');
        return <ResourcesSlide />;
      }
      default:
        notFound();
    }
  })();

  return slideContent;
}
