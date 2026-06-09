import { Claim, CodeBlock, SlideShell } from './shared';

export function GeneratedSdksSlide() {
  return (
    <SlideShell>
      <Claim>Generated SDKs make API contracts local.</Claim>

      <div className="mb-8 flex w-full max-w-5xl items-center justify-between border-y border-primary/25 py-5 text-center">
        {['API contract', 'generated client', 'call sites', 'type feedback'].map((label, index) => (
          <div key={label} className="flex items-center gap-6">
            <span
              className={
                index === 1
                  ? 'text-2xl font-bold text-primary'
                  : 'text-xl font-semibold text-muted-foreground'
              }
            >
              {label}
            </span>
            {index < 3 ? <span className="text-2xl text-primary/45">-&gt;</span> : null}
          </div>
        ))}
      </div>

      <div className="grid w-full max-w-6xl grid-cols-2 gap-8">
        <div>
          <div className="mb-4 text-2xl font-bold text-muted-foreground">Stringly typed</div>
          <CodeBlock className="text-base">
            <span className="text-blue-300">await</span> <span>fetch(</span>
            <span className="text-amber-300">&quot;/api/invoices/&quot;</span> <span>+ id + </span>
            <span className="text-amber-300">&quot;/credits&quot;</span>
            <span>, {'{'}</span>
            {'\n'}
            <span className="text-primary"> method:</span>{' '}
            <span className="text-amber-300">&quot;POST&quot;</span>
            <span>,</span>
            {'\n'}
            <span className="text-primary"> body:</span>{' '}
            <span>
              JSON.stringify({'{'} creditId {'}'}),
            </span>
            {'\n'}
            <span>{'}'})</span>
          </CodeBlock>
        </div>

        <div>
          <div className="mb-4 text-2xl font-bold text-primary">Contract shaped</div>
          <CodeBlock className="text-base">
            <span className="text-blue-300">await</span> <span>billingClient.</span>
            <span className="text-primary">applyInvoiceCredit</span>
            <span>({'{'}</span>
            {'\n'}
            <span className="text-primary"> invoiceId,</span>
            {'\n'}
            <span className="text-primary"> creditId,</span>
            {'\n'}
            <span>{'}'})</span>
          </CodeBlock>
        </div>
      </div>
    </SlideShell>
  );
}
