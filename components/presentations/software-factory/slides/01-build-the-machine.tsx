import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import { SlideFrame } from './shared';

const cornerWord =
  'text-center font-serif text-[clamp(1.85rem,3.2vw,3.25rem)] font-bold uppercase leading-none text-primary';

function LoopArrow({ Icon }: { Icon: typeof ArrowRight }) {
  return (
    <Icon
      aria-hidden="true"
      strokeWidth={1.75}
      className="h-[clamp(1.5rem,2.4vw,2.25rem)] w-[clamp(1.5rem,2.4vw,2.25rem)] text-primary"
    />
  );
}

export function BuildTheMachineSlide() {
  return (
    <SlideFrame>
      <h2 className="text-[clamp(2.5rem,6vw,6.5rem)] font-bold leading-[1.1] tracking-[-0.035em]! text-primary">
        Build the machine
      </h2>

      <div className="mx-auto aspect-[5/4] w-full max-w-[min(40rem,68vw,calc(52vh*5/4))] border-2 border-primary p-[clamp(1.25rem,3vw,2rem)]">
        <div className="grid h-full w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] grid-rows-3 items-center justify-items-center gap-x-[clamp(0.75rem,2vw,1.5rem)]">
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
    </SlideFrame>
  );
}
