import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import { SlideFrame } from './shared';

const cornerWord =
  'text-center font-serif text-[clamp(1.4rem,2.6vw,2.9rem)] font-bold uppercase leading-none text-primary';

const feeders = ['Non-developers', 'AI agents', 'Developers'] as const;

const boxText = 'font-serif text-[clamp(1rem,1.6vw,1.6rem)] font-semibold leading-tight';

function LoopArrow({ Icon }: { Icon: typeof ArrowRight }) {
  return (
    <Icon
      aria-hidden="true"
      strokeWidth={1.75}
      className="h-[clamp(1.25rem,2vw,2rem)] w-[clamp(1.25rem,2vw,2rem)] text-primary"
    />
  );
}

function FeedArrows() {
  return (
    <svg
      viewBox="0 0 90 240"
      className="hidden h-[clamp(9rem,26vh,15rem)] w-auto shrink-0 lg:block"
      aria-hidden="true"
    >
      <g fill="none" className="stroke-primary" strokeWidth={3}>
        <path d="M0 34 C 45 34, 45 120, 76 120" />
        <path d="M0 120 L 76 120" />
        <path d="M0 206 C 45 206, 45 120, 76 120" />
      </g>
      <polygon points="90,120 76,112 76,128" className="fill-primary" />
    </svg>
  );
}

export function BuildTheMachineSlide() {
  return (
    <SlideFrame>
      <h2 className="text-[clamp(2.5rem,6vw,6.5rem)] font-bold leading-[1.1] tracking-[-0.035em]! text-primary">
        Build the machine
      </h2>

      <div className="flex flex-col items-center gap-[clamp(1rem,2vw,1.5rem)] lg:flex-row lg:justify-center">
        <ul className="flex w-full flex-col gap-[clamp(0.6rem,2vh,1.25rem)] lg:w-auto">
          {feeders.map((feeder) => (
            <li
              key={feeder}
              className={`whitespace-nowrap border-[2.5px] border-foreground px-5 py-[clamp(0.6rem,1.6vh,1rem)] text-foreground ${boxText}`}
            >
              {feeder}
            </li>
          ))}
        </ul>

        <FeedArrows />

        <div className="aspect-[5/4] w-full max-w-[min(30rem,50vw,calc(46vh*5/4))] shrink-0 border-[2.5px] border-primary p-[clamp(1rem,2.5vw,1.75rem)]">
          <div className="grid h-full w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] grid-rows-3 items-center justify-items-center gap-x-[clamp(0.5rem,1.5vw,1.25rem)]">
            <div className={cornerWord}>Build</div>
            <LoopArrow Icon={ArrowRight} />
            <div className={cornerWord}>Verify</div>

            <LoopArrow Icon={ArrowUp} />
            <div />
            <LoopArrow Icon={ArrowDown} />

            <div className={cornerWord}>Learn</div>
            <LoopArrow Icon={ArrowLeft} />
            <div className={cornerWord}>Ship</div>
          </div>
        </div>

        <ArrowRight
          aria-hidden="true"
          strokeWidth={2}
          className="hidden h-[clamp(1.5rem,2.4vw,2.25rem)] w-[clamp(1.5rem,2.4vw,2.25rem)] shrink-0 text-primary lg:block"
        />

        <div className="flex w-full flex-col items-stretch gap-[clamp(0.4rem,1.2vh,0.75rem)] lg:w-[clamp(11rem,17vw,17rem)] lg:shrink-0">
          <div
            className={`border-[2.5px] border-primary bg-[var(--card)] px-5 py-[clamp(0.6rem,1.6vh,1rem)] text-primary ${boxText}`}
          >
            Pull request, ready to merge
          </div>
          <ArrowDown
            aria-hidden="true"
            strokeWidth={1.75}
            className="mx-auto h-[clamp(1.25rem,2vw,1.75rem)] w-[clamp(1.25rem,2vw,1.75rem)] text-[var(--hair)]"
          />
          <div
            className={`border-2 border-dashed border-[var(--hair)] px-5 py-[clamp(0.6rem,1.6vh,1rem)] italic text-muted-foreground ${boxText} font-normal`}
          >
            Auto-merge?
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}
