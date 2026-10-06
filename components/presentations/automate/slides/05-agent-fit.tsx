'use client';

import type { ReactNode } from 'react';
import { useSlideStep } from '@/components/presentations/shared/presentation-layout';
import { automateBasePath } from '@/lib/presentations/automate';
import { SlideFrame, SlideHeading } from '../shared';

// Reveal order, one step per arrow press:
// 0 does it repeat, 1 no -> know or do, 2 chat, 3 tool agent,
// 4 yes -> react on change, 5 scheduled agent, 6 agentic workflow.
// The step count lives in lib/presentations/automate.ts.

const sans = 'var(--font-oz-sans)';
const serif = 'var(--font-oz-serif)';

function Reveal({ at, children }: { at: number; children: ReactNode }) {
  const step = useSlideStep();
  const shown = step >= at;
  return (
    <g
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateX(0)' : 'translateX(-12px)',
        transition: 'opacity 450ms ease, transform 450ms ease',
      }}
    >
      {children}
    </g>
  );
}

function Branch({ d, label, x, y }: { d: string; label: string; x: number; y: number }) {
  return (
    <>
      <path d={d} stroke="#BCBCBC" strokeWidth={2} strokeLinecap="round" fill="none" />
      <text x={x} y={y} fontFamily={sans} fontSize={20} fill="#737373" textAnchor="middle">
        {label}
      </text>
    </>
  );
}

function Question({ y, children }: { y: number; children: string }) {
  return (
    <>
      <rect
        x={381}
        y={y - 47}
        width={278}
        height={94}
        rx={20}
        fill="#FFFFFF"
        stroke="#E5E5E5"
        strokeWidth={1.5}
      />
      <text x={520} y={y + 9} fontFamily={serif} fontSize={26} fill="#222222" textAnchor="middle">
        {children}
      </text>
    </>
  );
}

function Leaf({
  y,
  children,
  primary = false,
}: {
  y: number;
  children: string;
  primary?: boolean;
}) {
  return (
    <>
      <rect
        x={761}
        y={y - 36}
        width={258}
        height={72}
        rx={primary ? 12 : 36}
        fill={primary ? '#121212' : '#FFFFFF'}
        stroke={primary ? 'none' : '#E5E5E5'}
        strokeWidth={1.5}
      />
      <text
        x={890}
        y={y + 8}
        fontFamily={sans}
        fontSize={24}
        fontWeight={primary ? 600 : 500}
        fill={primary ? '#FFFFFF' : '#222222'}
        textAnchor="middle"
      >
        {children}
      </text>
    </>
  );
}

function Logo({ name, x, y, size = 36 }: { name: string; x: number; y: number; size?: number }) {
  return (
    <image
      href={`${automateBasePath}/logo-${name}.png`}
      x={x}
      y={y - size / 2}
      width={size}
      height={size}
      preserveAspectRatio="xMidYMid meet"
    />
  );
}

function ProductChip({ logo, name, y }: { logo: string; name: string; y: number }) {
  return (
    <>
      <rect
        x={1045}
        y={y - 18}
        width={124}
        height={36}
        rx={18}
        fill="#FFFFFF"
        stroke="#E5E5E5"
        strokeWidth={1.5}
      />
      <Logo name={logo} x={1052} y={y} size={24} />
      <text x={1084} y={y + 6} fontFamily={sans} fontSize={18} fontWeight={500} fill="#222222">
        {name}
      </text>
    </>
  );
}

function Mode({ y, children, strong = false }: { y: number; children: string; strong?: boolean }) {
  return (
    <text
      x={1196}
      y={y + 8}
      fontFamily={sans}
      fontSize={22}
      fontWeight={strong ? 600 : 400}
      fill={strong ? '#222222' : '#737373'}
      textAnchor="start"
    >
      {children}
    </text>
  );
}

function DecisionTree() {
  return (
    <svg
      width="1376"
      height="580"
      viewBox="0 0 1376 580"
      fill="none"
      role="img"
      aria-label="Does it repeat? No: if you need to know something use chat, if you need something done use a tool agent. Yes: if it should react when something changes use an agentic workflow, otherwise a scheduled agent."
    >
      <Reveal at={0}>
        <rect
          x={1}
          y={242}
          width={268}
          height={96}
          rx={20}
          fill="#FFFFFF"
          stroke="#E5E5E5"
          strokeWidth={1.5}
        />
        <text x={135} y={299} fontFamily={serif} fontSize={26} fill="#222222" textAnchor="middle">
          Does it repeat?
        </text>
      </Reveal>

      <Reveal at={1}>
        <Branch
          d="M270 290 H310 Q320 290 320 280 V155 Q320 145 330 145 H380"
          label="no"
          x={352}
          y={134}
        />
        <Question y={145}>Know or do?</Question>
      </Reveal>
      <Reveal at={2}>
        <Branch
          d="M660 145 H700 Q710 145 710 135 V80 Q710 70 720 70 H760"
          label="know"
          x={730}
          y={59}
        />
        <Leaf y={70}>Chat</Leaf>
        <Logo name="chatgpt" x={1045} y={70} size={32} />
        <Logo name="claude" x={1083} y={70} size={32} />
        <Logo name="gemini" x={1121} y={70} size={32} />
        <Mode y={70}>Explore</Mode>
      </Reveal>
      <Reveal at={3}>
        <Branch
          d="M700 145 Q710 145 710 155 V210 Q710 220 720 220 H760"
          label="do"
          x={730}
          y={209}
        />
        <Leaf y={220}>Tool agent</Leaf>
        <ProductChip logo="chatgpt" name="Codex" y={200} />
        <ProductChip logo="claude" name="Cowork" y={242} />
        <Mode y={220}>Delegate</Mode>
      </Reveal>

      <Reveal at={4}>
        <Branch
          d="M310 290 Q320 290 320 300 V425 Q320 435 330 435 H380"
          label="yes"
          x={352}
          y={424}
        />
        <Question y={435}>React on change?</Question>
      </Reveal>
      <Reveal at={5}>
        <Branch
          d="M660 435 H700 Q710 435 710 425 V370 Q710 360 720 360 H760"
          label="no"
          x={730}
          y={349}
        />
        <Leaf y={360}>Scheduled agent</Leaf>
        <Logo name="scheduled-agent" x={1045} y={360} size={32} />
        <Logo name="oaiz-palm" x={1083} y={360} size={32} />
      </Reveal>
      <Reveal at={6}>
        <Branch
          d="M700 435 Q710 435 710 445 V500 Q710 510 720 510 H760"
          label="yes"
          x={730}
          y={499}
        />
        <Leaf y={510} primary>
          Agentic workflow
        </Leaf>
        <Logo name="oaiz-palm" x={1045} y={510} size={32} />
        <path d="M1182 330 V540" stroke="#222222" strokeWidth={2} strokeLinecap="round" />
        <Mode y={435} strong>
          Operationalize
        </Mode>
      </Reveal>
    </svg>
  );
}

export function AgentFitSlide() {
  return (
    <SlideFrame center>
      <SlideHeading title="Pick the agent by the problem" />
      <DecisionTree />
    </SlideFrame>
  );
}
