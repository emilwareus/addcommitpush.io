import { SunsetFrame, Wordmark } from '../shared';

export function QuestionsSlide() {
  return (
    <SunsetFrame sunY="85%">
      <Wordmark />
      <div className="relative z-10 flex flex-col items-center gap-[28px] pb-[80px] text-center">
        <h1 className="w-[1000px]" style={{ fontSize: 96, lineHeight: '108px' }}>
          What would you automate first?
        </h1>
      </div>
      <div className="relative z-10 flex items-center justify-center gap-[20px]">
        <span className="text-[22px] text-[#383838]">Emil Wåreus · emil@oaiz.io</span>
        <span className="oz-tag px-[20px] py-[10px] text-[20px] font-medium">oaiz.io</span>
      </div>
    </SunsetFrame>
  );
}
