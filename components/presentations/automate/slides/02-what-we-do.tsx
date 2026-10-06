import Image from 'next/image';
import { automateBasePath } from '@/lib/presentations/automate';
import { OzStage } from '../stage';

const art = automateBasePath;

// Positions follow the OAIZ sales deck statement slide, scaled from 1440x810 to 1600x900.
export function WhatWeDoSlide() {
  return (
    <OzStage background="oz-cream">
      <Image
        src={`${art}/oaiz-wordmark.svg`}
        alt="oaiz"
        width={70}
        height={27}
        unoptimized
        className="absolute top-[74px] left-[1430px]"
      />
      <h1
        className="absolute top-[314px] left-[92px] w-[760px] text-[#141414]"
        style={{ fontSize: 66, lineHeight: '80px', letterSpacing: '-0.02em' }}
      >
        We help organizations automate difficult tasks worth solving
      </h1>
      <Image
        src={`${art}/palms-right.png`}
        alt=""
        aria-hidden="true"
        width={447}
        height={597}
        className="absolute top-[313px] left-[1152px]"
      />
    </OzStage>
  );
}
