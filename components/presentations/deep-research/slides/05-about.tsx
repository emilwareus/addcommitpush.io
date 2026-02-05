'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface Card {
  content: React.ReactNode;
  rotate: number;
  x: number;
  y: number;
  bg: string;
  border: string;
  width: string;
  delay: number;
}

const cards: Card[] = [
  {
    content: (
      <div className="flex flex-col items-center gap-1.5 text-center">
        <Image
          src="/presentations/deep-research/logos/oaiz-palm.png"
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
        <div className="bg-white rounded-md px-4 py-3">
          <Image
            src="/presentations/deep-research/logos/debricked-logo.png"
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
    rotate: 5,
    x: 280,
    y: -200,
    bg: 'bg-zinc-900',
    border: 'border-zinc-700',
    width: 'w-64',
    delay: 0.25,
  },
  {
    content: (
      <div className="flex flex-col items-center gap-1.5 text-center">
        <Image
          src="/presentations/deep-research/logos/valkompass.avif"
          alt="Valkompass.ai logo"
          width={64}
          height={64}
        />
        <span className="text-base font-semibold">Valkompass</span>
        <span className="text-sm text-muted-foreground">Creator</span>
        <span className="text-xs text-muted-foreground/60">AI-powered Swedish political compass</span>
        <span className="text-xs text-muted-foreground/60">Tech philanthropy</span>
        <span className="text-sm text-primary/50 font-mono">valkompass.ai</span>
      </div>
    ),
    rotate: -2,
    x: -540,
    y: 150,
    bg: 'bg-zinc-900',
    border: 'border-emerald-800/50',
    width: 'w-60',
    delay: 0.35,
  },
  {
    content: (
      <div className="flex flex-col items-center gap-1.5 text-center">
        <Image
          src="/presentations/deep-research/logos/podidex.png"
          alt="Podidex app"
          width={140}
          height={168}
          className="rounded-md"
        />
        <span className="text-base font-semibold">Podidex</span>
        <span className="text-sm text-muted-foreground">Creator</span>
        <span className="text-xs text-muted-foreground/60">AI-powered podcast deep dives</span>
        <span className="text-xs text-muted-foreground/60">Fun sideproject</span>
        <span className="text-sm text-primary/50 font-mono">podidex.com</span>
      </div>
    ),
    rotate: 3,
    x: 300,
    y: 100,
    bg: 'bg-zinc-900',
    border: 'border-zinc-700',
    width: 'w-56',
    delay: 0.45,
  },
  {
    content: (
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-base font-mono text-primary">addcommitpush.io</span>
        <span className="text-xs text-muted-foreground/60">blog &amp; talks</span>
      </div>
    ),
    rotate: -6,
    x: -110,
    y: 180,
    bg: 'bg-zinc-900',
    border: 'border-primary/30',
    width: 'w-56',
    delay: 0.55,
  },
];

export function AboutSlide() {
  return (
    <div className="relative flex items-center justify-center h-full w-full overflow-hidden">
      {/* Center identity */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-3 z-10"
      >
        <div className="w-28 h-28 rounded-full bg-primary/10 border-2 border-primary/40 flex items-center justify-center text-5xl font-bold text-primary neon-glow">
          EW
        </div>
        <h2 className="text-5xl font-bold text-primary">Emil Wåreus</h2>
        <p className="text-lg text-muted-foreground max-w-md text-center">
          Spaghetti coder, ML trainer, agent builder &amp; cat owner
        </p>
      </motion.div>

      {/* Scattered cards */}
      {cards.map((card, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.7, rotate: card.rotate * 2 }}
          animate={{ opacity: 1, scale: 1, rotate: card.rotate }}
          transition={{
            duration: 0.5,
            delay: card.delay,
            type: 'spring',
            stiffness: 200,
            damping: 15,
          }}
          className={`absolute ${card.width} ${card.bg} border ${card.border} rounded-lg p-5 flex flex-col items-center shadow-lg shadow-black/30`}
          style={{
            left: `calc(50% + ${card.x}px)`,
            top: `calc(50% + ${card.y}px)`,
            transform: `translate(-50%, -50%) rotate(${card.rotate}deg)`,
          }}
        >
          {/* Tape strip */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-3.5 bg-primary/20 rounded-sm" />
          {card.content}
        </motion.div>
      ))}
    </div>
  );
}
