'use client';

import Image from 'next/image';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useSlideStep } from '@/components/presentations/shared/presentation-layout';
import { automateBasePath } from '@/lib/presentations/automate';
import { OzStage } from '../stage';

// Story, one step per arrow press (count lives in lib/presentations/automate.ts):
// 0 systems, 1 events arrive one by one at the top of the queue, 2-4 look inside three
// artifacts, 5 a workflow triggers on an event, 6 it reads history and decides,
// 7 it publishes its own event on top of the queue, 8 that event reaches the outside world,
// 9 a new reading shows the unit is back to normal, 10 that outcome teaches the agent.

// Only integrations OAIZ ships; custom systems and sensors arrive through webhooks.
type Source = 'microsoft' | 'google-calendar' | 'attio' | 'google-drive' | 'slack' | 'own';

const systems: readonly { source: Source; label: string }[] = [
  { source: 'microsoft', label: 'Outlook' },
  { source: 'google-calendar', label: 'Calendar' },
  { source: 'attio', label: 'Attio CRM' },
  { source: 'google-drive', label: 'Drive' },
  { source: 'slack', label: 'Slack' },
  { source: 'own', label: 'Your systems' },
];

type EventId = 'question' | 'contract' | 'deal' | 'flag' | 'slot' | 'hot' | 'normal';

// Oldest first. Each new event lands on top and pushes the rest down.
const arrivals: readonly { id: EventId; source: Source; text: string; time: string }[] = [
  { id: 'question', source: 'microsoft', text: 'Customer asks about delivery', time: '08:55' },
  { id: 'contract', source: 'google-drive', text: 'Service contract updated', time: '09:12' },
  { id: 'deal', source: 'attio', text: 'Deal moved to negotiation', time: '09:40' },
  { id: 'flag', source: 'slack', text: 'Team flags a noisy unit', time: '10:05' },
  { id: 'slot', source: 'google-calendar', text: 'Service slot opens Thursday', time: '10:20' },
  { id: 'hot', source: 'own', text: 'Unit 42 runs hot', time: '10:31' },
];

const arrivalGapMs = 1000;
const firstArrivalMs = 300;

const tileTop = (index: number) => 214 + index * 100;
const tileMid = (index: number) => tileTop(index) + 38;
const slotTop = (slot: number) => 248 + slot * 64;
const slotMid = (slot: number) => slotTop(slot) + 27;
const arrivalIndexOf = (source: Source) => arrivals.findIndex((event) => event.source === source);
const arrivalDelay = (source: Source) => firstArrivalMs + arrivalIndexOf(source) * arrivalGapMs;

function fade(shown: boolean, delay = 0): CSSProperties {
  return {
    opacity: shown ? 1 : 0,
    transform: shown ? 'none' : 'translateY(8px)',
    transition: `opacity 450ms ease ${delay}ms, transform 450ms ease ${delay}ms`,
  };
}

// How many events have arrived. The arrival sequence plays when the slide reaches step 1.
function useArrivals(step: number) {
  const [played, setPlayed] = useState(0);

  useEffect(() => {
    if (step !== 1) return;
    const timers = [
      setTimeout(() => setPlayed(0), 0),
      ...arrivals.map((_, index) =>
        setTimeout(() => setPlayed(index + 1), firstArrivalMs + index * arrivalGapMs)
      ),
    ];
    return () => timers.forEach(clearTimeout);
  }, [step]);

  if (step === 0) return 0;
  return step === 1 ? played : arrivals.length;
}

function SourceIcon({ source, size }: { source: Source; size: number }) {
  if (source === 'own') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x={2} y={2} width={20} height={20} rx={5} fill="#121212" />
        <path
          d="M6 14 H9 L11 8 L13 17 L15 12 H18"
          stroke="#FFFFFF"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <Image
      src={`${automateBasePath}/sys-${source}.webp`}
      alt=""
      width={size}
      height={size}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );
}

function Arrow({
  d,
  shown,
  color = '#BCBCBC',
  width = 2,
  delay = 0,
}: {
  d: string;
  shown: boolean;
  color?: string;
  width?: number;
  delay?: number;
}) {
  return (
    <path
      d={d}
      pathLength={1}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      fill="none"
      style={{
        strokeDasharray: 1,
        strokeDashoffset: shown ? 0 : 1,
        transition: `stroke-dashoffset 600ms ease ${delay}ms`,
      }}
    />
  );
}

function Inspector({
  shown,
  top,
  title,
  children,
}: {
  shown: boolean;
  top: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className="oz-card absolute left-[830px] flex w-[560px] flex-col gap-[16px] p-[28px]"
      style={{ top, ...fade(shown) }}
    >
      <p className="text-[18px] text-[#777777]">{title}</p>
      {children}
    </div>
  );
}

function WorkflowNode({
  kind,
  top,
  shown,
  accent = false,
  children,
}: {
  kind: string;
  top: number;
  shown: boolean;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="oz-node absolute left-[872px] flex w-[560px] items-center gap-[16px] px-[22px] py-[14px]"
      style={{ top, ...(accent ? { borderColor: '#C8E7FF' } : {}), ...fade(shown) }}
    >
      <span className="w-[86px] shrink-0 text-[16px] text-[#777777]">{kind}</span>
      <span className="text-[21px] leading-[29px] text-[#222222]">{children}</span>
    </div>
  );
}

export function EventQueueSlide() {
  const step = useSlideStep();
  const arrived = useArrivals(step);
  const published = step >= 7;
  const recovered = step >= 9;
  const publishedSlot = recovered ? 1 : 0;

  // Newest on top: the recovery reading, the published event, then arrivals newest first.
  const slotOf = (index: number) => arrived - 1 - index + (published ? 1 : 0) + (recovered ? 1 : 0);
  const slotOfId = (id: EventId) => slotOf(arrivals.findIndex((event) => event.id === id));
  const inspectedId: EventId | null =
    step === 2
      ? 'contract'
      : step === 4
        ? 'deal'
        : step === 3 || step === 5 || step === 6
          ? 'hot'
          : step >= 9
            ? 'normal'
            : null;
  // The inspected event lifts out of the queue; the rest step back.
  const highlight = (id: EventId): CSSProperties => {
    if (inspectedId === null) return { outline: '4px solid transparent' };
    if (inspectedId !== id) return { opacity: 0.4, outline: '4px solid transparent' };
    const accent = id === 'normal' ? '#7BC900' : '#329CF5';
    return {
      outline: `4px solid ${accent}`,
      boxShadow: `0 0 0 12px ${id === 'normal' ? 'rgba(123, 201, 0, 0.25)' : 'rgba(50, 156, 245, 0.3)'}`,
      translate: '18px 0',
      scale: '1.06',
      zIndex: 2,
    };
  };
  const inspectorShown = step >= 2 && step <= 4;
  const reaches = (source: Source) =>
    step === 8 && (source === 'microsoft' || source === 'google-calendar');

  return (
    <OzStage background="bg-[#FFFFFF]">
      <h1 className="absolute top-[72px] left-[112px]" style={{ fontSize: 52, lineHeight: '62px' }}>
        Every change becomes an event. Events start work.
      </h1>

      {/* Systems */}
      {systems.map((system, index) => (
        <div
          key={system.source}
          className="oz-card absolute left-[112px] flex h-[76px] w-[226px] items-center gap-[14px] px-[18px]"
          style={{
            top: tileTop(index),
            ...(step === 1
              ? {
                  animation: `oz-tile-pulse 1200ms ease ${arrivalDelay(system.source) - 150}ms both`,
                }
              : {}),
            ...(step === 9 && system.source === 'own'
              ? { animation: 'oz-tile-pulse 1200ms ease 100ms both' }
              : {}),
            ...(reaches(system.source) ? { borderColor: '#329CF5', borderWidth: 2 } : {}),
          }}
        >
          <SourceIcon source={system.source} size={36} />
          <span className="text-[19px] font-medium">{system.label}</span>
        </div>
      ))}

      {/* Event queue, newest on top */}
      <div
        className="oz-ink-panel absolute top-[200px] left-[456px] h-[620px] w-[330px]"
        style={fade(step >= 1)}
      >
        <p className="px-[20px] pt-[12px] text-[14px] text-[#BDBDBD]">
          Event queue · newest on top
        </p>
      </div>
      {arrivals.map((event, index) =>
        index < arrived ? (
          <div
            key={event.id}
            className="oz-round absolute left-[470px] flex h-[54px] w-[302px] items-center gap-[10px] bg-[#FCFCFC] px-[12px]"
            style={{
              top: slotTop(slotOf(index)),
              ...highlight(event.id),
              animation: 'oz-slide-in 750ms ease backwards',
              transition:
                'top 450ms ease, translate 350ms ease, scale 350ms ease, opacity 350ms ease, outline-color 300ms ease, box-shadow 350ms ease',
            }}
          >
            <SourceIcon source={event.source} size={20} />
            <span className="flex-1 truncate text-[15px] text-[#333333]">{event.text}</span>
            <span className="text-[13px] text-[#777777]">{event.time}</span>
          </div>
        ) : null
      )}
      {published ? (
        <div
          className="oz-round absolute left-[470px] flex h-[54px] w-[302px] items-center gap-[10px] px-[12px]"
          style={{
            top: slotTop(publishedSlot),
            background: '#C8E7FF',
            opacity: recovered ? 0.4 : 1,
            animation: 'oz-slide-in-right 650ms ease 350ms backwards',
            transition: 'top 450ms ease, opacity 350ms ease',
          }}
        >
          <span className="oz-pill inline-block h-[20px] w-[20px] shrink-0 bg-[#329CF5]" />
          <span className="flex-1 truncate text-[15px] font-semibold">
            Visit booked, email sent
          </span>
          <span className="text-[13px] text-[#555555]">10:44</span>
        </div>
      ) : null}
      {recovered ? (
        <div
          className="oz-round absolute left-[470px] flex h-[54px] w-[302px] items-center gap-[10px] px-[12px]"
          style={{
            top: slotTop(0),
            background: '#EEF8DF',
            ...highlight('normal'),
            animation: 'oz-slide-in 750ms ease 200ms backwards',
            transition: 'translate 350ms ease, scale 350ms ease, box-shadow 350ms ease',
          }}
        >
          <SourceIcon source="own" size={20} />
          <span className="flex-1 truncate text-[15px] font-semibold">Unit 42 normal again</span>
          <svg width={30} height={22} viewBox="0 0 44 22" fill="none" aria-hidden="true">
            <path
              d="M2 4 L12 6 L20 11 L28 16 L36 17 L42 17"
              stroke="#4E9A00"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[13px] text-[#555555]">13:10</span>
        </div>
      ) : null}

      {/* Look inside three artifacts */}
      <Inspector
        shown={step === 2}
        top={slotMid(slotOfId('contract')) - 110}
        title="Inside the event · Drive"
      >
        <p className="text-[24px] font-medium">Service contract v3.docx</p>
        <div className="oz-round flex flex-col gap-[6px] bg-[#F0F1F2] px-[18px] py-[14px] text-[20px]">
          <span className="text-[#A23B3B] line-through">Warranty: 12 months</span>
          <span className="text-[#3C7A00]">Warranty: 24 months</span>
        </div>
        <p className="text-[18px] text-[#737373]">Changed by the sales team, 09:12</p>
      </Inspector>
      <Inspector
        shown={step === 3}
        top={slotMid(slotOfId('hot')) - 40}
        title="Inside the event · Your systems, via webhook"
      >
        <p className="text-[24px] font-medium">Unit 42 runs 6° above normal</p>
        <svg width={500} height={90} viewBox="0 0 500 90" fill="none" aria-hidden="true">
          <path d="M0 60 H500" stroke="#E5E5E5" strokeDasharray="4 6" />
          <path
            d="M0 62 L60 60 L120 63 L180 58 L240 61 L300 55 L360 44 L420 30 L480 18"
            stroke="#E175AC"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={480} cy={18} r={6} fill="#E175AC" />
        </svg>
        <p className="text-[18px] text-[#737373]">87 °C, rising for 40 minutes</p>
      </Inspector>
      <Inspector
        shown={step === 4}
        top={slotMid(slotOfId('deal')) - 110}
        title="Inside the event · Attio"
      >
        <p className="text-[24px] font-medium">Renewal, Unit 42 site</p>
        <div className="oz-round flex flex-col gap-[6px] bg-[#F0F1F2] px-[18px] py-[14px] text-[20px]">
          <span>Stage: Proposal → Negotiation</span>
          <span>Next step: service review</span>
        </div>
      </Inspector>

      {/* A simplified OAIZ workflow. It runs bottom to top and publishes beside the queue top. */}
      <div
        className="oz-ink-panel absolute top-[200px] left-[816px] h-[620px] w-[672px]"
        style={fade(step >= 5)}
      >
        <p className="px-[20px] pt-[12px] text-[14px] text-[#BDBDBD]">Workflow</p>
      </div>
      <WorkflowNode kind="Publish" top={slotTop(0) - 4} shown={published} accent>
        Visit booked, email sent
      </WorkflowNode>
      <WorkflowNode kind="Decide" top={404} shown={step >= 6}>
        Book a visit and tell the customer
      </WorkflowNode>
      <WorkflowNode kind="Agent" top={516} shown={step >= 6} accent={step >= 10}>
        <span className="flex flex-col gap-[8px]">
          <span>Read the history: last service, contract, open deal</span>
          {step >= 10 ? (
            <span
              className="oz-pill self-start bg-[#EEF8DF] px-[12px] py-[4px] text-[17px] text-[#3C7A00]"
              style={{ animation: 'oz-slide-in 600ms ease 500ms backwards' }}
            >
              Learned: a visit within two hours fixes it
            </span>
          ) : null}
        </span>
      </WorkflowNode>
      <WorkflowNode kind="Trigger" top={690} shown={step >= 5}>
        When a unit runs hot
      </WorkflowNode>

      {/* Arrows */}
      <svg
        className="pointer-events-none absolute inset-0"
        width={1600}
        height={900}
        viewBox="0 0 1600 900"
        fill="none"
        aria-hidden="true"
      >
        {systems.map((system, index) => {
          const d = `M340 ${tileMid(index)} H452`;
          return step === 1 ? (
            <path
              key={system.source}
              d={d}
              pathLength={1}
              strokeWidth={2.5}
              strokeLinecap="round"
              style={{
                strokeDasharray: 1,
                animation: `oz-arrow-in 1200ms ease ${arrivalDelay(system.source) - 250}ms both`,
              }}
            />
          ) : (
            <Arrow key={system.source} d={d} shown={step >= 1} />
          );
        })}
        <Arrow
          d={`M774 ${slotMid(slotOfId('hot'))} C 822 ${slotMid(slotOfId('hot'))}, 828 720, 870 720`}
          shown={step >= 5}
          color="#329CF5"
        />
        <Arrow d="M1152 688 V646" shown={step >= 6} color="#BDBDBD" />
        <Arrow d="M1152 514 V466" shown={step >= 6} color="#BDBDBD" delay={150} />
        <Arrow d={`M1152 402 V${slotTop(0) + 60}`} shown={published} color="#BDBDBD" />
        <Arrow
          d={`M870 ${slotMid(0)} C 830 ${slotMid(0)}, 820 ${slotMid(publishedSlot)}, 776 ${slotMid(publishedSlot)}`}
          shown={published}
          color="#329CF5"
          width={3}
        />
        <Arrow
          d={`M776 ${slotMid(0)} C 830 ${slotMid(0)}, 820 560, 870 560`}
          shown={step >= 10}
          color="#7BC900"
          width={3.5}
        />
        {inspectorShown && inspectedId ? (
          <path
            key={inspectedId}
            d={`M792 ${slotMid(slotOfId(inspectedId))} H828`}
            stroke="#329CF5"
            strokeWidth={4}
            strokeLinecap="round"
          />
        ) : null}
        <Arrow
          d={`M468 ${slotMid(0)} C 410 ${slotMid(0)}, 390 ${tileMid(0)}, 342 ${tileMid(0)}`}
          shown={step === 8}
          color="#329CF5"
          width={3}
        />
        <Arrow
          d={`M468 ${slotMid(0) + 10} C 410 ${slotMid(0) + 10}, 390 ${tileMid(1)}, 342 ${tileMid(1)}`}
          shown={step === 8}
          color="#329CF5"
          width={3}
          delay={150}
        />
      </svg>
    </OzStage>
  );
}
