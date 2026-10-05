import { ComparisonSlide } from './comparison';
import { type DiagramTone, DiagramSvg, DiagramText } from './diagram';

interface StageEffort {
  stage: string;
  effort: number;
  emptyLabel?: string;
  challengeFound?: boolean;
}

// Illustrative effort per stage, on a shared 0-100 scale. Both sides walk the same stages;
// what changes is where the effort goes, where the hard part is found, and the rework it costs.
const discoveredInReview: readonly StageEffort[] = [
  { stage: 'research', effort: 5 },
  { stage: 'plan', effort: 0, emptyLabel: 'skipped' },
  { stage: 'code', effort: 100 },
  { stage: 'review', effort: 45, challengeFound: true },
  { stage: 'rework', effort: 80 },
];

const discoveredInResearch: readonly StageEffort[] = [
  { stage: 'research', effort: 70, challengeFound: true },
  { stage: 'plan', effort: 45 },
  { stage: 'code', effort: 25 },
  { stage: 'review', effort: 15 },
  { stage: 'rework', effort: 0, emptyLabel: 'none' },
];

const barFill: Record<DiagramTone, string> = {
  primary: 'fill-primary',
  foreground: 'fill-foreground',
  danger: 'fill-[var(--danger)]',
  quiet: 'fill-[var(--hair)]',
};

const maxBarWidth = 300;

function EffortBars({
  stages,
  tone,
  label,
}: {
  stages: readonly StageEffort[];
  tone: DiagramTone;
  label: string;
}) {
  return (
    <DiagramSvg height={266} label={label}>
      <DiagramText x={150} y={14} anchor="start" size={14} tone="quiet">
        EFFORT SPENT · ILLUSTRATIVE
      </DiagramText>
      {stages.map(({ stage, effort, emptyLabel, challengeFound }, index) => {
        const y = 52 + index * 46;
        const width = (effort / 100) * maxBarWidth;
        return (
          <g key={stage}>
            <DiagramText x={0} y={y + 6} anchor="start" size={18}>
              {stage}
            </DiagramText>
            {width > 0 ? (
              <rect x={150} y={y - 14} width={width} height={28} className={barFill[tone]} />
            ) : (
              <DiagramText x={150} y={y + 6} anchor="start" size={16} tone="quiet">
                {emptyLabel}
              </DiagramText>
            )}
            {challengeFound ? (
              <DiagramText x={150 + width + 14} y={y + 6} anchor="start" size={16} tone={tone} bold>
                ← challenge found
              </DiagramText>
            ) : null}
          </g>
        );
      })}
    </DiagramSvg>
  );
}

export function SpecDdSlide() {
  return (
    <ComparisonSlide
      chapter="more"
      title="Spec-driven development"
      claim="Discover the challenges early, while they are still cheap to change."
      source={{
        href: 'https://addcommitpush.io/brain/feature-work-fails-at-planning-and-constraints',
        label: 'addcommitpush.io/brain/feature-work-fails-at-planning-and-constraints',
      }}
      left={{
        heading: 'Found in review',
        caption: 'The effort goes into code first. The hard part shows up after, as rework.',
        visual: (
          <EffortBars
            stages={discoveredInReview}
            tone="danger"
            label="Illustrative: little research, no plan, most effort in code, the challenge is found in review and causes rework"
          />
        ),
      }}
      right={{
        heading: 'Found in research',
        caption: 'The effort moves to research and plan. The code becomes the small part.',
        visual: (
          <EffortBars
            stages={discoveredInResearch}
            tone="primary"
            label="Illustrative: most effort in research and plan, the challenge is found in research, code and review are small"
          />
        ),
      }}
    />
  );
}
