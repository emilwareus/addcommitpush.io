import { SlideFrame } from './shared';
import { DiagramArrow, DiagramBox, DiagramSvg, DiagramText } from './diagram';

const nodeHeight = 84;
const nodeText = 24;

function QuestionBadge({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={18} className="fill-[var(--danger)]" />
      <text
        x={cx}
        y={cy + 7}
        textAnchor="middle"
        fontSize={22}
        fontWeight={700}
        className="fill-background font-mono"
      >
        ?
      </text>
    </g>
  );
}

function LoopFrame({
  x,
  y,
  width,
  height,
  label,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        className="stroke-primary"
        strokeWidth={2}
        strokeDasharray="8 6"
      />
      <DiagramText x={x + width / 2} y={y + 30} size={20} tone="foreground">
        {label}
      </DiagramText>
    </g>
  );
}

function SpecddLoop() {
  return (
    <DiagramSvg
      width={1200}
      height={530}
      label="Issue, research, plan, then per phase implement and validate, then ultrareview and fix until zero findings, security review, pull request and merge"
    >
      {/* Row 1: issue to the per-phase loop */}
      <DiagramBox
        cx={95}
        cy={125}
        width={160}
        height={nodeHeight}
        tone="foreground"
        size={nodeText}
      >
        issue
      </DiagramBox>
      <DiagramArrow from={[175, 125]} to={[213, 125]} tone="primary" />
      <DiagramBox
        cx={335}
        cy={125}
        width={240}
        height={nodeHeight}
        tone="primary"
        filled
        size={nodeText}
      >
        research
      </DiagramBox>
      <QuestionBadge cx={448} cy={86} />
      <DiagramArrow from={[455, 125]} to={[481, 125]} tone="primary" />
      <DiagramBox
        cx={607}
        cy={125}
        width={248}
        height={nodeHeight}
        tone="primary"
        filled
        size={nodeText}
      >
        plan
      </DiagramBox>
      <QuestionBadge cx={722} cy={86} />
      <DiagramArrow from={[731, 125]} to={[743, 125]} tone="primary" />

      <LoopFrame x={745} y={25} width={450} height={205} label="each phase" />
      <DiagramBox
        cx={855}
        cy={135}
        width={200}
        height={nodeHeight}
        tone="primary"
        filled
        size={nodeText}
      >
        implement
      </DiagramBox>
      <DiagramBox
        cx={1090}
        cy={135}
        width={200}
        height={nodeHeight}
        tone="primary"
        filled
        size={nodeText}
      >
        validate
      </DiagramBox>
      <DiagramArrow from={[955, 120]} to={[988, 120]} tone="primary" width={2.5} />
      <DiagramArrow from={[988, 150]} to={[955, 150]} tone="primary" width={2.5} />
      <DiagramText x={970} y={210} size={19}>
        fix and re-check
      </DiagramText>

      <DiagramArrow from={[970, 230]} to={[970, 283]} tone="primary" />

      {/* Row 2: review loop back to merge */}
      <LoopFrame x={745} y={285} width={450} height={205} label="until zero findings" />
      <DiagramBox
        cx={855}
        cy={395}
        width={200}
        height={nodeHeight}
        tone="primary"
        filled
        size={nodeText}
      >
        ultrareview
      </DiagramBox>
      <DiagramBox
        cx={1090}
        cy={395}
        width={200}
        height={nodeHeight}
        tone="primary"
        filled
        size={nodeText}
      >
        fix
      </DiagramBox>
      <DiagramArrow from={[955, 380]} to={[988, 380]} tone="primary" width={2.5} />
      <DiagramArrow from={[988, 410]} to={[955, 410]} tone="primary" width={2.5} />

      <DiagramArrow from={[745, 395]} to={[733, 395]} tone="primary" />
      <DiagramBox
        cx={607}
        cy={395}
        width={248}
        height={nodeHeight}
        tone="primary"
        filled
        size={nodeText}
      >
        security review
      </DiagramBox>
      <DiagramArrow from={[483, 395]} to={[457, 395]} tone="primary" />
      <DiagramBox
        cx={335}
        cy={395}
        width={240}
        height={nodeHeight}
        tone="primary"
        filled
        size={nodeText}
      >
        pull request
      </DiagramBox>
      <DiagramArrow from={[215, 395]} to={[177, 395]} tone="foreground" dashed />
      <DiagramBox
        cx={95}
        cy={395}
        width={160}
        height={nodeHeight}
        tone="foreground"
        dashed
        size={nodeText}
      >
        merge
      </DiagramBox>
      <DiagramText x={95} y={466} size={19}>
        human or auto
      </DiagramText>

      <QuestionBadge cx={18} cy={512} />
      <DiagramText x={46} y={519} anchor="start" size={20} tone="danger">
        stops until a human answers
      </DiagramText>
    </DiagramSvg>
  );
}

export function SpecddLoopSlide() {
  return (
    <SlideFrame
      chapter="more"
      heading={{
        title: 'From issue to merge',
        subtitle: 'Every stage hands a document to the next. Each loop runs until it is clean.',
      }}
      source={{
        href: 'https://github.com/emilwareus/addcommitpush.io/tree/main/spec-driven-development',
        label: 'github.com/emilwareus/addcommitpush.io/spec-driven-development',
      }}
    >
      <div className="mx-auto w-full max-w-[min(100%,calc((100vh-23rem)*1200/530))]">
        <SpecddLoop />
      </div>
    </SlideFrame>
  );
}
