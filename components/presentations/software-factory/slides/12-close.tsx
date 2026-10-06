import Image from 'next/image';
import { SlideFrame } from './shared';

const contacts = [
  { label: 'email', text: 'emil@oaiz.io', href: 'mailto:emil@oaiz.io' },
  { label: 'blog', text: 'addcommitpush.io', href: 'https://addcommitpush.io' },
  { label: 'company', text: 'oaiz.io', href: 'https://oaiz.io' },
  { label: 'github', text: 'github.com/emilwareus', href: 'https://github.com/emilwareus' },
  {
    label: 'linkedin',
    text: 'linkedin.com/in/emilwareus',
    href: 'https://www.linkedin.com/in/emilwareus',
  },
] as const;

export function CloseSlide() {
  return (
    <SlideFrame>
      <div className="grid items-center gap-[clamp(2.5rem,5vw,5rem)] lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex flex-col gap-[clamp(1.5rem,4vh,3rem)]">
          <h2 className="text-[clamp(2.5rem,5vw,5.5rem)] font-bold leading-[1.05] tracking-[-0.035em]! text-primary">
            Build the machine
          </h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-[clamp(0.5rem,1.4vh,0.9rem)] font-mono text-[clamp(0.95rem,1.35vw,1.35rem)]">
            {contacts.map((contact) => (
              <div key={contact.label} className="contents">
                <dt className="uppercase tracking-[0.12em] text-muted-foreground text-[0.8em] self-center">
                  {contact.label}
                </dt>
                <dd>
                  <a
                    href={contact.href}
                    className="text-foreground underline decoration-[var(--hair)] decoration-dashed underline-offset-[6px] hover:text-primary"
                  >
                    {contact.text}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <Image
          src="/presentations/software-factory/we-are-not-the-same.jpg"
          alt="Meme: 'Vibe coders don't look at their code. I don't look at the code. We are not the same.'"
          width={1000}
          height={1000}
          className="mx-auto h-auto w-full max-w-[min(42rem,38vw,70vh)] border-[1.5px] border-[var(--hair)]"
        />
      </div>
    </SlideFrame>
  );
}
