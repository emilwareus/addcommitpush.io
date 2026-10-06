import Image from 'next/image';
import { SlideFrame } from './shared';

interface ProcessScreenshot {
  src: string;
  alt: string;
  caption: string;
  frame: string;
  image: string;
  sizes: string;
}

// Positions, widths and rotations are the Paper 1440x510 collage as percentages.
const screenshots: readonly ProcessScreenshot[] = [
  {
    src: '/presentations/software-factory/old-agile-loop.png',
    alt: 'Agile development loop diagram',
    caption: 'Agile',
    frame: 'left-[64%] top-[-16%] z-10 w-[34.72%] -rotate-[4deg]',
    image: 'aspect-[474/267]',
    sizes: '35vw',
  },
  {
    src: '/presentations/software-factory/old-safe.png',
    alt: 'SAFe framework big picture diagram',
    caption: 'SAFe',
    frame: 'left-[27.08%] top-[0.39%] w-[49.31%] rotate-[3deg]',
    image: 'aspect-[684/424]',
    sizes: '(min-width: 1024px) 50vw, 90vw',
  },
  {
    src: '/presentations/software-factory/old-kanban.png',
    alt: 'Kanban board screenshot',
    caption: 'Kanban',
    frame: 'left-[0.56%] top-[20.39%] w-[43.06%] -rotate-[5deg]',
    image: 'aspect-[594/310]',
    sizes: '(min-width: 1024px) 45vw, 80vw',
  },
  {
    src: '/presentations/software-factory/old-scrum.png',
    alt: 'Scrum daily stand-up screenshot',
    caption: 'Daily standup',
    frame: 'left-[64.58%] top-[32.94%] w-[34.72%] rotate-[5deg]',
    image: 'aspect-[474/264]',
    sizes: '(min-width: 1024px) 35vw, 70vw',
  },
];

export function OldWaySlide() {
  return (
    <SlideFrame>
      <div>
        <h2 className="text-[clamp(2rem,4.2vw,4.2rem)] font-bold leading-[1.05] tracking-[-0.035em]! text-primary">
          Synergetic Scaled Agile Organization
        </h2>
        <p className="mt-2 font-mono text-[clamp(0.85rem,1.1vw,1.05rem)] text-muted-foreground">
          (the old way)
        </p>
      </div>

      <div className="mx-auto w-[min(100%,calc((100vh-31rem)*2.8235))] shrink-0">
        <div className="relative aspect-[1440/510] w-full">
          {screenshots.map((screenshot) => (
            <figure
              key={screenshot.src}
              className={`absolute flex origin-top-left flex-col gap-[clamp(4px,0.5vw,8px)] border border-[var(--hair)] bg-[#ffffff] p-[0.83%] ${screenshot.frame}`}
            >
              <div className={`relative w-full ${screenshot.image}`}>
                <Image
                  src={screenshot.src}
                  alt={screenshot.alt}
                  fill
                  sizes={screenshot.sizes}
                  className="object-contain"
                />
              </div>
              <figcaption className="font-mono text-[clamp(9px,0.75vw,12px)] leading-[1.5] text-[#153e5e]">
                {screenshot.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      <p className="font-mono text-[clamp(1.1rem,1.75vw,1.75rem)] leading-[1.35] text-foreground">
        …and then someone still has to write the software.
      </p>
    </SlideFrame>
  );
}
