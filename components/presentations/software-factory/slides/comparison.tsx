import type { ReactNode } from 'react';
import { SlideFrame, type LeverageRegionId, type SlideSource } from './shared';

// Shared shell for the two-panel slides: one claim, two panels, one caption each. The left panel
// is the starting point (ink heading), the right panel the better practice (primary heading).
// Both panels sit on a shared four-row subgrid (heading, visual, note, caption) so rows align.

export interface ComparisonPanel {
  heading: string;
  caption: string;
  visual: ReactNode;
  note?: ReactNode;
}

function Panel({
  heading,
  caption,
  visual,
  note,
  tone,
}: ComparisonPanel & { tone: 'worse' | 'better' }) {
  return (
    <figure className="row-span-4 grid min-w-0 grid-rows-subgrid">
      <h3
        className={`font-serif text-[clamp(1.3rem,2.1vw,2.2rem)] font-bold leading-none ${
          tone === 'better' ? 'text-primary' : 'text-foreground'
        }`}
      >
        {heading}
      </h3>
      <div className="flex flex-col [&>*]:flex-1">{visual}</div>
      <div>{note}</div>
      <figcaption className="max-w-[46ch] font-mono text-[clamp(0.85rem,1.2vw,1.3rem)] leading-snug text-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}

export function ComparisonSlide({
  chapter,
  title,
  claim,
  source,
  left,
  right,
}: {
  chapter: LeverageRegionId;
  title: string;
  claim: string;
  source?: SlideSource;
  left: ComparisonPanel;
  right: ComparisonPanel;
}) {
  return (
    <SlideFrame chapter={chapter} heading={{ title, subtitle: claim }} source={source}>
      <div className="grid gap-x-[clamp(2rem,5vw,5rem)] gap-y-[clamp(0.75rem,2.5vh,1.75rem)] lg:grid-cols-2">
        <Panel {...left} tone="worse" />
        <Panel {...right} tone="better" />
      </div>
    </SlideFrame>
  );
}

export function CodeCard({
  label,
  tone,
  children,
}: {
  label: string;
  tone: 'worse' | 'better';
  children: ReactNode;
}) {
  return (
    <div
      className={
        tone === 'better'
          ? 'border-[3px] border-primary bg-[var(--card)]'
          : 'border-[1.5px] border-dashed border-[var(--hair)] bg-[var(--card)]'
      }
    >
      <div className="flex justify-between gap-4 border-b-[1.5px] border-dashed border-[var(--hair)] px-5 py-2.5 font-mono text-[clamp(0.65rem,0.85vw,0.85rem)] tracking-[0.14em] text-muted-foreground">
        <span>{label}</span>
        <span>ILLUSTRATIVE</span>
      </div>
      <div className="px-5 py-4 font-mono text-[clamp(0.75rem,1.2vw,1.35rem)] leading-[1.55] text-foreground">
        {children}
      </div>
    </div>
  );
}

export function CodeBlock({ children }: { children: string }) {
  return <pre className="overflow-x-auto whitespace-pre">{children}</pre>;
}

export function ReviewerQuestions({ questions }: { questions: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-x-[1.4em] gap-y-1 font-mono text-[clamp(0.8rem,1.2vw,1.35rem)] text-[var(--danger)]">
      {questions.map((question) => (
        <li key={question}>{question}</li>
      ))}
    </ul>
  );
}

// SVG pieces for the Three Dots Labs service shape: ports | app over domain | adapters.

export function ServiceLayers({
  x,
  y,
  width,
  height,
  portsWidth,
  adaptersWidth,
  domainHeight,
  outline,
  labelSize,
  faded = false,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  portsWidth: number;
  adaptersWidth: number;
  domainHeight: number;
  outline: 'primary' | 'foreground' | 'quiet';
  labelSize?: number;
  faded?: boolean;
}) {
  const appX = x + portsWidth;
  const adaptersX = x + width - adaptersWidth;
  const domainY = y + height - domainHeight;
  const outlineClass = {
    primary: 'stroke-primary',
    foreground: 'stroke-foreground',
    quiet: 'stroke-[var(--hair)]',
  }[outline];

  return (
    <g>
      <g opacity={faded ? 0.5 : 1}>
        <rect
          x={x}
          y={y}
          width={portsWidth}
          height={height}
          className="fill-primary"
          fillOpacity={0.1}
        />
        <rect
          x={adaptersX}
          y={y}
          width={adaptersWidth}
          height={height}
          className="fill-primary"
          fillOpacity={0.1}
        />
        <rect
          x={appX}
          y={domainY}
          width={adaptersX - appX}
          height={domainHeight}
          className="fill-primary"
          fillOpacity={0.2}
        />
        <g className="stroke-[var(--hair)]" strokeWidth={1.5}>
          <line x1={appX} y1={y} x2={appX} y2={y + height} />
          <line x1={adaptersX} y1={y} x2={adaptersX} y2={y + height} />
          <line x1={appX} y1={domainY} x2={adaptersX} y2={domainY} />
        </g>
      </g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        className={outlineClass}
        strokeWidth={outline === 'quiet' ? 2 : outline === 'primary' ? 3 : 2}
      />
      {labelSize ? (
        <g className="fill-foreground font-mono" fontSize={labelSize} letterSpacing={2}>
          <text x={x + 9} y={y + labelSize + 8}>
            PORTS
          </text>
          <text x={appX + 9} y={y + labelSize + 8}>
            APP
          </text>
          <text x={appX + 9} y={domainY + labelSize + 8}>
            DOMAIN
          </text>
          <text x={adaptersX + 9} y={y + labelSize + 8}>
            ADAPTERS
          </text>
        </g>
      ) : null}
    </g>
  );
}

export function Port({ cx, cy, r = 11 }: { cx: number; cy: number; r?: number }) {
  return <circle cx={cx} cy={cy} r={r} className="fill-foreground" />;
}

export function Database({
  cx,
  top,
  tone = 'foreground',
}: {
  cx: number;
  top: number;
  tone?: 'foreground' | 'danger';
}) {
  return (
    <g
      className={`fill-background ${tone === 'danger' ? 'stroke-[var(--danger)]' : 'stroke-foreground'}`}
      strokeWidth={2}
    >
      <path d={`M${cx - 20} ${top} v36 a20 6 0 0 0 40 0 v-36`} />
      <ellipse cx={cx} cy={top} rx={20} ry={6} />
    </g>
  );
}

export function ReviewOutline({
  x,
  y,
  width,
  height,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="none"
      className="stroke-foreground"
      strokeWidth={2.5}
      strokeDasharray="12 8"
    />
  );
}
