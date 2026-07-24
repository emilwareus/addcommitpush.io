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

export default async function SlidePage({ params }: { params: Promise<{ slide: string }> }) {
  const { slide } = await params;
  const slideData = getSlideBySlug(slide);
  if (!slideData) notFound();

  const slideContent = await (async () => {
    switch (slide) {
      case '01-title': {
        const { TitleSlide } =
          await import('@/components/presentations/voice-agents/slides/01-title');
        return <TitleSlide />;
      }
      case '02-about': {
        const { AboutSlide } =
          await import('@/components/presentations/voice-agents/slides/02-about');
        return <AboutSlide />;
      }
      case '03-the-dream': {
        const { TheDreamSlide } =
          await import('@/components/presentations/voice-agents/slides/03-the-dream');
        return <TheDreamSlide />;
      }
      case '04-architecture-overview': {
        const { ArchitectureOverviewSlide } =
          await import('@/components/presentations/voice-agents/slides/04-architecture-overview');
        return <ArchitectureOverviewSlide />;
      }
      case '05-vad': {
        const { VadSlide } = await import('@/components/presentations/voice-agents/slides/05-vad');
        return <VadSlide />;
      }
      case '06-stt-landscape': {
        const { SttLandscapeSlide } =
          await import('@/components/presentations/voice-agents/slides/06-stt-landscape');
        return <SttLandscapeSlide />;
      }
      case '06b-stt-benchmarks': {
        const { SttBenchmarksSlide } =
          await import('@/components/presentations/voice-agents/slides/06b-stt-benchmarks');
        return <SttBenchmarksSlide />;
      }
      case '07-whisper-deep-dive': {
        const { WhisperDeepDiveSlide } =
          await import('@/components/presentations/voice-agents/slides/07-whisper-deep-dive');
        return <WhisperDeepDiveSlide />;
      }
      case '07b-whisper-innovation': {
        const { WhisperInnovationSlide } =
          await import('@/components/presentations/voice-agents/slides/07b-whisper-innovation');
        return <WhisperInnovationSlide />;
      }
      case '07c-moonshine-deep-dive': {
        const { MoonshineDeepDiveSlide } =
          await import('@/components/presentations/voice-agents/slides/07c-moonshine-deep-dive');
        return <MoonshineDeepDiveSlide />;
      }
      case '07d-moonshine-innovation': {
        const { MoonshineInnovationSlide } =
          await import('@/components/presentations/voice-agents/slides/07d-moonshine-innovation');
        return <MoonshineInnovationSlide />;
      }
      case '08-tts-landscape': {
        const { TtsLandscapeSlide } =
          await import('@/components/presentations/voice-agents/slides/08-tts-landscape');
        return <TtsLandscapeSlide />;
      }
      case '08b-tts-benchmarks': {
        const { TtsBenchmarksSlide } =
          await import('@/components/presentations/voice-agents/slides/08b-tts-benchmarks');
        return <TtsBenchmarksSlide />;
      }
      case '09-kokoro-deep-dive': {
        const { KokoroDeepDiveSlide } =
          await import('@/components/presentations/voice-agents/slides/09-kokoro-deep-dive');
        return <KokoroDeepDiveSlide />;
      }
      case '09b-kokoro-core-ideas': {
        const { KokoroCoreIdeasSlide } =
          await import('@/components/presentations/voice-agents/slides/09b-kokoro-core-ideas');
        return <KokoroCoreIdeasSlide />;
      }
      case '10-realtime-transport': {
        const { RealtimeTransportSlide } =
          await import('@/components/presentations/voice-agents/slides/10-realtime-transport');
        return <RealtimeTransportSlide />;
      }
      case '15-resources': {
        const { ResourcesSlide } =
          await import('@/components/presentations/voice-agents/slides/15-resources');
        return <ResourcesSlide />;
      }
      default:
        notFound();
    }
  })();

  return slideContent;
}
