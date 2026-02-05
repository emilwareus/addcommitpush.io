import { getAllSlideSlugs, getSlideBySlug } from '@/lib/presentations/deep-research';
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
    title: `${slideData.title} — Deep Research Agents`,
    description: 'Deep Research Agents: Architecture Walkthrough — Foo Cafe Malmö, Feb 2026',
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
        const { TitleSlide } = await import('@/components/presentations/deep-research/slides/01-title');
        return <TitleSlide />;
      }
      case '02-group-project': {
        const { GroupProjectSlide } = await import('@/components/presentations/deep-research/slides/02-group-project');
        return <GroupProjectSlide />;
      }
      case '03-the-result': {
        const { TheResultSlide } = await import('@/components/presentations/deep-research/slides/03-the-result');
        return <TheResultSlide />;
      }
      case '04-the-reveal': {
        const { TheRevealSlide } = await import('@/components/presentations/deep-research/slides/04-the-reveal');
        return <TheRevealSlide />;
      }
      case '05-about': {
        const { AboutSlide } = await import('@/components/presentations/deep-research/slides/05-about');
        return <AboutSlide />;
      }
      case '06-audience-poll': {
        const { AudiencePollSlide } = await import('@/components/presentations/deep-research/slides/06-audience-poll');
        return <AudiencePollSlide />;
      }
      case '07-timeline': {
        const { TimelineSlide } = await import('@/components/presentations/deep-research/slides/07-timeline');
        return <TimelineSlide />;
      }
      case '08-cot': {
        const { CotSlide } = await import('@/components/presentations/deep-research/slides/08-cot');
        return <CotSlide />;
      }
      case '09-react': {
        const { ReactSlide } = await import('@/components/presentations/deep-research/slides/09-react');
        return <ReactSlide />;
      }
      case '09-react-demo': {
        const { ReactDemoSlide } = await import('@/components/presentations/deep-research/slides/09-react-demo');
        return <ReactDemoSlide />;
      }
      case '08-storm-intro': {
        const { StormIntroSlide } = await import('@/components/presentations/deep-research/slides/08-storm-intro');
        return <StormIntroSlide />;
      }
      case '09-storm-architecture': {
        const { StormArchitectureSlide } = await import('@/components/presentations/deep-research/slides/09-storm-architecture');
        return <StormArchitectureSlide />;
      }
      case '10-storm-demo': {
        const { StormDemoSlide } = await import('@/components/presentations/deep-research/slides/10-storm-demo');
        return <StormDemoSlide />;
      }
      case '11-limitation': {
        const { LimitationSlide } = await import('@/components/presentations/deep-research/slides/11-limitation');
        return <LimitationSlide />;
      }
      case '12-diffusion-insight': {
        const { DiffusionInsightSlide } = await import('@/components/presentations/deep-research/slides/12-diffusion-insight');
        return <DiffusionInsightSlide />;
      }
      case '13-diffusion-architecture': {
        const { DiffusionArchitectureSlide } = await import('@/components/presentations/deep-research/slides/13-diffusion-architecture');
        return <DiffusionArchitectureSlide />;
      }
      case '14-loop-visualized': {
        const { LoopVisualizedSlide } = await import('@/components/presentations/deep-research/slides/14-loop-visualized');
        return <LoopVisualizedSlide />;
      }
      case '15-parallel-agents': {
        const { ParallelAgentsSlide } = await import('@/components/presentations/deep-research/slides/15-parallel-agents');
        return <ParallelAgentsSlide />;
      }
      case '16-diffusion-demo': {
        const { DiffusionDemoSlide } = await import('@/components/presentations/deep-research/slides/16-diffusion-demo');
        return <DiffusionDemoSlide />;
      }
      case '17-benchmarks': {
        const { BenchmarksSlide } = await import('@/components/presentations/deep-research/slides/17-benchmarks');
        return <BenchmarksSlide />;
      }
      case '18-takeaways': {
        const { TakeawaysSlide } = await import('@/components/presentations/deep-research/slides/18-takeaways');
        return <TakeawaysSlide />;
      }
      case '19-resources': {
        const { ResourcesSlide } = await import('@/components/presentations/deep-research/slides/19-resources');
        return <ResourcesSlide />;
      }
      default:
        notFound();
    }
  })();

  return slideContent;
}
