import { CheckDot, GreyPill, InkTag, SlideFrame, SlideHeading } from '../shared';

function FlowRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="oz-flow-card flex items-center gap-[14px] px-[18px] py-[14px] text-[21px]">
      <span className="w-[110px] text-[17px] text-[#777777]">{label}</span>
      {children}
    </div>
  );
}

export function LiveArchiveSlide() {
  return (
    <SlideFrame center>
      <div className="flex flex-col gap-[20px]">
        <InkTag>Live build 1 · synthetic data</InkTag>
        <SlideHeading title="Ask the archive. Get the page." size={64} />
      </div>
      <div className="flex gap-[24px]">
        <section className="oz-card flex w-[660px] flex-col gap-[18px] p-[32px]">
          <p className="text-[19px] text-[#777777]">What a service technician sees</p>
          <p className="oz-round self-end bg-[#F0F1F2] px-[20px] py-[14px] text-[22px]">
            Which spare parts went into order 4711?
          </p>
          <div className="oz-round flex flex-col gap-[12px] border border-[#E5E5E5] bg-[#FCFDFF] px-[20px] py-[18px]">
            <p className="text-[22px] leading-[32px]">Shaft seal kit ×2 and one impeller.</p>
            <div className="flex gap-[8px]">
              <GreyPill>Source: order 4711, scanned 1998, page 3</GreyPill>
              <span className="oz-pill bg-[#C8E7FF] px-[12px] py-[5px] text-[16px] text-[#383838]">
                Service view
              </span>
            </div>
          </div>
          <p className="text-[19px] leading-[28px] text-[#737373]">
            Sales asking the same question sees prices, not drawings.
          </p>
        </section>
        <section className="oz-blue flex flex-1 flex-col gap-[14px] p-[28px]">
          <p className="text-[19px] text-[#FFFFFF]">What we build live to get there</p>
          <FlowRow label="Trigger">A scanned document lands</FlowRow>
          <FlowRow label="Workflow">
            <span className="flex items-center gap-[10px]">
              <CheckDot size={18} /> Read <CheckDot size={18} /> Classify <CheckDot size={18} />{' '}
              Extract
            </span>
          </FlowRow>
          <FlowRow label="Outcome">Searchable, with access by role</FlowRow>
          <div className="flex gap-[8px]">
            <GreyPill tone="white">Knowledge</GreyPill>
            <GreyPill tone="white">Database</GreyPill>
            <GreyPill tone="white">Login app</GreyPill>
          </div>
        </section>
      </div>
    </SlideFrame>
  );
}
