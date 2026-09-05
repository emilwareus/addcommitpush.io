import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllSlideSlugs, getSlideBySlug } from '@/lib/presentations/write-code-ai-agents-love';

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
    title: `${slideData.title} - Write Code That AI Agents Love`,
    description: 'A technical talk on making codebases easier for AI agents and humans to work in.',
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
          await import('@/components/presentations/write-code-ai-agents-love/slides/01-title');
        return <TitleSlide />;
      }
      case '02-about': {
        const { AboutSlide } =
          await import('@/components/presentations/write-code-ai-agents-love/slides/02-about');
        return <AboutSlide />;
      }
      case '03-agentic-loop': {
        const { AgenticLoopSlide } =
          await import('@/components/presentations/write-code-ai-agents-love/slides/03-agentic-loop');
        return <AgenticLoopSlide />;
      }
      case '04-agentic-loop-topics': {
        const { AgenticLoopTopicsSlide } =
          await import('@/components/presentations/write-code-ai-agents-love/slides/04-agentic-loop-topics');
        return <AgenticLoopTopicsSlide />;
      }
      case '05-agents-md': {
        const { AgentsMdSlide } =
          await import('@/components/presentations/write-code-ai-agents-love/slides/05-agents-md');
        return <AgentsMdSlide />;
      }
      case '06-architecture-docs': {
        const { ArchitectureDocsSlide } =
          await import('@/components/presentations/write-code-ai-agents-love/slides/06-architecture-docs');
        return <ArchitectureDocsSlide />;
      }
      case '07-bounded-context': {
        const { BoundedContextSlide } =
          await import('@/components/presentations/write-code-ai-agents-love/slides/07-bounded-context');
        return <BoundedContextSlide />;
      }
      case '08-subagents': {
        const { SubagentsSlide } =
          await import('@/components/presentations/write-code-ai-agents-love/slides/08-subagents');
        return <SubagentsSlide />;
      }
      case '09-code-quality': {
        const { CodeQualitySlide } =
          await import('@/components/presentations/write-code-ai-agents-love/slides/09-code-quality');
        return <CodeQualitySlide />;
      }
      case '10-code-quality-evidence': {
        const { CodeQualityEvidenceSlide } =
          await import('@/components/presentations/write-code-ai-agents-love/slides/10-code-quality-evidence');
        return <CodeQualityEvidenceSlide />;
      }
      case '11-code-quality-structure': {
        const { CodeQualityStructureSlide } =
          await import('@/components/presentations/write-code-ai-agents-love/slides/11-code-quality-structure');
        return <CodeQualityStructureSlide />;
      }
      case '12-generated-sdks': {
        const { GeneratedSdksSlide } =
          await import('@/components/presentations/write-code-ai-agents-love/slides/12-generated-sdks');
        return <GeneratedSdksSlide />;
      }
      case '13-custom-rules': {
        const { CustomRulesSlide } =
          await import('@/components/presentations/write-code-ai-agents-love/slides/13-custom-rules');
        return <CustomRulesSlide />;
      }
      case '14-impact-effort': {
        const { ImpactEffortSlide } =
          await import('@/components/presentations/write-code-ai-agents-love/slides/14-impact-effort');
        return <ImpactEffortSlide />;
      }
      case '15-close': {
        const { CloseSlide } =
          await import('@/components/presentations/write-code-ai-agents-love/slides/15-close');
        return <CloseSlide />;
      }
      default:
        notFound();
    }
  })();

  return slideContent;
}
