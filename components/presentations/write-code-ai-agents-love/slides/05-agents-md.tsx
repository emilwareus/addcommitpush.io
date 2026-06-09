import { Claim, CodeBlock, SlideShell } from './shared';

export function AgentsMdSlide() {
  return (
    <SlideShell>
      <Claim>AGENTS.md should point to commands, files, and rules.</Claim>

      <div className="grid w-full max-w-6xl grid-cols-2 gap-10">
        <div>
          <div className="mb-4 text-2xl font-bold text-primary">Strong</div>
          <CodeBlock>
            <span className="text-muted-foreground"># agent startup</span>
            {'\n'}
            <span className="text-blue-300">Start here:</span>{' '}
            <span className="text-amber-300">thoughts/architecture/README.md</span>
            {'\n'}
            <span className="text-blue-300">DDD rule:</span>{' '}
            <span className="text-zinc-100">billing owns invoices and credits</span>
            {'\n'}
            <span className="text-blue-300">Never edit:</span>{' '}
            <span className="text-amber-300">src/generated/**</span>
            {'\n'}
            <span className="text-blue-300">API calls:</span>{' '}
            <span className="text-zinc-100">use @acme/sdk</span>
            {'\n'}
            <span className="text-blue-300">Before done:</span>{' '}
            <span className="text-zinc-100">run the touched package tests</span>
          </CodeBlock>
        </div>

        <div>
          <div className="mb-4 text-2xl font-bold text-muted-foreground">Weak</div>
          <CodeBlock>
            <span className="text-zinc-400">write clean code</span>
            {'\n'}
            <span className="text-zinc-400">use DDD</span>
            {'\n'}
            <span className="text-zinc-400">follow our architecture</span>
            {'\n'}
            <span className="text-zinc-400">be careful</span>
            {'\n'}
            <span className="text-red-300">do not invent billingAuthUserManager2</span>
          </CodeBlock>
        </div>
      </div>

      <p className="mt-9 max-w-4xl text-center text-2xl font-semibold text-secondary">
        Broad architecture advice only helps when it points to a concrete rule, command, or file.
      </p>
    </SlideShell>
  );
}
