import { Fragment } from 'react';
import { InkTag, SlideFrame, SlideHeading } from '../shared';

const nodes = [
  { text: 'Request from the business arrives', approval: false },
  { text: 'Match the backlog, spot duplicates', approval: false },
  { text: 'Draft priority and a reply', approval: false },
  { text: 'You approve, then the backlog updates', approval: true },
] as const;

export function LiveColleagueSlide() {
  return (
    <SlideFrame center>
      <div className="flex flex-col gap-[24px]">
        <InkTag>Live build 2 · synthetic data</InkTag>
        <SlideHeading title="An AI colleague for the product manager" size={64} />
      </div>
      <div className="oz-ink-panel flex flex-col items-center gap-[28px] p-[40px]">
        <div className="flex items-center gap-[18px]">
          {nodes.map((node, index) => (
            <Fragment key={node.text}>
              {index > 0 ? <span className="h-[2px] w-[26px] bg-[#BDBDBD]" /> : null}
              <div
                className="oz-node w-[250px] px-[20px] py-[18px] text-[21px] leading-[29px] text-[#333333]"
                style={node.approval ? { borderColor: '#C8E7FF' } : undefined}
              >
                {node.text}
              </div>
            </Fragment>
          ))}
        </div>
        <div
          className="oz-node flex w-[780px] items-center justify-between px-[22px] py-[18px]"
          style={{ background: '#FFFFFF' }}
        >
          <span className="text-[22px] text-[#555555]">What needs my attention today?</span>
          <span className="flex items-center gap-[14px]">
            <span className="oz-pill bg-[#F0F1F2] px-[12px] py-[5px] text-[16px] text-[#777777]">
              Live voice
            </span>
            <span className="oz-pill inline-block h-[36px] w-[36px] bg-[#121212]" />
          </span>
        </div>
      </div>
    </SlideFrame>
  );
}
