import { SlideFrame, type LeverageRegionId } from './shared';

// One question per part, shown as a divider before the part starts.
function PartQuestion({ chapter, question }: { chapter: LeverageRegionId; question: string }) {
  return (
    <SlideFrame chapter={chapter}>
      <p className="max-w-[22ch] font-serif text-[clamp(2.25rem,5vw,5rem)] font-bold leading-[1.08] text-primary">
        {question}
      </p>
    </SlideFrame>
  );
}

export function CodeQuestionSlide() {
  return (
    <PartQuestion
      chapter="a-lot"
      question="How do we prepare our codebase for autonomous AI agents?"
    />
  );
}

export function WorkflowQuestionSlide() {
  return (
    <PartQuestion
      chapter="more"
      question="How do we structure the process for fully autonomous, long-running agents?"
    />
  );
}

export function ProductQuestionSlide() {
  return (
    <PartQuestion
      chapter="most"
      question="What do we do with a codebase and process built for agents?"
    />
  );
}
