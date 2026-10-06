import { CheckDot, SlideFrame, SlideHeading } from '../shared';

function FlowRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="oz-flow-card flex items-center gap-[14px] px-[18px] py-[14px] text-[21px]">
      <span className="w-[110px] shrink-0 text-[17px] text-[#777777]">{label}</span>
      {children}
    </div>
  );
}

export function WhatOaizIsSlide() {
  return (
    <SlideFrame center>
      <SlideHeading title="Describe the work. OAIZ runs it." size={64} />
      <div className="flex items-stretch gap-[24px]">
        <section className="oz-card flex w-[560px] flex-col gap-[18px] p-[32px]">
          <p className="text-[19px] text-[#777777]">You describe the work</p>
          <p className="oz-round flex-1 bg-[#F0F1F2] px-[22px] py-[18px] text-[24px] leading-[36px]">
            When a support request arrives, find the answer in our docs, draft a reply, and let me
            approve it before it goes out.
          </p>
        </section>
        <section className="oz-blue flex flex-1 flex-col gap-[14px] p-[28px]">
          <p className="text-[19px] text-[#FFFFFF]">OAIZ builds it, runs it, records every run</p>
          <FlowRow label="Trigger">A support request arrives</FlowRow>
          <FlowRow label="Workflow">
            <span className="flex items-center gap-[10px]">
              <CheckDot size={18} /> Search docs <CheckDot size={18} /> Draft reply{' '}
              <span className="oz-pill inline-block h-[18px] w-[18px] bg-[#121212]" /> You approve
            </span>
          </FlowRow>
          <FlowRow label="Outcome">Reply sent, run recorded</FlowRow>
        </section>
      </div>
    </SlideFrame>
  );
}
