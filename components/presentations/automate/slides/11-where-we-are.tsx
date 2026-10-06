import Image from 'next/image';
import { automateBasePath } from '@/lib/presentations/automate';
import { OzStage } from '../stage';

const journey = [
  'One year building',
  'A first handful of customers',
  'Municipalities and AI-native companies',
  'Just raised capital, first recruits',
] as const;

export function WhereWeAreSlide() {
  return (
    <OzStage
      background="oz-dawn"
      backdrop={
        <>
          <div className="oz-sun-glow absolute" />
          <div className="oz-sun-rise absolute" />
        </>
      }
    >
      <div className="absolute top-[88px] left-[112px] flex w-[720px] flex-col gap-[40px]">
        <h1 style={{ fontSize: 72, lineHeight: '84px' }}>Let humans do human work.</h1>
        <ul className="flex flex-col gap-[14px] text-[24px] leading-[32px] text-[#222222]">
          {journey.map((item) => (
            <li key={item} className="flex items-center gap-[18px]">
              <span className="oz-pill h-[12px] w-[12px] bg-[#121212]" />
              {item}
            </li>
          ))}
          <li className="flex items-center gap-[18px] font-semibold">
            <span
              className="oz-dot h-[12px] w-[12px]"
              style={{ boxShadow: '0 0 0 5px rgba(123, 201, 0, 0.25)' }}
            />
            Next step: More design partners
          </li>
        </ul>
        <p
          className="oz-serif w-[700px] text-[32px] leading-[44px]"
          style={{ letterSpacing: '-0.02em' }}
        >
          Right path or wrong one? Let&apos;s build something together.
        </p>
      </div>

      <Image
        src={`${automateBasePath}/founders-walking.jpg`}
        alt="The four OAIZ founders walking together"
        width={1024}
        height={768}
        priority
        className="absolute top-[88px] left-[904px] h-[600px] w-[600px] object-cover"
        style={{ borderRadius: 24 }}
      />
    </OzStage>
  );
}
