import Image from 'next/image';
import { SlideShell } from './shared';

export function CloseSlide() {
  return (
    <SlideShell>
      <div className="grid w-full max-w-6xl grid-cols-[1fr_360px] items-center gap-16">
        <div>
          <h2 className="text-6xl font-bold leading-tight text-primary neon-glow md:text-7xl">
            Thank you.
          </h2>

          <div className="mt-12 space-y-7">
            <div>
              <div className="font-mono text-sm uppercase tracking-[0.22em] text-primary/60">
                Blog
              </div>
              <a
                href="https://addcommitpush.io/"
                className="mt-2 block font-mono text-3xl font-semibold text-foreground underline decoration-primary/35 underline-offset-8"
              >
                addcommitpush.io
              </a>
            </div>

            <div>
              <div className="font-mono text-sm uppercase tracking-[0.22em] text-primary/60">
                LinkedIn
              </div>
              <a
                href="https://www.linkedin.com/in/emilwareus/"
                className="mt-2 block font-mono text-3xl font-semibold text-foreground underline decoration-primary/35 underline-offset-8"
              >
                linkedin.com/in/emilwareus
              </a>
            </div>

            <div>
              <div className="font-mono text-sm uppercase tracking-[0.22em] text-primary/60">
                OAIZ
              </div>
              <a
                href="https://oaiz.io/"
                className="mt-2 block font-mono text-3xl font-semibold text-foreground underline decoration-primary/35 underline-offset-8"
              >
                oaiz.io
              </a>
              <div className="mt-2 text-xl font-semibold text-muted-foreground">
                AI automation platform
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="relative rounded-xl border border-primary/35 bg-zinc-950/80 p-6 shadow-2xl shadow-black/40">
            <div className="rounded-lg bg-white p-4">
              <Image
                src="/presentations/write-code-ai-agents-love/linkedin-qr.svg"
                alt="QR code for Emil Wåreus on LinkedIn"
                width={300}
                height={300}
                className="h-auto w-full"
                priority
              />
            </div>

            <div className="mt-5 text-center font-mono text-sm uppercase tracking-[0.2em] text-primary">
              Scan for LinkedIn
            </div>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}
