import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllSlideSlugs, getSlideBySlug } from '@/lib/presentations/automate';

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
    title: slideData.title,
    robots: { index: false, follow: false },
  };
}

export default async function SlidePage({ params }: { params: Promise<{ slide: string }> }) {
  const { slide } = await params;
  if (!getSlideBySlug(slide)) notFound();

  switch (slide) {
    case '01-title': {
      const { TitleSlide } = await import('@/components/presentations/automate/slides/01-title');
      return <TitleSlide />;
    }
    case '02-what-we-do': {
      const { WhatWeDoSlide } =
        await import('@/components/presentations/automate/slides/02-what-we-do');
      return <WhatWeDoSlide />;
    }
    case '03-what-oaiz-is': {
      const { WhatOaizIsSlide } =
        await import('@/components/presentations/automate/slides/03-what-oaiz-is');
      return <WhatOaizIsSlide />;
    }
    case '04-chat-to-workflow': {
      const { ChatToWorkflowSlide } =
        await import('@/components/presentations/automate/slides/04-chat-to-workflow');
      return <ChatToWorkflowSlide />;
    }
    case '05-agent-fit': {
      const { AgentFitSlide } =
        await import('@/components/presentations/automate/slides/05-agent-fit');
      return <AgentFitSlide />;
    }
    case '06-event-queue': {
      const { EventQueueSlide } =
        await import('@/components/presentations/automate/slides/06-event-queue');
      return <EventQueueSlide />;
    }
    case '07-two-builds': {
      const { TwoBuildsSlide } =
        await import('@/components/presentations/automate/slides/07-two-builds');
      return <TwoBuildsSlide />;
    }
    case '08-live-archive': {
      const { LiveArchiveSlide } =
        await import('@/components/presentations/automate/slides/08-live-archive');
      return <LiveArchiveSlide />;
    }
    case '09-live-colleague': {
      const { LiveColleagueSlide } =
        await import('@/components/presentations/automate/slides/09-live-colleague');
      return <LiveColleagueSlide />;
    }
    case '10-same-blocks': {
      const { SameBlocksSlide } =
        await import('@/components/presentations/automate/slides/10-same-blocks');
      return <SameBlocksSlide />;
    }
    case '11-where-we-are': {
      const { WhereWeAreSlide } =
        await import('@/components/presentations/automate/slides/11-where-we-are');
      return <WhereWeAreSlide />;
    }
    case '12-questions': {
      const { QuestionsSlide } =
        await import('@/components/presentations/automate/slides/12-questions');
      return <QuestionsSlide />;
    }
    default:
      notFound();
  }
}
