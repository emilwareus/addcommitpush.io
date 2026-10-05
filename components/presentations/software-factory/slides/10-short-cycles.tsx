import { ComparisonSlide } from './comparison';
import { DiagramSvg, DiagramText } from './diagram';

type Step = 'code' | 'emulator' | 'rig' | 'feedback';

interface TimelineRow {
  label: string;
  steps: readonly { step: Step; units: number }[];
  faded?: boolean;
}

// Illustrative durations in arbitrary units; only the proportions matter.
const beforeAgents: TimelineRow = {
  label: 'before',
  steps: [
    { step: 'code', units: 6 },
    { step: 'rig', units: 7 },
    { step: 'feedback', units: 5 },
  ],
};

const withAgents: TimelineRow = {
  label: 'agents',
  steps: [
    { step: 'code', units: 1 },
    { step: 'rig', units: 7 },
    { step: 'feedback', units: 5 },
  ],
};

const redesigned: TimelineRow = {
  label: 'redesigned',
  steps: [
    { step: 'code', units: 1 },
    { step: 'emulator', units: 1.5 },
    { step: 'rig', units: 2 },
    { step: 'feedback', units: 2 },
  ],
};

const stepFill: Record<Step, string> = {
  code: 'fill-primary',
  emulator: 'fill-primary opacity-45',
  rig: 'fill-[var(--danger)]',
  feedback: 'fill-foreground opacity-35',
};

const stepLabel: Record<Step, string> = {
  code: 'code',
  emulator: 'emulator',
  rig: 'waiting for the rig',
  feedback: 'customer feedback',
};

const barX = 130;
const unitWidth = 30;

function Timeline({
  rows,
  legend,
  endNote,
  label,
}: {
  rows: readonly TimelineRow[];
  legend: readonly Step[];
  endNote: { text: string; tone: 'danger' | 'primary' };
  label: string;
}) {
  return (
    <DiagramSvg height={260} label={label}>
      {rows.map((row, rowIndex) => {
        const y = 30 + rowIndex * 80;
        let x = barX;
        const segments = row.steps.map(({ step, units }) => {
          const width = units * unitWidth;
          const segment = (
            <rect key={step} x={x} y={y} width={width - 3} height={40} className={stepFill[step]} />
          );
          x += width;
          return segment;
        });
        const isLast = rowIndex === rows.length - 1;
        return (
          <g key={row.label} opacity={row.faded ? 0.35 : 1}>
            <DiagramText x={0} y={y + 26} anchor="start" size={17}>
              {row.label}
            </DiagramText>
            {segments}
            {isLast ? (
              <DiagramText x={x + 10} y={y + 26} anchor="start" size={16} tone={endNote.tone} bold>
                {endNote.text}
              </DiagramText>
            ) : null}
          </g>
        );
      })}
      {legend.map((step, index) => {
        const x = (index % 2) * 330;
        const y = 196 + Math.floor(index / 2) * 30;
        return (
          <g key={step}>
            <rect x={x} y={y - 13} width={18} height={18} className={stepFill[step]} />
            <DiagramText x={x + 28} y={y + 1} anchor="start" size={16}>
              {stepLabel[step]}
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
        caption: 'Agents shrink the code step. The rig and the feedback still set the pace.',
        visual: (
          <Timeline
            rows={[beforeAgents, withAgents]}
            legend={['code', 'rig', 'feedback']}
            endNote={{ text: 'barely shorter', tone: 'danger' }}
            label="Illustrative: with agents the code step shrinks but waiting for the test rig and customer feedback keeps the loop almost as long"
          />
        ),
      }}
      right={{
        heading: 'A shorter loop',
        caption: 'Emulate what you can, keep the rig for what needs it, ship in small batches.',
        visual: (
          <Timeline
            rows={[{ ...withAgents, faded: true }, redesigned]}
            legend={['code', 'emulator', 'rig', 'feedback']}
            endNote={{ text: 'learn sooner', tone: 'primary' }}
            label="Illustrative: an emulator runs first, the real rig is used briefly, feedback arrives sooner and the whole loop is much shorter"
          />
        ),
      }}
    />
  );
}
