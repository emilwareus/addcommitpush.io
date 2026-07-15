'use client';

import type { LucideIcon } from 'lucide-react';
import {
  AppWindow,
  ArrowRight,
  Boxes,
  Container,
  Database,
  MonitorCheck,
  Network,
  Server,
  TestTubeDiagonal,
} from 'lucide-react';
import { useSlideStep } from '@/app/(public)/presentations/write-code-ai-agents-love/layout';
import { Claim, SlideShell } from './shared';

const modes = ['system', 'unit', 'adapter', 'component', 'e2e', 'matrix'] as const;
export type TestMode = (typeof modes)[number];

const modeCopy: Record<
  TestMode,
  {
    claim: string;
    label: string;
    focus: string;
    real: string;
    mock: string;
    icon: LucideIcon;
  }
> = {
  system: {
    claim: 'Start with one bounded context.',
    label: 'System',
    focus: 'One service boundary',
    real: 'Owned model and owned data',
    mock: 'External systems stay outside',
    icon: Boxes,
  },
  unit: {
    claim: 'Unit tests isolate the rule.',
    label: 'Unit',
    focus: 'Domain and application logic',
    real: 'No network. No database.',
    mock: 'Adapters and external effects',
    icon: TestTubeDiagonal,
  },
  adapter: {
    claim: 'Adapter tests check the real dependency.',
    label: 'Adapter',
    focus: 'One adapter at a time',
    real: 'Database / broker',
    mock: 'The rest of the service',
    icon: Container,
  },
  component: {
    claim: 'Component tests are the agent sweet spot.',
    label: 'Component',
    focus: 'Public API through the whole service',
    real: 'Owned infrastructure',
    mock: 'External services',
    icon: MonitorCheck,
  },
  e2e: {
    claim: 'E2E tests prove the system contract.',
    label: 'E2E',
    focus: 'Client path across services',
    real: 'Multiple services together',
    mock: 'As little as possible',
    icon: Network,
  },
  matrix: {
    claim: 'Put each test at the boundary it proves.',
    label: 'Matrix',
    focus: 'The boundary decides the test',
    real: 'Component + E2E become acceptance criteria',
    mock: 'Unit + adapter stay diagnostic',
    icon: Boxes,
  },
};

const panelLabels: Record<TestMode, [string, string, string]> = {
  system: ['shows', 'inside', 'outside'],
  unit: ['proves', 'real', 'mock'],
  adapter: ['proves', 'real', 'mock'],
  component: ['proves', 'real', 'mock'],
  e2e: ['proves', 'real', 'mock'],
  matrix: ['shows', 'acceptance', 'diagnostic'],
};

function currentMode(step: number): TestMode {
  return modes[Math.min(step, modes.length - 1)] ?? 'system';
}

function isActive(mode: TestMode, activeModes: TestMode[]) {
  return activeModes.includes(mode);
}

function layerClasses(active: boolean, color: 'primary' | 'secondary' | 'amber' | 'sky') {
  const colorClasses = {
    primary: active ? 'bg-primary/20 text-primary' : 'bg-primary/7 text-primary/40',
    secondary: active ? 'bg-secondary/20 text-secondary' : 'bg-secondary/7 text-secondary/40',
    amber: active ? 'bg-amber-300/18 text-amber-200' : 'bg-amber-300/7 text-amber-200/40',
    sky: active ? 'bg-sky-400/18 text-sky-200' : 'bg-sky-400/7 text-sky-200/40',
  };

  return `${colorClasses[color]} transition-colors duration-300`;
}

function ArrowLine({ active = false }: { active?: boolean }) {
  return <div className={`h-px flex-1 ${active ? 'bg-primary/80' : 'bg-border/60'}`} />;
}

function FlowArrow() {
  return (
    <div className="flex w-16 items-center text-primary">
      <div className="h-px flex-1 bg-primary/75" />
      <ArrowRight className="h-5 w-5" />
    </div>
  );
}

function InfraIcon({
  icon: Icon,
  label,
  detail,
  active,
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
  active: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 transition-opacity duration-300 ${
        active ? 'opacity-100' : 'opacity-35'
      }`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-md border border-primary/45 bg-background/70 shadow-[0_0_18px_rgba(20,184,166,0.16)]">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <div className="whitespace-nowrap font-mono text-sm text-primary">{label}</div>
      <div className="text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

function FocusPanel({ mode }: { mode: TestMode }) {
  const copy = modeCopy[mode];
  const Icon = copy.icon;
  const [firstLabel, secondLabel, thirdLabel] = panelLabels[mode];

  return (
    <div className="mx-auto mt-7 grid w-full max-w-5xl grid-cols-[220px_repeat(3,1fr)] items-start gap-6 border-t border-primary/45 pt-5">
      <div className="flex items-center gap-3">
        <Icon className="h-7 w-7 text-primary" />
        <div className="font-mono text-2xl font-semibold text-primary">{copy.label}</div>
      </div>

      <div className="text-xl leading-snug">
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {firstLabel}
        </div>
        <div className="mt-1 text-foreground">{copy.focus}</div>
      </div>

      <div className="text-xl leading-snug">
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {secondLabel}
        </div>
        <div className="mt-1 text-foreground">{copy.real}</div>
      </div>

      <div className="text-xl leading-snug">
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {thirdLabel}
        </div>
        <div className="mt-1 text-foreground">{copy.mock}</div>
      </div>
    </div>
  );
}

function ServiceDiagram({ mode }: { mode: TestMode }) {
  const systemActive = mode === 'system';
  const unitActive = mode === 'unit';
  const adapterActive = mode === 'adapter';
  const componentActive = mode === 'component';

  const portsActive = systemActive || componentActive;
  const appActive = systemActive || unitActive || componentActive;
  const domainActive = systemActive || unitActive || componentActive;
  const adaptersActive = systemActive || adapterActive || componentActive;
  const dbActive = systemActive || adapterActive || componentActive;
  const externalMockActive = componentActive;
  const adapterPillVisible = adapterActive || componentActive;
  const adapterPillLabel = adapterActive ? 'adapter code' : 'external mock';

  return (
    <div className="relative mx-auto flex w-full max-w-6xl items-center gap-8">
      <div className="flex w-24 items-center gap-3 font-mono text-base text-muted-foreground">
        <span>request</span>
        <ArrowLine active={componentActive} />
      </div>

      <div
        className={`relative rounded-lg p-7 transition-colors duration-300 ${
          componentActive ? 'border-2 border-dashed border-primary/75' : 'border border-border/45'
        }`}
      >
        {systemActive && (
          <div className="absolute left-7 top-3 font-mono text-xs uppercase tracking-[0.2em] text-primary/70">
            one bounded context
          </div>
        )}

        <div className="relative grid grid-cols-[1fr_86px] items-center gap-8">
          {adapterActive && (
            <div className="pointer-events-none absolute bottom-0 left-[554px] top-0 z-20 w-[324px] rounded-sm border-2 border-dashed border-primary/75" />
          )}

          <div className="relative grid h-72 w-[760px] grid-cols-[0.9fr_1.65fr_0.95fr] overflow-hidden rounded-md border border-border/70 bg-card/50 shadow-2xl shadow-black/25">
            {unitActive && (
              <div className="absolute bottom-0 left-[25.714%] top-0 z-10 w-[47.143%] rounded-sm border-2 border-dashed border-primary/75" />
            )}

            <div className={layerClasses(portsActive, 'primary')}>
              <div className="p-5 font-mono text-sm uppercase tracking-[0.18em]">Ports</div>
              <div className="mx-5 mt-16 rounded-full border border-current/55 px-4 py-2 text-center font-mono text-sm">
                HTTP / gRPC
              </div>
            </div>

            <div className="grid grid-rows-[1fr_0.72fr]">
              <div className={layerClasses(appActive, 'secondary')}>
                <div className="p-5 font-mono text-sm uppercase tracking-[0.18em]">App</div>
                <div className="mt-14 text-center text-2xl font-semibold text-foreground">
                  command / query
                </div>
              </div>
              <div className={layerClasses(domainActive, 'amber')}>
                <div className="p-5 font-mono text-sm uppercase tracking-[0.18em]">Domain</div>
              </div>
            </div>

            <div className={layerClasses(adaptersActive, 'sky')}>
              <div className="p-5 font-mono text-sm uppercase tracking-[0.18em]">Adapters</div>
              {adapterPillVisible && (
                <div
                  className={`mx-5 mt-16 rounded-md border px-4 py-3 text-center font-mono text-sm ${
                    externalMockActive
                      ? 'border-sky-200/70 text-sky-100'
                      : 'border-sky-200/45 text-sky-100'
                  }`}
                >
                  {adapterPillLabel}
                </div>
              )}
            </div>
          </div>

          <InfraIcon
            icon={Database}
            label={adapterActive ? 'real DB' : 'owned DB'}
            detail="real"
            active={dbActive}
          />
        </div>
      </div>

      <div className="flex w-44 items-center gap-3 font-mono text-base text-muted-foreground">
        <ArrowLine active={false} />
        <span className={externalMockActive ? 'text-primary' : ''}>external service</span>
      </div>
    </div>
  );
}

function MiniService({ label, active = true }: { label: string; active?: boolean }) {
  return (
    <div
      className={`relative grid h-36 w-64 grid-cols-[0.9fr_1.25fr_1fr] overflow-hidden rounded-md border ${
        active ? 'border-primary/55 shadow-[0_0_22px_rgba(20,184,166,0.14)]' : 'border-border/55'
      }`}
    >
      <div className="bg-primary/14 p-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-primary">Ports</div>
      </div>
      <div className="grid grid-rows-[1fr_0.7fr]">
        <div className="bg-secondary/16 p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-secondary">
            App
          </div>
        </div>
        <div className="bg-amber-300/14 p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-amber-200">
            Domain
          </div>
        </div>
      </div>
      <div className="bg-sky-400/16 p-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-sky-200">
          Adapters
        </div>
      </div>
      <div className="absolute bottom-2 left-3 font-mono text-xs text-foreground">{label}</div>
    </div>
  );
}

function E2EDiagram() {
  return (
    <div className="flex w-full items-center justify-center">
      <div className="relative rounded-lg border-2 border-dashed border-primary/70 px-8 py-9">
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-md border border-primary/45 bg-primary/10">
              <AppWindow className="h-8 w-8 text-primary" />
            </div>
            <div className="font-mono text-sm text-muted-foreground">client</div>
          </div>
          <FlowArrow />
          <div className="flex flex-col items-center gap-3">
            <MiniService label="service A" />
            <InfraIcon icon={Database} label="DB A" detail="real" active />
          </div>
          <FlowArrow />
          <div className="flex flex-col items-center gap-3">
            <MiniService label="service B" />
            <InfraIcon icon={Server} label="service deps" detail="real" active />
          </div>
        </div>
      </div>
    </div>
  );
}

function TestBlock({ children, className }: { children: string; className: string }) {
  return (
    <div
      className={`absolute flex items-center justify-center rounded-sm px-5 py-4 text-center font-sans text-2xl font-semibold leading-tight shadow-2xl shadow-black/25 ${className}`}
    >
      {children}
    </div>
  );
}

function TestMatrix() {
  return (
    <div className="relative mx-auto h-[510px] w-full max-w-6xl">
      <div className="absolute bottom-9 top-8 left-[45%] w-px bg-foreground/85" />
      <ArrowRight
        className="absolute top-6 h-6 w-6 -rotate-90 text-foreground/85"
        style={{ left: 'calc(45% - 12px)' }}
      />
      <div className="absolute top-[57%] right-9 left-8 h-px bg-foreground/85" />
      <ArrowRight
        className="absolute right-5 h-6 w-6 text-foreground/85"
        style={{ top: 'calc(57% - 12px)' }}
      />

      <div
        className="absolute -translate-x-1/2 font-sans text-2xl font-bold text-foreground"
        style={{ left: '45%', top: 0 }}
      >
        Business-case related
      </div>
      <div className="absolute right-14 top-[59%] font-sans text-2xl font-bold text-foreground">
        Check complete feature
      </div>

      <div className="absolute top-[72px] right-[7%] h-[210px] w-[47%] border-2 border-dashed border-primary/75">
        <div className="absolute -top-14 right-4 font-sans text-4xl font-bold text-primary">
          Acceptance Tests
        </div>
        <TestBlock className="top-[100px] left-[9%] w-56 bg-zinc-800 text-white">
          Component tests
        </TestBlock>
        <TestBlock className="top-8 right-[12%] w-56 bg-zinc-800 text-white">E2E tests</TestBlock>
      </div>

      <TestBlock className="top-[106px] left-[8%] w-52 bg-amber-200 text-black">
        Unit tests in Domain
      </TestBlock>
      <TestBlock className="top-[190px] left-[23%] w-60 bg-rose-500 text-black">
        Unit tests in Application
      </TestBlock>
      <TestBlock className="bottom-2 left-[5%] w-56 bg-emerald-400 text-black">
        Unit tests in Ports
      </TestBlock>
      <TestBlock className="top-[354px] left-[48%] w-72 bg-sky-600 text-black">
        Adapter tests of database repository
      </TestBlock>
    </div>
  );
}

export function CodeQualityStructureVisual({
  mode,
  step = modes.indexOf(mode),
}: {
  mode: TestMode;
  step?: number;
}) {
  const isMatrix = mode === 'matrix';

  return (
    <>
      <Claim>{modeCopy[mode].claim}</Claim>

      <div className="w-full max-w-7xl">
        {isMatrix ? (
          <div className="flex justify-center">
            <TestMatrix />
          </div>
        ) : (
          <>
            {mode === 'e2e' ? <E2EDiagram /> : <ServiceDiagram mode={mode} />}
            <FocusPanel mode={mode} />
          </>
        )}

        <div className="mt-8">
          <div className="flex gap-2">
            {modes.map((item) => (
              <div
                key={item}
                className={`h-1.5 w-12 rounded-full ${
                  item === mode
                    ? 'bg-primary'
                    : isActive(item, modes.slice(0, step + 1))
                      ? 'bg-primary/35'
                      : 'bg-border/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export function CodeQualityStructureSlide() {
  const step = useSlideStep();
  const mode = currentMode(step);

  return (
    <SlideShell>
      <CodeQualityStructureVisual mode={mode} step={step} />
    </SlideShell>
  );
}
