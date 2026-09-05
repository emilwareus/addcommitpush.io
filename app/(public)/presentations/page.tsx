import Link from 'next/link';
import type { Metadata } from 'next';

export const dynamic = 'error';
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Presentations | addcommitpush.io',
  description:
    'Talks and presentations by Emil Wåreus on deep research agents, AI architecture, and software engineering.',
};

interface PresentationEntry {
  title: string;
  description: string;
  href: string;
  venue: string;
  date: string;
  kind: string;
  actions: readonly { label: string; href: string }[];
}

const presentations: PresentationEntry[] = [
  {
    title: 'Write Code That AI Agents Love',
    description:
      'Making codebases legible to agents and humans. Naming, blast radius, and the signals you leave in the code.',
    href: '/presentations/write-code-ai-agents-love',
    venue: 'Working draft',
    date: '2026',
    kind: 'Talk',
    actions: [
      { label: 'Slides →', href: '/presentations/write-code-ai-agents-love' },
      { label: 'Post →', href: '/blog/write-code-that-ai-agents-love' },
      { label: 'Video →', href: 'https://www.youtube.com/watch?v=ttIunVR4s4Q' },
    ],
  },
  {
    title: 'Building Real-Time Voice Agents',
    description:
      'STT, TTS, VAD, and WebSockets with Jarvis, the AI co-presenter built with Whisper, Kokoro, and Groq.',
    href: '/presentations/voice-agents',
    venue: 'Malmö AI Devs',
    date: 'TBD 2026',
    kind: 'Deck',
    actions: [{ label: 'Slides →', href: '/presentations/voice-agents' }],
  },
  {
    title: 'Deep Research Agents',
    description:
      'Architecture walkthrough of STORM, ReACT, and diffusion-based approaches for autonomous deep research agents.',
    href: '/presentations/deep-research',
    venue: 'Foo Cafe, Malmö',
    date: 'Feb 5, 2026',
    kind: 'Talk',
    actions: [{ label: 'Slides →', href: '/presentations/deep-research' }],
  },
];

export default function PresentationsPage() {
  return (
    <main className="site-container">
      <section className="py-14 sm:py-20 md:py-24">
        <div className="section-kicker mb-6 sm:mb-8">Slides & Talks</div>
        <h1 className="display-heading text-[clamp(1.75rem,8.75vw,8.5rem)]">Presentations</h1>
        <p className="mt-7 max-w-3xl text-[15px] leading-[1.75] text-muted-foreground sm:mt-10">
          Decks and talks on AI agents, data, and building. Mostly the same arguments as the blog,
          with more diagrams and worse jokes.
        </p>
      </section>

      <section className="grid gap-6 pb-20 md:grid-cols-2">
        {presentations.map((presentation) => (
          <article
            key={presentation.href}
            className="flex min-h-[260px] min-w-0 flex-col border border-dashed border-border p-5 sm:min-h-[280px] sm:p-7"
          >
            <div className="flex flex-wrap justify-between gap-3 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <span>{presentation.date}</span>
              <span>{presentation.kind}</span>
            </div>
            <h2 className="display-heading mt-7 text-[clamp(1.45rem,8vw,2rem)] leading-[1.12] sm:mt-8">
              {presentation.title}
            </h2>
            <p className="mt-6 text-[13.5px] leading-[1.65] text-foreground">
              {presentation.description}
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.08em] text-muted-foreground">
              {presentation.venue}
            </p>
            <div className="mt-auto flex flex-wrap gap-5 pt-8">
              {presentation.actions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="text-xs uppercase tracking-[0.08em] text-primary underline decoration-dashed underline-offset-4"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </article>
        ))}

        <div className="flex min-h-[260px] flex-col items-center justify-center border border-dashed border-[var(--hair)] p-5 text-center sm:min-h-[280px] sm:p-7">
          <div className="font-serif text-lg italic text-muted-foreground">
            your next talk here...
          </div>
          <a
            href="mailto:emil@addcommitpush.io"
            className="mt-5 text-xs uppercase tracking-[0.14em] text-muted-foreground no-underline hover:text-primary"
          >
            send me the decks
          </a>
        </div>
      </section>

      <footer className="flex flex-wrap justify-between gap-4 border-t border-dashed border-[var(--hair)] py-10 text-[11.5px] text-muted-foreground">
        <span>© 2026 Emil Wåreus</span>
        <Link href="/" className="no-underline hover:text-primary">
          ← back to blog
        </Link>
      </footer>
    </main>
  );
}
