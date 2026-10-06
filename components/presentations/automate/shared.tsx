import Image from 'next/image';
import type { ReactNode } from 'react';
import { automateBasePath } from '@/lib/presentations/automate';
import { OzStage } from './stage';

const assets = automateBasePath;

export function SlideFrame({
  children,
  center = false,
}: {
  children: ReactNode;
  center?: boolean;
}) {
  return (
    <OzStage background="bg-[#FFFFFF]">
      <div
        className={`flex h-full flex-col gap-[56px] px-[112px] py-[72px] ${
          center ? 'justify-center' : ''
        }`}
      >
        {children}
      </div>
    </OzStage>
  );
}

export function SunsetFrame({ sunY, children }: { sunY: string; children: ReactNode }) {
  return (
    <OzStage
      background="oz-sunset"
      backgroundStyle={{ ['--oz-sun-y' as string]: sunY }}
      backdrop={<Palms />}
    >
      <div className="relative flex h-full flex-col justify-between px-[112px] py-[72px]">
        {children}
      </div>
    </OzStage>
  );
}

// Headline only. Slides carry no subheaders; the speaker says the rest.
export function SlideHeading({
  title,
  size = 56,
  centered = false,
}: {
  title: string;
  size?: number;
  centered?: boolean;
}) {
  return (
    <h1
      className={centered ? 'text-center' : ''}
      style={{ fontSize: size, lineHeight: `${Math.round(size * 1.18)}px` }}
    >
      {title}
    </h1>
  );
}

export function InkTag({ children }: { children: ReactNode }) {
  return (
    <div className="oz-tag self-start px-[16px] py-[8px] text-[20px] font-medium">{children}</div>
  );
}

export function GreyPill({
  children,
  tone = 'grey',
}: {
  children: ReactNode;
  tone?: 'grey' | 'white';
}) {
  return (
    <span
      className={`oz-pill px-[12px] py-[5px] text-[16px] text-[#383838] ${
        tone === 'grey' ? 'bg-[#F0F1F2]' : 'bg-[#FFFFFF]'
      }`}
    >
      {children}
    </span>
  );
}

export function CheckDot({ size = 22 }: { size?: number }) {
  return <span className="oz-dot inline-block shrink-0" style={{ width: size, height: size }} />;
}

export function Wordmark() {
  return (
    <Image
      src={`${assets}/oaiz-wordmark.svg`}
      alt="oaiz"
      width={146}
      height={56}
      unoptimized
      className="relative z-10"
    />
  );
}

export function ToolLogo({ name, alt }: { name: string; alt: string }) {
  return <Image src={`${assets}/logo-${name}.png`} alt={alt} width={34} height={34} />;
}

function Palms() {
  return (
    <>
      <Image
        src={`${assets}/palm-leaning-left.svg`}
        alt=""
        aria-hidden="true"
        width={300}
        height={722}
        unoptimized
        className="pointer-events-none absolute -bottom-[90px] -left-[60px]"
      />
      <Image
        src={`${assets}/palm-leaning-right.svg`}
        alt=""
        aria-hidden="true"
        width={250}
        height={602}
        unoptimized
        className="pointer-events-none absolute -right-[50px] -bottom-[170px]"
      />
    </>
  );
}
