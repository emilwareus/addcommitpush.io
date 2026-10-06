import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllSlideSlugs, getSlideBySlug } from '@/lib/presentations/software-factory';

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
    title: `${slideData.title} - The software factory 0.1`,
    description:
      'How engineering craft gains leverage with AI agents: architecture, checks, workflow and product focus.',
  };
}

export default async function SlidePage({ params }: { params: Promise<{ slide: string }> }) {
  const { slide } = await params;
  const slideData = getSlideBySlug(slide);
  if (!slideData) notFound();

  const slideContent = await (async () => {
    switch (slide) {
      case '00-title': {
        const { TitleSlide } =
          await import('@/components/presentations/software-factory/slides/00-title');
        return <TitleSlide />;
      }
      case '00-who-i-am': {
        const { WhoIAmSlide } =
          await import('@/components/presentations/software-factory/slides/00-who-i-am');
        return <WhoIAmSlide />;
      }
      case '01-old-way': {
        const { OldWaySlide } =
          await import('@/components/presentations/software-factory/slides/01-old-way');
        return <OldWaySlide />;
      }
      case '01-build-the-machine': {
        const { BuildTheMachineSlide } =
          await import('@/components/presentations/software-factory/slides/01-build-the-machine');
        return <BuildTheMachineSlide />;
      }
      case '02-craft': {
        const { CraftSlide } =
          await import('@/components/presentations/software-factory/slides/02-craft');
        return <CraftSlide />;
      }
      case '03-leverage': {
        const { LeverageSlide } =
          await import('@/components/presentations/software-factory/slides/03-leverage');
        return <LeverageSlide />;
      }
      case '03b-question-code': {
        const { CodeQuestionSlide } =
          await import('@/components/presentations/software-factory/slides/part-questions');
        return <CodeQuestionSlide />;
      }
      case '06b-generated-sdks': {
        const { GeneratedSdksSlide } =
          await import('@/components/presentations/software-factory/slides/06b-generated-sdks');
        return <GeneratedSdksSlide />;
      }
      case '06c-question-workflow': {
        const { WorkflowQuestionSlide } =
          await import('@/components/presentations/software-factory/slides/part-questions');
        return <WorkflowQuestionSlide />;
      }
      case '09b-question-product': {
        const { ProductQuestionSlide } =
          await import('@/components/presentations/software-factory/slides/part-questions');
        return <ProductQuestionSlide />;
      }
      case '04-architecture': {
        const { ArchitectureSlide } =
          await import('@/components/presentations/software-factory/slides/04-architecture');
        return <ArchitectureSlide />;
      }
      case '04-code-quality': {
        const { CodeQualitySlide } =
          await import('@/components/presentations/software-factory/slides/04-code-quality');
        return <CodeQualitySlide />;
      }
      case '05-lint': {
        const { LintSlide } =
          await import('@/components/presentations/software-factory/slides/05-lint');
        return <LintSlide />;
      }
      case '05b-lint-structure': {
        const { LintStructureSlide } =
          await import('@/components/presentations/software-factory/slides/05b-lint-structure');
        return <LintStructureSlide />;
      }
      case '06-test-hard': {
        const { TestHardSlide } =
          await import('@/components/presentations/software-factory/slides/06-test-hard');
        return <TestHardSlide />;
      }
      case '07a-feedback-loops': {
        const { FeedbackLoopsSlide } =
          await import('@/components/presentations/software-factory/slides/07a-feedback-loops');
        return <FeedbackLoopsSlide />;
      }
      case '07-specdd': {
        const { SpecDdSlide } =
          await import('@/components/presentations/software-factory/slides/07-specdd');
        return <SpecDdSlide />;
      }
      case '07b-specdd-loop': {
        const { SpecddLoopSlide } =
          await import('@/components/presentations/software-factory/slides/07b-specdd-loop');
        return <SpecddLoopSlide />;
      }
      case '08-server': {
        const { ServerSlide } =
          await import('@/components/presentations/software-factory/slides/08-server');
        return <ServerSlide />;
      }
      case '09-visibility': {
        const { VisibilitySlide } =
          await import('@/components/presentations/software-factory/slides/09-visibility');
        return <VisibilitySlide />;
      }
      case '10-short-cycles': {
        const { ShortCyclesSlide } =
          await import('@/components/presentations/software-factory/slides/10-short-cycles');
        return <ShortCyclesSlide />;
      }
      case '10b-build-to-learn': {
        const { BuildToLearnSlide } =
          await import('@/components/presentations/software-factory/slides/10b-build-to-learn');
        return <BuildToLearnSlide />;
      }
      case '11-focus': {
        const { FocusSlide } =
          await import('@/components/presentations/software-factory/slides/11-focus');
        return <FocusSlide />;
      }
      case '12-close': {
        const { CloseSlide } =
          await import('@/components/presentations/software-factory/slides/12-close');
        return <CloseSlide />;
      }
      default:
        notFound();
    }
  })();

  return slideContent;
}
