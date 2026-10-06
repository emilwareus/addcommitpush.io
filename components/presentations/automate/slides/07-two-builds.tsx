import { InkTag, SlideFrame, SlideHeading } from '../shared';

const builds = [
  { tag: 'Live build 1', title: 'Ask the archive. Get the page.' },
  { tag: 'Live build 2', title: 'An AI colleague for the product manager' },
] as const;

export function TwoBuildsSlide() {
  return (
    <SlideFrame center>
      <SlideHeading title="Now we build two" size={80} />
      <div className="flex gap-[24px]">
        {builds.map((build) => (
          <div key={build.tag} className="oz-card flex flex-1 flex-col gap-[28px] p-[40px]">
            <InkTag>{build.tag}</InkTag>
            <p className="oz-serif text-[44px] leading-[56px]">{build.title}</p>
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}
