import type { ReactNode } from 'react';

// Small SVG vocabulary for the comparison diagrams: boxes, arrows and labels in theme colours.

export type DiagramTone = 'primary' | 'foreground' | 'danger' | 'quiet';
type Point = readonly [number, number];

const strokeClass: Record<DiagramTone, string> = {
  primary: 'stroke-primary',
  foreground: 'stroke-foreground',
  danger: 'stroke-[var(--danger)]',
  quiet: 'stroke-[var(--hair)]',
};

const fillClass: Record<DiagramTone, string> = {
  primary: 'fill-primary',
  foreground: 'fill-foreground',
  danger: 'fill-[var(--danger)]',
  quiet: 'fill-[var(--hair)]',
};

export function DiagramSvg({
  width = 680,
  height,
  label,
  children,
}: {
  width?: number;
  height: number;
  label: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMin meet"
      className="h-auto w-full"
      role="img"
      aria-label={label}
    >
      {children}
    </svg>
  );
}

export function DiagramText({
  x,
  y,
  tone = 'foreground',
  size = 17,
  anchor = 'middle',
  bold = false,
  children,
}: {
  x: number;
  y: number;
  tone?: DiagramTone;
  size?: number;
  anchor?: 'start' | 'middle' | 'end';
  bold?: boolean;
  children: ReactNode;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={size}
      fontWeight={bold ? 600 : 400}
      className={`font-mono ${fillClass[tone]}`}
    >
      {children}
    </text>
  );
}

export function DiagramBox({
  cx,
  cy,
  width,
  height = 50,
  tone,
  filled = false,
  dashed = false,
  size = 18,
  bold = false,
  children,
}: {
  cx: number;
  cy: number;
  width: number;
  height?: number;
  tone: DiagramTone;
  filled?: boolean;
  dashed?: boolean;
  size?: number;
  bold?: boolean;
  children: ReactNode;
}) {
  return (
    <g>
      <rect
        x={cx - width / 2}
        y={cy - height / 2}
        width={width}
        height={height}
        className={`${filled ? 'fill-[var(--card)]' : 'fill-background'} ${strokeClass[tone]}`}
        strokeWidth={dashed ? 2 : 2.5}
        strokeDasharray={dashed ? '6 5' : undefined}
      />
      <DiagramText x={cx} y={cy + size * 0.35} tone={tone} size={size} bold={bold}>
        {children}
      </DiagramText>
    </g>
  );
}

function arrowHead([x, y]: Point, [fx, fy]: Point) {
  const angle = Math.atan2(y - fy, x - fx);
  const size = 10;
  const left = [x - size * Math.cos(angle - 0.45), y - size * Math.sin(angle - 0.45)];
  const right = [x - size * Math.cos(angle + 0.45), y - size * Math.sin(angle + 0.45)];
  return `${x},${y} ${left[0]},${left[1]} ${right[0]},${right[1]}`;
}

export function DiagramArrow({
  from,
  to,
  via,
  tone,
  width = 2.5,
  dashed = false,
  head = true,
}: {
  from: Point;
  to: Point;
  via?: Point;
  tone: DiagramTone;
  width?: number;
  dashed?: boolean;
  head?: boolean;
}) {
  const path = via
    ? `M${from[0]} ${from[1]} Q ${via[0]} ${via[1]} ${to[0]} ${to[1]}`
    : `M${from[0]} ${from[1]} L ${to[0]} ${to[1]}`;

  return (
    <g>
      <path
        d={path}
        fill="none"
        className={strokeClass[tone]}
        strokeWidth={width}
        strokeDasharray={dashed ? '6 5' : undefined}
      />
      {head ? <polygon points={arrowHead(to, via ?? from)} className={fillClass[tone]} /> : null}
    </g>
  );
}
