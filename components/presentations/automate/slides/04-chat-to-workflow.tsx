'use client';

import Image from 'next/image';
import { useEffect, useState, type CSSProperties } from 'react';
import {
  ArrowUp,
  AudioLines,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  Logs,
  Mic,
  Paperclip,
  Play,
} from 'lucide-react';
import { useSlideStep } from '@/components/presentations/shared/presentation-layout';
import { automateBasePath } from '@/lib/presentations/automate';
import { OzStage } from '../stage';

// A recreation of the OAIZ builder (oaiz-frontend: chat composer, agent activity feed,
// xyflow canvas with job nodes, review dock and test run), at real component sizes and
// scaled 1.3x to fill the slide. Steps (count in lib/presentations/automate.ts):
// 0 empty chat, 1 the brief is typed, 2 OAIZ generates the workflow,
// 3 the changes are kept, 4 a test run.

const scale = 1.3;
const appWidth = 1230;
const appHeight = 692;
const panelWidth = 340;

const brief =
  'When a support request lands in Gmail, triage it with an AI agent, create a Linear issue, post it to Slack and draft a reply to the customer.';

const ocean = '#007ae6';
const info = '#1c9dff';
const edgeGrey = '#8a8a8a';
const muted = '#67676f';
const border = '#e4e4e7';

type NodeId = 'trigger' | 'agent' | 'linear' | 'gmail' | 'slack';
type RunStatus = 'idle' | 'queued' | 'running' | 'succeeded';

const nodes: readonly {
  id: Exclude<NodeId, 'trigger'>;
  x: number;
  y: number;
  logo: string;
  text: string;
  action: string;
}[] = [
  {
    id: 'agent',
    x: 204,
    y: 300,
    logo: 'openai',
    text: 'Triage the support request: urgency, product area and duplicates.',
    action: 'Agent',
  },
  {
    id: 'linear',
    x: 436,
    y: 150,
    logo: 'linear',
    text: 'Create a Linear issue with the triage summary.',
    action: 'Save Issue',
  },
  {
    id: 'gmail',
    x: 436,
    y: 450,
    logo: 'gmail',
    text: 'Draft a reply to the customer with next steps.',
    action: 'Create Draft',
  },
  {
    id: 'slack',
    x: 668,
    y: 150,
    logo: 'slack',
    text: 'Post the new Linear issue link to #support.',
    action: 'Send Message',
  },
];

// Generation timeline (ms into step 2): when each node lands on the canvas.
const nodeArrivalMs: Record<NodeId, number> = {
  trigger: 2300,
  agent: 2800,
  linear: 3300,
  gmail: 3800,
  slack: 4300,
};
const generationDoneMs = 5600;

// Test run timeline (ms into step 4).
const runStartMs = 900;
const runWindows: Record<NodeId, [number, number]> = {
  trigger: [900, 1400],
  agent: [1400, 3000],
  linear: [3000, 4400],
  gmail: [3000, 4600],
  slack: [4400, 5800],
};
const runDoneMs = 6200;

const feed: readonly { label: string; doneLabel: string; start: number; end: number }[] = [
  { label: 'Planning workflow', doneLabel: 'Planning workflow', start: 500, end: 1700 },
  { label: 'Generating workflow', doneLabel: 'Generated workflow', start: 1700, end: 5200 },
  ...(['trigger', 'agent', 'linear', 'gmail', 'slack'] as const).map((id) => ({
    label: 'Adding Node',
    doneLabel: 'Adding Node',
    start: nodeArrivalMs[id] - 300,
    end: nodeArrivalMs[id] + 150,
  })),
];

// Milliseconds since the current step began; resets on every step change.
function useStepClock(step: number) {
  const [clock, setClock] = useState({ step: -1, t: 0 });
  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => setClock({ step, t: performance.now() - start }), 50);
    return () => clearInterval(id);
  }, [step]);
  return clock.step === step ? clock.t : 0;
}

function Logo({ name, size }: { name: string; size: number }) {
  return (
    <Image
      src={`${automateBasePath}/app-${name}.webp`}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: 6, objectFit: 'contain' }}
    />
  );
}

function Composer({ text, typing }: { text: string; typing: boolean }) {
  const hasDraft = text.length > 0;
  return (
    <div className="oz-app-composer flex w-full flex-col gap-2 p-[12px]">
      <div className="flex w-full items-start gap-2">
        <p className="min-h-[40px] flex-1 text-[14px] leading-[20px]">
          {hasDraft ? (
            <>
              {text}
              {typing ? <span className="oz-app-caret">|</span> : null}
            </>
          ) : (
            <span style={{ color: muted }}>Type or @ to tag</span>
          )}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <span className="flex h-8 w-8 items-center justify-center">
            <Mic className="h-4 w-4" />
          </span>
          {hasDraft ? (
            <span
              className="flex h-8 w-8 items-center justify-center text-[#ffffff]"
              style={{ borderRadius: 999, background: '#09090b' }}
            >
              <ArrowUp className="h-5 w-5" />
            </span>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center">
              <AudioLines className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <span
          className="flex h-8 items-center gap-1.5 bg-[#FFFFFF] px-2 text-[14px] font-medium"
          style={{ border: '1px solid rgba(228,228,231,0.6)', borderRadius: 8 }}
        >
          Auto <ChevronDown className="h-3 w-3" />
        </span>
        <span className="flex h-8 items-center gap-1.5 px-2" style={{ color: muted }}>
          <Logo name="openai" size={14} />
          <ChevronDown className="h-3 w-3" />
        </span>
        <span className="flex h-8 w-8 items-center justify-center">
          <Paperclip className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

function FeedLine({
  label,
  running,
  seconds,
}: {
  label: string;
  running: boolean;
  seconds: string;
}) {
  return (
    <div className="flex h-5 items-center gap-1.5 text-[12px]" style={{ color: muted }}>
      <span>{label}</span>
      {running ? (
        <Loader2 className="oz-app-spin h-3 w-3" style={{ color: 'rgba(103,103,111,0.6)' }} />
      ) : (
        <span style={{ color: 'rgba(103,103,111,0.5)' }}>{seconds}</span>
      )}
    </div>
  );
}

function NodeCard({
  x,
  y,
  logo,
  text,
  action,
  isNew,
  status,
  delay,
}: {
  x: number;
  y: number;
  logo: string;
  text: string;
  action: string;
  isNew: boolean;
  status: RunStatus;
  delay: number;
}) {
  const running = status === 'running';
  const cardStyle: CSSProperties = {
    left: x,
    top: y,
    width: 180,
    height: 212,
    animationDelay: `${delay}ms`,
    ...(isNew ? { borderColor: 'rgba(0,122,230,0.5)' } : {}),
  };
  return (
    <div
      className={`oz-app-card oz-app-enter absolute flex flex-col overflow-hidden ${running ? 'oz-app-running' : ''}`}
      style={cardStyle}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-[14px]">
        <div className="flex min-h-6 items-center gap-2">
          <Logo name={logo} size={20} />
          {isNew ? (
            <span
              className="inline-flex items-center px-2 py-[3px] text-[12px] font-medium text-[#ffffff]"
              style={{ background: ocean, borderRadius: 999 }}
            >
              New
            </span>
          ) : null}
        </div>
        <p
          className="text-[14px] leading-5"
          style={{ color: running ? muted : '#09090b', transition: 'color 400ms' }}
        >
          {text}
        </p>
      </div>
      <div
        className="flex h-9 items-center gap-2 px-3 pt-1.5 pb-2 text-[12px]"
        style={{ borderTop: `1px solid ${isNew ? 'rgba(0,122,230,0.5)' : border}` }}
      >
        {status === 'running' ? (
          <>
            <Loader2 className="oz-app-spin h-4 w-4" style={{ color: info }} />
            <span className="oz-app-shimmer font-medium">Running</span>
          </>
        ) : status === 'succeeded' ? (
          <>
            <Check className="h-4 w-4" style={{ color: info }} />
            <span className="font-medium">Successful</span>
          </>
        ) : status === 'queued' ? (
          <>
            <Clock className="h-4 w-4" style={{ color: muted }} />
            <span className="font-medium" style={{ color: muted }}>
              In queue
            </span>
          </>
        ) : (
          <span>{action}</span>
        )}
      </div>
    </div>
  );
}

function Edge({ d, color }: { d: string; color: string }) {
  return (
    <path
      d={d}
      stroke={color}
      strokeWidth={1.5}
      fill="none"
      style={{ transition: 'stroke 400ms' }}
    />
  );
}

function Handle({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <circle
      cx={x}
      cy={y}
      r={3}
      fill="#ffffff"
      stroke={color}
      strokeWidth={1.5}
      style={{ transition: 'stroke 400ms' }}
    />
  );
}

function Flower() {
  return (
    <svg width={42} height={42} viewBox="0 0 42 42" aria-hidden="true">
      <g style={{ transformOrigin: '21px 21px', animation: 'oz-app-spin 8s linear infinite' }}>
        {[0, 45, 90, 135].map((angle) => (
          <ellipse
            key={angle}
            cx={21}
            cy={21}
            rx={19}
            ry={11}
            fill={ocean}
            transform={`rotate(${angle} 21 21)`}
          />
        ))}
      </g>
      <path d="M17 14 L28 21 L17 28 Z" fill="#ffffff" />
    </svg>
  );
}

export function ChatToWorkflowSlide() {
  const step = useSlideStep();
  const t = useStepClock(step);

  const typed =
    step === 1 ? Math.min(brief.length, Math.floor(t / 28)) : step >= 2 ? brief.length : 0;
  const building = step >= 2;
  const g = step === 2 ? t : step > 2 ? Number.POSITIVE_INFINITY : -1;
  const r = step === 4 ? t : -1;
  const generated = g >= generationDoneMs;
  const kept = step >= 3;
  const dockVisible = (step === 2 && generated) || (step === 3 && t < 450);

  const onCanvas = (id: NodeId) => g >= nodeArrivalMs[id];
  const statusOf = (id: NodeId): RunStatus => {
    if (r < runStartMs) return 'idle';
    const [start, end] = runWindows[id];
    if (r < start) return 'queued';
    return r < end ? 'running' : 'succeeded';
  };
  const reached = (id: NodeId) => r >= runWindows[id][0];
  const edgeColor = (target: NodeId) =>
    reached(target) ? ocean : !kept && onCanvas(target) ? ocean : edgeGrey;

  const tested = r >= runDoneMs;
  const elapsed = r >= runStartMs ? Math.floor((Math.min(r, runDoneMs) - runStartMs) / 1000) : 0;
  const triggerBlue = r >= runWindows.trigger[0];

  const centred = !building;

  return (
    <OzStage background="bg-[#FFFFFF]">
      <div
        className="oz-app absolute top-0 left-0 overflow-hidden"
        style={{
          width: appWidth,
          height: appHeight,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Canvas */}
        <div
          className="oz-app-dots absolute top-0"
          style={{
            left: panelWidth,
            width: appWidth - panelWidth,
            height: appHeight,
            opacity: building ? 1 : 0,
            transition: 'opacity 600ms ease 300ms',
          }}
        >
          {onCanvas('trigger') ? (
            <div
              className="oz-app-enter absolute flex items-center gap-2 px-[10px]"
              style={{
                left: 40,
                top: 390,
                height: 33,
                width: 112,
                borderRadius: 12,
                background: triggerBlue ? ocean : '#000000',
                transition: 'background 400ms',
                ...(!kept ? { outline: '2px solid rgba(0,122,230,0.5)', outlineOffset: 2 } : {}),
              }}
            >
              <Logo name="gmail" size={15} />
              <span className="truncate text-[12px] leading-4 font-medium text-[#ffffff]">
                New email
              </span>
            </div>
          ) : null}
          {nodes.map((node, index) =>
            onCanvas(node.id) ? (
              <NodeCard
                key={node.id}
                {...node}
                isNew={!kept}
                status={statusOf(node.id)}
                delay={index * 45}
              />
            ) : null
          )}
          <svg
            className="pointer-events-none absolute inset-0"
            width={appWidth - panelWidth}
            height={appHeight}
            fill="none"
            aria-hidden="true"
          >
            {onCanvas('agent') ? (
              <g>
                <Edge d="M166 406 H190" color={edgeColor('agent')} />
                <Handle x={166} y={406} color={edgeColor('agent')} />
                <Handle x={190} y={406} color={edgeColor('agent')} />
              </g>
            ) : null}
            {onCanvas('linear') ? (
              <g>
                <Edge
                  d="M392 406 H394 Q410 406 410 390 V272 Q410 256 426 256 H428"
                  color={edgeColor('linear')}
                />
                <Handle x={392} y={406} color={edgeColor('linear')} />
                <Handle x={428} y={256} color={edgeColor('linear')} />
              </g>
            ) : null}
            {onCanvas('gmail') ? (
              <g>
                <Edge
                  d="M392 406 H394 Q410 406 410 422 V540 Q410 556 426 556 H428"
                  color={edgeColor('gmail')}
                />
                <Handle x={428} y={556} color={edgeColor('gmail')} />
              </g>
            ) : null}
            {onCanvas('slack') ? (
              <g>
                <Edge d="M630 256 H654" color={edgeColor('slack')} />
                <Handle x={630} y={256} color={edgeColor('slack')} />
                <Handle x={654} y={256} color={edgeColor('slack')} />
              </g>
            ) : null}
          </svg>

          {/* Test toolbar */}
          {step === 4 ? (
            <div className="absolute top-[16px] left-1/2 -translate-x-1/2">
              {r < runStartMs ? (
                <div
                  className="oz-app-raised inline-flex items-center gap-2 border bg-[#FFFFFF] p-1"
                  style={{ borderColor: border, borderRadius: 12 }}
                >
                  <span
                    className="inline-flex h-10 overflow-hidden text-[#ffffff]"
                    style={{
                      background: ocean,
                      borderRadius: 12,
                      transform: r > 450 ? 'scale(0.96)' : 'none',
                      transition: 'transform 150ms',
                    }}
                  >
                    <span className="flex items-center gap-2 px-3 text-[14px] font-medium">
                      <Play className="h-4 w-4 fill-current stroke-none" /> Test workflow
                    </span>
                    <span
                      className="flex items-center border-l px-2"
                      style={{ borderColor: 'rgba(255,255,255,0.2)' }}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 px-2 text-[14px]">
                    <Logs className="h-4 w-4" /> Logs
                  </span>
                </div>
              ) : (
                <div
                  className="oz-app-raised flex w-[424px] items-center gap-3 bg-[#FFFFFF] px-4 py-3"
                  style={{ borderRadius: 12 }}
                >
                  <Flower />
                  <div className="flex flex-1 flex-col">
                    <span className="text-[16px] leading-[1.1] font-medium tracking-[-0.01em]">
                      {tested ? 'Completed' : 'Testing workflow'}
                    </span>
                    <span className="text-[12px]" style={{ color: muted }}>
                      {elapsed}s
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 text-[14px]">
                    <Logs className="h-4 w-4" /> Logs
                  </span>
                  <span
                    className="flex h-8 items-center gap-2 bg-[#000000] px-3 text-[16px] font-medium text-[#ffffff]"
                    style={{ borderRadius: 12 }}
                  >
                    {tested ? null : (
                      <span className="inline-block h-3 w-3 border-2 border-[#FFFFFF]" />
                    )}
                    {tested ? 'Close' : 'Stop'}
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Chat panel */}
        <div
          className="absolute top-0 left-0 flex flex-col gap-4 p-4"
          style={{
            width: panelWidth,
            height: appHeight,
            borderRight: `1px solid ${border}`,
            opacity: building ? 1 : 0,
            transition: 'opacity 400ms ease',
          }}
        >
          {building ? (
            <>
              <div className="oz-app-enter flex items-start justify-end gap-2">
                <p
                  className="max-w-[236px] bg-[#18181b] px-4 py-3 text-[14px] leading-relaxed text-[#ffffff]"
                  style={{
                    borderRadius: 12,
                    borderTopRightRadius: 6,
                    boxShadow: '0 4px 6px -1px rgba(24,24,27,0.2)',
                  }}
                >
                  {brief}
                </p>
                <span
                  className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center bg-[#18181b] text-[12px] font-medium text-[#ffffff]"
                  style={{ borderRadius: 999 }}
                >
                  EW
                </span>
              </div>
              {g >= 500 ? (
                <div className="flex flex-col">
                  <div
                    className="flex items-center gap-2 py-1 text-[14px]"
                    style={{ color: muted }}
                  >
                    <ChevronRight className="h-4 w-4" style={{ transform: 'rotate(90deg)' }} />
                    {generated ? (
                      <span style={{ color: 'rgba(103,103,111,0.95)' }}>Completed · 7 steps</span>
                    ) : (
                      <span className="oz-app-shimmer text-[#09090b]">Working..</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 py-1 pl-6">
                    {feed.map((line, index) =>
                      g >= line.start ? (
                        <FeedLine
                          key={index}
                          label={g >= line.end ? line.doneLabel : line.label}
                          running={g < line.end}
                          seconds={`${((line.end - line.start) / 1000).toFixed(2)}s`}
                        />
                      ) : null
                    )}
                    {r >= 0 ? (
                      <FeedLine
                        label={tested ? 'Tested workflow' : 'Testing workflow'}
                        running={!tested}
                        seconds="5.30s"
                      />
                    ) : null}
                  </div>
                </div>
              ) : null}
              {generated ? (
                <p className="oz-app-enter text-[14px] leading-relaxed">
                  Done. New support emails are triaged by an agent, filed in Linear, shared in
                  Slack, and the customer gets a drafted reply.
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        {/* Review dock */}
        {dockVisible ? (
          <div
            className="oz-app-enter absolute flex items-center justify-between gap-2 bg-[#FFFFFF] px-3 py-3"
            style={{
              left: 16,
              bottom: 132,
              width: panelWidth - 32,
              borderRadius: 12,
              border: `2px solid ${info}`,
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
            }}
          >
            <span className="text-[14px] font-medium whitespace-nowrap">5 new steps</span>
            <span className="flex items-center gap-2">
              <span
                className="flex h-8 items-center px-3 text-[12px] font-medium whitespace-nowrap"
                style={{ border: `1px solid ${border}`, borderRadius: 12 }}
              >
                Reject
              </span>
              <span
                className="flex h-8 items-center px-3 text-[12px] font-medium whitespace-nowrap text-[#ffffff]"
                style={{
                  background: info,
                  borderRadius: 12,
                  transform: step === 3 ? 'scale(0.94)' : 'none',
                  transition: 'transform 150ms',
                }}
              >
                Keep Changes
              </span>
            </span>
          </div>
        ) : null}

        {/* Greeting, only before the brief is sent */}
        <p
          className="absolute right-0 left-0 text-center text-[30px] font-normal tracking-tight"
          style={{
            top: 280,
            fontFamily: 'var(--font-oz-sans)',
            letterSpacing: '-0.025em',
            opacity: centred ? 1 : 0,
            transition: 'opacity 300ms ease',
          }}
        >
          Good afternoon, Emil
        </p>

        {/* Composer: centred on the empty chat, docked under the chat panel once sent */}
        <div
          className="absolute"
          style={{
            left: centred ? (appWidth - 640) / 2 : 16,
            width: centred ? 640 : panelWidth - 32,
            bottom: centred ? appHeight - 336 - 108 : 16,
            transition:
              'left 650ms cubic-bezier(.16,1,.3,1), width 650ms cubic-bezier(.16,1,.3,1), bottom 650ms cubic-bezier(.16,1,.3,1)',
          }}
        >
          <Composer
            text={building ? '' : brief.slice(0, typed)}
            typing={step === 1 && typed < brief.length}
          />
        </div>
      </div>
    </OzStage>
  );
}
