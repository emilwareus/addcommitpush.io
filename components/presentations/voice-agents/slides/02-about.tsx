'use client';

import Image from 'next/image';
import { AboutSlide as SharedAboutSlide, type AboutCard } from '@/components/presentations/shared/about-slide';

const cards: AboutCard[] = [
  {
    content: (
      <div className="flex flex-col items-center gap-1.5 text-center">
        <Image
          src="/presentations/voice-agents/logos/oaiz-palm.png"
          alt="oaiz logo"
          width={96}
          height={96}
          className="rounded-md"
        />
        <span className="text-lg font-semibold">oaiz</span>
        <span className="text-sm text-muted-foreground">Founder</span>
        <span className="text-xs text-muted-foreground/60">AI automation platform</span>
        <span className="text-sm text-primary/50 font-mono">oaiz.io</span>
      </div>
    ),
    rotate: -4,
    x: -540,
    y: -200,
    bg: 'bg-zinc-900',
    border: 'border-zinc-700',
    width: 'w-60',
    delay: 0.15,
  },
  {
    content: (
      <div className="flex flex-col items-center gap-1.5 text-center">
        <Image
          src="/presentations/voice-agents/logos/podidex.png"
          alt="Podidex app"
          width={140}
          height={168}
          className="rounded-md"
        />
        <span className="text-lg font-semibold">Podidex</span>
        <span className="text-sm text-muted-foreground">Creator</span>
        <span className="text-xs text-muted-foreground/60">Talk to your podcasts with AI</span>
        <span className="text-xs text-muted-foreground/60">Voice chat built in!</span>
        <span className="text-sm text-primary/50 font-mono">podidex.com</span>
      </div>
    ),
    rotate: 5,
    x: 280,
    y: -200,
    bg: 'bg-zinc-900',
    border: 'border-primary/30',
    width: 'w-56',
    delay: 0.25,
  },
  {
    content: (
      <div className="flex flex-col items-center gap-1.5 text-center">
        <div className="bg-white rounded-md px-4 py-3">
          <Image
            src="/presentations/voice-agents/logos/debricked-logo.png"
            alt="Debricked logo"
            width={200}
            height={60}
            className="object-contain"
          />
        </div>
        <span className="text-sm text-muted-foreground">Founder</span>
        <span className="text-xs text-muted-foreground/60">Application security with AI</span>
        <span className="text-xs text-muted-foreground/60">exit 2022</span>
        <span className="text-sm text-primary/50 font-mono">debricked.com</span>
      </div>
    ),
    rotate: -2,
    x: -540,
    y: 150,
    bg: 'bg-zinc-900',
    border: 'border-zinc-700',
    width: 'w-64',
    delay: 0.35,
  },
  {
    content: (
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-base font-mono text-primary">addcommitpush.io</span>
        <span className="text-xs text-muted-foreground/60">blog &amp; talks</span>
      </div>
    ),
    rotate: 3,
    x: 300,
    y: 130,
    bg: 'bg-zinc-900',
    border: 'border-primary/30',
    width: 'w-56',
    delay: 0.45,
  },
];

export function AboutSlide() {
  return (
    <SharedAboutSlide
      name="Emil Wåreus"
      initials="EW"
      tagline="Spaghetti coder, ML trainer, agent builder &amp; cat owner"
      cards={cards}
    />
  );
}
