import { Label, SlideFrame, leverageRegionOrder, leverageRegions, leverageWedges } from './shared';

export function LeverageSlide() {
  return (
    <SlideFrame heading={{ title: 'The leverage' }}>
      <div className="grid grid-cols-3 grid-rows-[auto_auto_auto_auto]">
        {leverageRegionOrder.map((id) => {
          const region = leverageRegions[id];
          const wedge = leverageWedges[id];

          return (
            <div key={id} className="row-span-4 grid grid-rows-subgrid">
              <svg
                viewBox="0 0 100 120"
                preserveAspectRatio="none"
                className="block h-[clamp(4rem,12vh,7.5rem)] w-full"
                aria-hidden="true"
              >
                <polygon
                  points={wedge.points}
                  className="fill-primary"
                  fillOpacity={wedge.opacity}
                />
              </svg>

              <div className="px-[clamp(0.5rem,1.4vw,1.25rem)] pt-[clamp(1rem,3vh,2rem)]">
                <div className="font-serif text-[clamp(2rem,5vw,4.75rem)] font-bold uppercase leading-none text-primary">
                  {region.weight}
                </div>
              </div>

              <ul className="px-[clamp(0.5rem,1.4vw,1.25rem)] pt-[clamp(0.75rem,2.5vh,1.5rem)] space-y-1 font-mono text-[clamp(0.8rem,1.15vw,1.15rem)] leading-tight whitespace-nowrap text-foreground">
                {region.levers.map((lever) => (
                  <li key={lever}>{lever}</li>
                ))}
              </ul>

              <Label className="px-[clamp(0.5rem,1.4vw,1.25rem)] pt-[clamp(1.5rem,4.5vh,2.5rem)]">
                {region.part} / {region.chapter}
              </Label>
            </div>
          );
        })}
      </div>
    </SlideFrame>
  );
}
