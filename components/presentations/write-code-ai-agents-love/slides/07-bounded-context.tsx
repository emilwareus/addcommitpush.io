import { Claim, SlideShell } from './shared';

const insideItems = ['domain model', 'vocabulary', 'business rules', 'owned data'];

export function BoundedContextSlide() {
  return (
    <SlideShell>
      <Claim className="mb-6">
        A bounded context is the boundary where one domain model, vocabulary, and rules apply.
      </Claim>

      <div className="w-full max-w-6xl">
        <div className="relative grid min-h-[420px] grid-cols-[1fr_170px_0.82fr] items-center gap-8">
          <div className="rounded-[34px] border-2 border-dashed border-primary/45 bg-primary/5 px-10 py-8">
            <div className="font-mono text-sm uppercase tracking-[0.22em] text-primary/70">
              bounded context
            </div>
            <div className="mt-4 text-4xl font-bold text-primary">Billing</div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              {insideItems.map((item) => (
                <div
                  key={item}
                  className="border-t border-primary/25 pt-4 text-2xl font-semibold text-foreground"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-9 rounded-lg border border-primary/30 bg-zinc-950/45 px-5 py-4">
              <div className="font-mono text-sm uppercase tracking-[0.18em] text-primary/70">
                public surface
              </div>
              <div className="mt-2 font-mono text-xl text-primary">commands / events / API</div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 text-center">
            <div className="font-mono text-3xl text-primary/60">-&gt;</div>
            <div className="max-w-[150px] font-mono text-sm uppercase tracking-[0.16em] text-primary/70">
              public surface only
            </div>
            <div className="font-mono text-3xl text-primary/60">&lt;-</div>
          </div>

          <div className="rounded-[28px] border border-border/80 bg-zinc-950/35 px-8 py-8">
            <div className="font-mono text-sm uppercase tracking-[0.22em] text-muted-foreground">
              another context
            </div>
            <div className="mt-4 text-4xl font-bold text-muted-foreground">Auth</div>

            <div className="mt-8 space-y-4 text-2xl font-semibold text-muted-foreground">
              <div>own model</div>
              <div>own vocabulary</div>
              <div>own rules</div>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-4 max-w-4xl text-center text-2xl font-semibold leading-snug text-secondary">
          The boundary can be a module, package, service, or team ownership line.
        </p>
      </div>
    </SlideShell>
  );
}
