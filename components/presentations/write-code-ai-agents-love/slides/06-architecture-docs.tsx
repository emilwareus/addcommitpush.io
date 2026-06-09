import { Claim, CodeBlock, SlideShell, StageLabel } from './shared';

export function ArchitectureDocsSlide() {
  return (
    <SlideShell>
      <Claim>Architecture docs should show where to start.</Claim>

      <div className="grid w-full max-w-6xl grid-cols-[1fr_0.8fr] items-center gap-12">
        <div>
          <StageLabel>repo map</StageLabel>
          <CodeBlock className="mt-4">
            <span className="text-primary">AGENTS.md</span>
            {'\n'}
            <span className="text-zinc-400"> -&gt; </span>
            <span className="text-amber-300">thoughts/architecture/README.md</span>
            {'\n'}
            <span className="text-zinc-400"> -&gt; </span>
            <span>boundaries.md</span>
            {'\n'}
            <span className="text-zinc-400"> -&gt; </span>
            <span>testing-strategy.md</span>
            {'\n'}
            <span className="text-zinc-400"> -&gt; </span>
            <span>generated-sdk-policy.md</span>
          </CodeBlock>
        </div>

        <div className="space-y-8 border-l border-primary/25 pl-10">
          <div>
            <div className="text-3xl font-bold text-primary">one file to open first</div>
            <p className="mt-2 text-xl text-muted-foreground">then smaller docs by area</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground">no wiki archaeology</div>
            <p className="mt-2 text-xl text-muted-foreground">the path is in the repo</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground">short enough to trust</div>
            <p className="mt-2 text-xl text-muted-foreground">
              stale architecture docs are worse than none
            </p>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}
