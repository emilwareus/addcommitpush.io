'use client';

import { useEffect, useState } from 'react';

const commandSets = [
  ['leadership_lessons.md', '"mostly mistakes, tbh"', 'origin/master'],
  ['all_knowledge.md', '"my personal reflections"', '-f origin/master'],
  ['hot_takes.md', '"ill regret this by morning"', '--no-verify origin/main'],
  ['things_i_was_wrong_about.md', '"character development"', 'origin/main'],
  ['data_driven_vibes.md', '"the numbers said maybe"', '-f origin/master'],
] as const;

const promptHoldMs = 7000;
const characterDelayMs = 28;
const lineDelayMs = 140;

type DisplayedValues = readonly [string, string, string];

export function BlogTerminalHero() {
  const [activeSetIndex, setActiveSetIndex] = useState(0);
  const [fileName, message, branch] = commandSets[activeSetIndex];
  const [displayedValues, setDisplayedValues] = useState<DisplayedValues>(['', '', '']);

  useEffect(() => {
    const targetValues = [fileName, `-m ${message}`, branch] as const;
    let timer: number;
    let cancelled = false;

    const updateLine = (lineIndex: number, value: string) => {
      setDisplayedValues((currentValues) => {
        const nextValues: [string, string, string] = [...currentValues];
        nextValues[lineIndex] = value;
        return nextValues;
      });
    };

    const schedule = (callback: () => void, delay: number) => {
      timer = window.setTimeout(callback, delay);
    };

    const typeLine = (lineIndex: number, characterIndex: number) => {
      if (cancelled) {
        return;
      }

      const targetValue = targetValues[lineIndex];

      if (targetValue === undefined) {
        schedule(() => {
          setActiveSetIndex((index) => (index + 1) % commandSets.length);
        }, promptHoldMs);
        return;
      }

      updateLine(lineIndex, targetValue.slice(0, characterIndex));

      if (characterIndex >= targetValue.length) {
        schedule(() => typeLine(lineIndex + 1, 0), lineDelayMs);
        return;
      }

      schedule(() => typeLine(lineIndex, characterIndex + 1), characterDelayMs);
    };

    schedule(() => {
      setDisplayedValues(['', '', '']);
      typeLine(0, 0);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [branch, fileName, message]);

  return (
    <div className="w-full max-w-[1120px] border border-dashed border-border bg-[var(--hover)]">
      <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--hair)] px-5 py-3">
        <span className="text-[11.5px] tracking-[0.04em] text-muted-foreground">
          emil@acp : ~/blog
        </span>
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full border border-muted-foreground" />
          <span className="h-2.5 w-2.5 rounded-full border border-muted-foreground" />
          <span className="h-2.5 w-2.5 rounded-full border border-muted-foreground" />
        </span>
      </div>
      <div className="overflow-hidden px-5 py-7 text-[clamp(0.72rem,2.35vw,1.45rem)] leading-[1.7] sm:px-8 sm:py-9">
        <CommandLine command="add" value={displayedValues[0]} />
        <CommandLine command="commit" value={displayedValues[1]} />
        <CommandLine command="push" value={displayedValues[2]} cursor />
      </div>
    </div>
  );
}

function CommandLine({
  command,
  value,
  cursor = false,
}: {
  command: string;
  value: string;
  cursor?: boolean;
}) {
  return (
    <div className="flex flex-nowrap items-baseline gap-[0.32em] whitespace-nowrap">
      <span className="text-muted-foreground opacity-70">›</span>
      <span className="font-bold text-primary">{command}</span>
      <span className="text-muted-foreground">{value}</span>
      {cursor && (
        <span className="inline-block h-[1em] w-[0.55em] translate-y-[0.12em] animate-[acp-blink_1.05s_steps(1)_infinite] bg-primary" />
      )}
    </div>
  );
}
