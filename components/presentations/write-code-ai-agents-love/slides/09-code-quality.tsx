import { Claim, CodeBlock, SlideShell } from './shared';

export function CodeQualitySlide() {
  return (
    <SlideShell>
      <Claim>Code Quality = Compounding Velocity</Claim>

      <div className="grid w-full max-w-6xl grid-cols-2 gap-10">
        <div>
          <div className="mb-4 text-2xl font-bold text-muted-foreground">Hard to review</div>
          <CodeBlock className="text-base">
            <span className="text-blue-300">if</span> <span>(status === </span>
            <span className="text-amber-300">&quot;paid&quot;</span>
            <span> &amp;&amp; role !== </span>
            <span className="text-amber-300">&quot;guest&quot;</span>
            <span> &amp;&amp; invoice.total &gt; 0) {'{'}</span>
            {'\n'}
            <span className="text-zinc-400">{'// apply credit, send email, audit, update DB'}</span>
            {'\n'}
            <span> await applyThing(user, invoice, credit, true)</span>
            {'\n'}
            <span>{'}'}</span>
          </CodeBlock>

          <p className="mt-5 text-xl text-muted-foreground">
            The agent can make this pass. The reviewer still has to reverse-engineer the rule.
          </p>
        </div>

        <div>
          <div className="mb-4 text-2xl font-bold text-primary">Easier to change</div>
          <CodeBlock className="text-base">
            <span className="text-blue-300">if</span>{' '}
            <span>(!billingPolicy.canApplyCredit(user, invoice)) {'{'}</span>
            {'\n'}
            <span className="text-blue-300"> return</span>{' '}
            <span className="text-amber-300">&quot;not_allowed&quot;</span>
            {'\n'}
            <span>{'}'}</span>
            {'\n\n'}
            <span className="text-blue-300">await</span> <span>billing.applyCredit({'{'}</span>
            {'\n'}
            <span className="text-primary"> invoiceId, creditId</span>
            {'\n'}
            <span>{'}'})</span>
          </CodeBlock>

          <p className="mt-5 text-xl text-muted-foreground">
            The domain rule has a name. The side effect has one obvious place to live.
          </p>
        </div>
      </div>

      <p className="mt-10 text-center text-3xl font-semibold text-secondary">
        The useful question: can I tell where the change belongs?
      </p>
    </SlideShell>
  );
}
