import { ComparisonSlide, ReviewOutline, ServiceLayers } from './comparison';

type Point = readonly [number, number];
type Edge = readonly [number, number, number, number];

const quietModules: readonly Point[] = [
  [60, 50],
  [480, 40],
  [610, 80],
  [100, 165],
  [70, 285],
  [520, 285],
  [630, 275],
];

const touchedModules: readonly Point[] = [
  [200, 30],
  [340, 70],
  [400, 185],
  [560, 175],
  [220, 295],
  [380, 300],
];

const quietEdges: readonly Edge[] = [
  [60, 50, 200, 30],
  [60, 50, 100, 165],
  [60, 50, 250, 155],
  [200, 30, 100, 165],
  [200, 30, 400, 185],
  [340, 70, 480, 40],
  [480, 40, 610, 80],
  [480, 40, 560, 175],
  [480, 40, 400, 185],
  [610, 80, 560, 175],
  [610, 80, 630, 275],
  [100, 165, 250, 155],
  [100, 165, 70, 285],
  [100, 165, 380, 300],
  [60, 50, 220, 295],
  [70, 285, 220, 295],
  [560, 175, 520, 285],
  [560, 175, 630, 275],
  [520, 285, 630, 275],
  [380, 300, 520, 285],
  [480, 40, 520, 285],
  [400, 185, 520, 285],
  [100, 165, 220, 295],
];

const touchedEdges: readonly Edge[] = [
  [250, 155, 200, 30],
  [250, 155, 340, 70],
  [250, 155, 400, 185],
  [250, 155, 220, 295],
  [250, 155, 380, 300],
  [200, 30, 340, 70],
  [340, 70, 400, 185],
  [400, 185, 560, 175],
  [400, 185, 380, 300],
  [220, 295, 380, 300],
  [340, 70, 560, 175],
];

const services: readonly { x: number; y: number; changed: boolean }[] = [
  { x: 20, y: 30, changed: false },
  { x: 380, y: 30, changed: true },
  { x: 20, y: 190, changed: false },
  { x: 380, y: 190, changed: false },
];

const doors: readonly Edge[] = [
  [300, 95, 380, 95],
  [160, 160, 160, 190],
  [520, 160, 520, 190],
  [300, 255, 380, 255],
];

function TangledDiagram() {
  return (
    <svg
      viewBox="0 0 680 330"
      className="h-auto w-full"
      role="img"
      aria-label="A tangled module graph where one change touches most of the codebase, all inside the review outline"
    >
      <g className="stroke-[var(--hair)]" strokeWidth={2} strokeOpacity={0.5}>
        {quietEdges.map(([x1, y1, x2, y2]) => (
          <line key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>
      <g className="stroke-[var(--danger)]" strokeWidth={3}>
        {touchedEdges.map(([x1, y1, x2, y2]) => (
          <line key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>
      <g className="fill-background stroke-[var(--hair)]" strokeWidth={2}>
        {quietModules.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x - 12} y={y - 12} width={24} height={24} />
        ))}
      </g>
      <g className="fill-[var(--danger)]">
        {touchedModules.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x - 12} y={y - 12} width={24} height={24} />
        ))}
        <rect x={234} y={139} width={32} height={32} />
      </g>
      <ReviewOutline x={30} y={6} width={630} height={318} />
    </svg>
  );
}

function BoundedDiagram() {
  return (
    <svg
      viewBox="0 0 680 330"
      className="h-auto w-full"
      role="img"
      aria-label="Four services connected only through ports; the same change stays inside one service, the only thing inside the review outline"
    >
      {services.map(({ x, y, changed }) => (
        <ServiceLayers
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={280}
          height={130}
          portsWidth={60}
          adaptersWidth={80}
          domainHeight={50}
          outline={changed ? 'primary' : 'quiet'}
          faded={!changed}
        />
      ))}
      <g className="stroke-foreground" strokeWidth={2}>
        {doors.map(([x1, y1, x2, y2]) => (
          <line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>
      <g className="fill-foreground">
        {doors.flatMap(([x1, y1, x2, y2]) => [
          <circle key={`${x1}-${y1}-a`} cx={x1} cy={y1} r={7} />,
          <circle key={`${x1}-${y1}-b`} cx={x2} cy={y2} r={7} />,
        ])}
      </g>
      <g fill="none" className="stroke-primary" strokeWidth={3} strokeDasharray="4 5">
        <path d="M380 70 C 430 70, 470 62, 510 62" />
        <path d="M510 62 L 490 136" />
        <path d="M510 62 L 535 136" />
        <path d="M510 62 C 560 62, 610 75, 660 75" />
      </g>
      <g className="fill-primary">
        <circle cx={510} cy={62} r={11} />
        <circle cx={490} cy={140} r={8} />
        <circle cx={535} cy={140} r={8} />
      </g>
      <ReviewOutline x={366} y={14} width={308} height={162} />
    </svg>
  );
}

export function ArchitectureSlide() {
  return (
    <ComparisonSlide
      chapter="a-lot"
      title="Architecture"
      claim="Architecture decides how much you have to read."
      source={{
        href: 'https://threedots.tech/post/introducing-clean-architecture/',
        label: 'threedots.tech/post/introducing-clean-architecture',
      }}
      left={{
        heading: 'No boundaries',
        caption: 'To review one change, you read everything inside the dashed line.',
        visual: <TangledDiagram />,
      }}
      right={{
        heading: 'Bounded contexts',
        caption: 'To review the same change, you read one service.',
        visual: <BoundedDiagram />,
      }}
    />
  );
}
