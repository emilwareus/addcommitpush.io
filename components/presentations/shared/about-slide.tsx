'use client';

import { motion } from 'framer-motion';

export interface AboutCard {
  content: React.ReactNode;
  rotate: number;
  x: number;
  y: number;
  bg: string;
  border: string;
  width: string;
  delay: number;
}

interface AboutSlideProps {
  name: string;
  initials: string;
  tagline: string;
  cards: AboutCard[];
  contentOffsetY?: number;
}

export function AboutSlide({
  name,
  initials,
  tagline,
  cards,
  contentOffsetY = 0,
}: AboutSlideProps) {
  return (
    <div className="relative flex items-center justify-center h-full w-full overflow-hidden">
      {/* Center identity */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-3 z-10"
        style={{ y: contentOffsetY }}
      >
        <div className="w-28 h-28 rounded-full bg-primary/10 border-2 border-primary/40 flex items-center justify-center text-5xl font-bold text-primary neon-glow">
          {initials}
        </div>
        <h2 className="text-5xl font-bold text-primary">{name}</h2>
        <p className="text-lg text-muted-foreground max-w-md text-center">{tagline}</p>
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
            top: `calc(50% + ${card.y + contentOffsetY}px)`,
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
