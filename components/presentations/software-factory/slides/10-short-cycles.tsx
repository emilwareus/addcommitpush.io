import { ComparisonSlide } from './comparison';
import { DiagramSvg, DiagramText } from './diagram';

type Kind = 'code' | 'handoff' | 'checks' | 'release';

interface Segment {
  label: string;
  kind: Kind;
  units: number;
}

interface TimelineRow {
  label: string;
  segments: readonly Segment[];
  faded?: boolean;
}

// Illustrative durations in arbitrary units; only the proportions matter.
const handoffs: readonly Segment[] = [
  { label: 'review', kind: 'handoff', units: 3 },
  { label: 'QA', kind: 'handoff', units: 3 },
  { label: 'security', kind: 'handoff', units: 2.5 },
  { label: 'release', kind: 'release', units: 3.5 },
];

const beforeAgents: TimelineRow = {
  label: 'before',
  segments: [{ label: 'code', kind: 'code', units: 4 }, ...handoffs],
};

const withAgents: TimelineRow = {
  label: 'agents',
  segments: [{ label: '', kind: 'code', units: 1 }, ...handoffs],
};

const redesigned: TimelineRow = {
  label: 'redesign',
  segments: [
    { label: '', kind: 'code', units: 1 },
    { label: 'checks', kind: 'checks', units: 3 },
    { label: 'look', kind: 'handoff', units: 1.5 },
    { label: 'ship', kind: 'release', units: 1.5 },
  ],
};

const kindFill: Record<Kind, string> = {
  code: 'fill-primary',
  handoff: 'fill-[var(--danger)]',
  checks: 'fill-primary opacity-45',
  release: 'fill-foreground opacity-35',
};

const kindText: Record<Kind, string> = {
  code: 'fill-background',
  handoff: 'fill-background',
  checks: 'fill-foreground',
  release: 'fill-foreground',
};

const kindLegend: Record<Kind, string> = {
  code: 'code',
  handoff: 'human hand-off',
  checks: 'agent self-checks',
  release: 'waiting to release',
};

const barX = 96;
const unitWidth = 36;
const barHeight = 52;

function Timeline({
  rows,
  legend,
  endNote,
  label,
}: {
  rows: readonly TimelineRow[];
  legend: readonly Kind[];
  endNote: { text: string; tone: 'danger' | 'primary' };
  label: string;
}) {
  return (
    <DiagramSvg height={300} label={label}>
      {rows.map((row, rowIndex) => {
        const y = 16 + rowIndex * 92;
        let x = barX;
        const bars = row.segments.map(({ label: text, kind, units }, index) => {
          const width = units * unitWidth;
          const bar = (
            <g key={`${kind}-${index}`}>
              <rect x={x} y={y} width={width - 3} height={barHeight} className={kindFill[kind]} />
              {text ? (
                <text
                  x={x + (width - 3) / 2}
                  y={y + barHeight / 2 + 6}
                  textAnchor="middle"
                  fontSize={16}
                  className={`font-mono ${kindText[kind]}`}
                >
                  {text}
                </text>
              ) : null}
            </g>
          );
          x += width;
          return bar;
        });
        const isLast = rowIndex === rows.length - 1;
        return (
          <g key={row.label} opacity={row.faded ? 0.35 : 1}>
            <DiagramText x={0} y={y + 32} anchor="start" size={18}>
              {row.label}
            </DiagramText>
            {bars}
            {isLast ? (
              <DiagramText
                x={x - 3}
                y={y + barHeight + 26}
                anchor="end"
                size={17}
                tone={endNote.tone}
                bold
              >
                {endNote.text}
              </DiagramText>
            ) : null}
          </g>
        );
      })}
      {legend.map((kind, index) => {
        const x = (index % 2) * 330;
        const y = 246 + Math.floor(index / 2) * 30;
        return (
          <g key={kind}>
            <rect x={x} y={y - 13} width={18} height={18} className={kindFill[kind]} />
            <DiagramText x={x + 28} y={y + 1} anchor="start" size={16}>
              {kindLegend[kind]}
            </DiagramText>
          </g>
        );
      })}
    </DiagramSvg>
  );
}

export function ShortCyclesSlide() {
  return (
    <ComparisonSlide
      chapter="most"
      title="Where do you wait?"
      claim="Faster code moves the wait. Shorten the slowest step."
      source={{
        href: 'https://dora.dev/capabilities/working-in-small-batches/',
        label: 'dora.dev/capabilities/working-in-small-batches',
      }}
      left={{
        heading: 'Faster coding',
        caption:
          'Agents shrink the code step. Review, QA, security and the release train still set the pace.',
        visual: (
          <Timeline
            rows={[beforeAgents, withAgents]}
            legend={['code', 'handoff', 'release']}
            endNote={{ text: 'barely shorter', tone: 'danger' }}
            label="Illustrative: with agents the code step shrinks, but peer review, QA, security review and the scheduled release keep the loop almost as long"
          />
        ),
      }}
      right={{
        heading: 'Redesign the process',
        caption:
          'Bake QA, security and review into the agent. Humans take a short look, then ship.',
        visual: (
          <Timeline
            rows={[{ ...withAgents, faded: true }, redesigned]}
            legend={['code', 'checks', 'handoff', 'release']}
            endNote={{ text: 'learn sooner', tone: 'primary' }}
            label="Illustrative: the agent runs its own QA, security and review checks, a human takes a short look and the change ships continuously, so the loop is much shorter"
          />
        ),
      }}
    />
  );
}
