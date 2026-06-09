import { Claim, SlideShell } from './shared';

type Stage = {
  name: string;
  className: string;
  items: [string, boolean][];
};

const stages: Stage[] = [
  {
    name: 'Prompt',
    className: 'col-start-1 row-start-1',
    items: [
      ['AGENTS.md', true],
      ['setup commands', false],
      ['repo instructions', false],
    ],
  },
  {
    name: 'Orient',
    className: 'col-start-3 row-start-1',
    items: [
      ['architecture docs', true],
      ['bounded context', true],
      ['repo map', false],
      ['tool / LSP access', false],
    ],
  },
  {
    name: 'Retrieve',
    className: 'col-start-5 row-start-1',
    items: [
      ['examples as specs', false],
      ['subagents', true],
      ['naming', false],
      ['domain vocabulary', false],
    ],
  },
  {
    name: 'Verify',
    className: 'col-start-3 row-start-3',
    items: [
      ['tests', true],
      ['typecheck / build', false],
      ['custom rules / polint', true],
      ['CI feedback', false],
    ],
  },
  {
    name: 'Edit',
    className: 'col-start-5 row-start-3',
    items: [
      ['generated SDKs', true],
      ['types', false],
      ['dependency surface', false],
      ['code quality', true],
      ['side effects', false],
      ['multi-file ripple', false],
    ],
  },
];

function StageBox({
  name,
  items,
  className,
  highlightTopics,
}: {
  name: string;
  items: [string, boolean][];
  className: string;
  highlightTopics: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-border/70 bg-zinc-950/45 p-4 shadow-lg shadow-black/20 ${className}`}
    >
      <div className="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-primary/75">
        {name}
      </div>
      <div className="space-y-1.5">
        {items.map(([item, highlighted]) => (
          <div
            key={item}
            className={
              highlightTopics && highlighted
                ? 'rounded-md border border-primary/35 bg-primary/10 px-3 py-1 text-base font-bold text-primary'
                : 'px-3 py-1 text-base font-medium text-muted-foreground'
            }
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AgenticLoopVisual({ highlightTopics }: { highlightTopics: boolean }) {
  return (
    <div className="relative grid w-full max-w-6xl grid-cols-[1fr_64px_1fr_64px_1fr] grid-rows-[auto_46px_auto] items-stretch">
      <StageBox {...stages[0]} highlightTopics={highlightTopics} />
      <div className="col-start-2 row-start-1 flex items-center justify-center font-mono text-3xl text-primary/50">
        -&gt;
      </div>
      <StageBox {...stages[1]} highlightTopics={highlightTopics} />
      <div className="col-start-4 row-start-1 flex items-center justify-center font-mono text-3xl text-primary/50">
        -&gt;
      </div>
      <StageBox {...stages[2]} highlightTopics={highlightTopics} />

      <div className="col-start-5 row-start-2 flex items-center justify-center font-mono text-3xl text-primary/50">
        v
      </div>

      <div className="col-start-1 row-start-3" />
      <StageBox {...stages[3]} highlightTopics={highlightTopics} />
      <div className="col-start-4 row-start-3 flex items-center justify-end font-mono text-3xl text-primary/50">
        &lt;-
      </div>
      <StageBox {...stages[4]} highlightTopics={highlightTopics} />
      <div className="col-start-3 row-start-2 flex items-center justify-center font-mono text-3xl text-primary/50">
        ^
      </div>
    </div>
  );
}

export function AgenticLoopSlide() {
  return (
    <SlideShell>
      <Claim className="mb-6 text-4xl md:text-4xl">
        The codebase can help at each step of the loop.
      </Claim>

      <AgenticLoopVisual highlightTopics={false} />
    </SlideShell>
  );
}
