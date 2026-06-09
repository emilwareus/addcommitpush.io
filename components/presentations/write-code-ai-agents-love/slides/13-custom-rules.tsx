import { Claim, CodeBlock, SlideShell, SourceLink, StageLabel } from './shared';

export function CustomRulesSlide() {
  return (
    <SlideShell>
      <Claim>Custom rules turn repo conventions into diagnostics.</Claim>

      <div className="grid w-full max-w-6xl grid-cols-[1.05fr_0.95fr] gap-10">
        <div>
          <StageLabel>polint diagnostic</StageLabel>
          <CodeBlock className="mt-4 text-base">
            <span className="text-amber-300">backend/orders/http.go</span>
            <span>:</span>
            <span className="text-primary">42</span>
            <span>:</span>
            <span className="text-primary">17</span>{' '}
            <span className="text-red-300">local/no-route-db-access</span>
            {'\n'}
            <span className="text-zinc-100">Routes must not import the ORM directly.</span>
            {'\n'}
            <span className="text-secondary">Move persistence behind the application command.</span>
          </CodeBlock>

          <p className="mt-7 text-2xl font-semibold leading-snug text-secondary">
            The diagnostic tells the agent what rule it broke and how to repair the shape.
          </p>
        </div>

        <div>
          <StageLabel>what I would lint</StageLabel>
          <CodeBlock className="mt-4 text-base">
            <span className="text-red-300">no raw fetch</span>
            <span> when an SDK exists</span>
            {'\n'}
            <span className="text-red-300">no cross-context import</span>
            <span> from billing to auth internals</span>
            {'\n'}
            <span className="text-red-300">no route-to-database</span>
            <span> access</span>
            {'\n'}
            <span className="text-red-300">no generated file edits</span>
          </CodeBlock>

          <SourceLink href="https://github.com/emilwareus/polint">
            polint: repo-owned lint rules for agent workflows
          </SourceLink>
        </div>
      </div>
    </SlideShell>
  );
}
