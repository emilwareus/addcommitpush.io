import { AgenticLoopVisual } from './03-agentic-loop';
import { Claim, SlideShell } from './shared';

export function AgenticLoopTopicsSlide() {
  return (
    <SlideShell>
      <Claim className="mb-6 text-4xl md:text-4xl">
        The codebase can help at each step of the loop.
      </Claim>

      <AgenticLoopVisual highlightTopics />
    </SlideShell>
  );
}
