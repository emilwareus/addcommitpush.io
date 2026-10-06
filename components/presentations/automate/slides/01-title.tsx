import Image from 'next/image';
import { automateBasePath } from '@/lib/presentations/automate';
import { OzStage } from '../stage';

const art = automateBasePath;

// Composition follows the OAIZ sales deck title slide, scaled from 1440x810 to 1600x900.
// Everything is scenery anchored to the screen's bottom centre and side edges, so the
// sea and palms reach the edges of any screen.
export function TitleSlide() {
  return (
    <OzStage
      background="oz-dawn"
      backdrop={
        <>
          <Image
            src={`${art}/sun.png`}
            alt=""
            width={1008}
            height={549}
            className="absolute bottom-[160px] left-1/2 ml-[-520px]"
          />
          <Image
            src={`${art}/sea.png`}
            alt=""
            width={1630}
            height={254}
            className="absolute right-[-15px] bottom-[-10px] left-[-15px] h-[254px] w-auto"
          />
          <Image
            src={`${art}/oaiz-wordmark-hero.png`}
            alt="oaiz"
            width={234}
            height={90}
            className="absolute bottom-[376px] left-1/2 ml-[-126px]"
          />
          <Image
            src={`${art}/palms-left.png`}
            alt=""
            width={676}
            height={887}
            className="absolute bottom-[-233px] left-[-58px]"
          />
          <Image
            src={`${art}/palms-right.png`}
            alt=""
            width={447}
            height={597}
            className="absolute right-[1px] bottom-[-10px]"
          />
          <h1
            className="absolute right-0 bottom-[332px] left-0 text-center text-[#141414]"
            style={{ fontSize: 30, lineHeight: '38px', letterSpacing: '-0.01em' }}
          >
            Automate something important
          </h1>
        </>
      }
    />
  );
}
