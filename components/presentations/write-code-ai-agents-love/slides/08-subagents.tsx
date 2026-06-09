import { Claim, CodeBlock, SlideShell, StageLabel } from './shared';

const subagents = [
  ['pattern-finder', 'find the files worth copying'],
  ['test-auditor', 'find the feedback loop for this change'],
  ['boundary-checker', 'spot cross-context imports before review'],
  ['docs-mapper', 'map stale or missing architecture docs'],
  ['rule-sketcher', 'turn repeated review comments into lint ideas'],
];

export function SubagentsSlide() {
  return (
    <SlideShell>
      <Claim>Use subagents to find patterns before editing.</Claim>

      <div className="grid w-full max-w-6xl grid-cols-[1.02fr_0.98fr] items-center gap-12">
        <div>
          <StageLabel>good subagent prompt</StageLabel>
          <CodeBlock className="mt-4">
            <span className="text-blue-300">Search</span>{' '}
            <span className="text-amber-300">billing/</span>{' '}
            <span>for invoice-credit examples.</span>
            {'\n'}
            <span className="text-blue-300">Return:</span>
            {'\n'}
            <span className="text-zinc-400">1. three files to mimic</span>
            {'\n'}
            <span className="text-zinc-400">2. the pattern they share</span>
            {'\n'}
            <span className="text-zinc-400">3. rules I must not break</span>
            {'\n'}
            <span className="text-red-300">Do not edit files.</span>
          </CodeBlock>

          <p className="mt-7 text-2xl font-semibold text-secondary">
            The main agent keeps one patch in its head.
          </p>
        </div>

        <div className="space-y-4 border-l border-primary/25 pl-10">
          {subagents.map(([name, description]) => (
            <div key={name} className="grid grid-cols-[190px_1fr] items-baseline gap-5">
              <div className="font-mono text-lg text-primary">{name}</div>
              <div className="text-xl text-muted-foreground">{description}</div>
            </div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}
