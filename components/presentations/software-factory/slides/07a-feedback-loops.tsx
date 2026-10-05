import { ComparisonSlide } from './comparison';
import { DiagramArrow, DiagramBox, DiagramSvg, DiagramText } from './diagram';

const evaluators = ['tests', 'types', 'lint', 'the running app'] as const;
const durableArtifacts = ['lint rule', 'test', 'AGENTS.md line', 'skill'] as const;

function InnerLoop() {
  return (
    <DiagramSvg
      height={330}
      label="Inner loop: edit, run the checks, read the failure, fix, until green, then a PR"
    >
      <DiagramBox cx={300} cy={42} width={170} tone="primary" filled size={19}>
        edit
      </DiagramBox>
      <DiagramBox cx={495} cy={165} width={190} tone="primary" filled>
        run the checks
      </DiagramBox>
      <DiagramBox cx={300} cy={288} width={200} tone="primary" filled>
        read the failure
      </DiagramBox>
      <DiagramBox cx={95} cy={165} width={170} tone="primary" filled size={19}>
        fix
      </DiagramBox>
      <DiagramArrow from={[385, 42]} via={[495, 42]} to={[495, 138]} tone="primary" />
      <DiagramArrow from={[495, 192]} via={[495, 288]} to={[402, 288]} tone="primary" />
      <DiagramArrow from={[198, 288]} via={[95, 288]} to={[95, 192]} tone="primary" />
      <DiagramArrow from={[95, 138]} via={[95, 42]} to={[213, 42]} tone="primary" />
      {evaluators.map((evaluator, index) => (
        <DiagramText key={evaluator} x={300} y={140 + index * 24}>
          {evaluator}
        </DiagramText>
      ))}
      <DiagramArrow from={[590, 165]} to={[612, 165]} tone="foreground" />
      <DiagramBox cx={646} cy={165} width={64} height={40} tone="foreground" bold>
        PR
      </DiagramBox>
    </DiagramSvg>
  );
}

function OuterLoop() {
  return (
    <DiagramSvg
      height={330}
      label="Outer loop: next task, inner loop, your review, correction, learn, back to the next task"
    >
      <DiagramBox cx={330} cy={42} width={170} tone="foreground">
        next task
      </DiagramBox>
      <DiagramBox cx={545} cy={165} width={180} tone="primary" filled>
        inner loop
      </DiagramBox>
      <DiagramBox cx={330} cy={288} width={200} tone="foreground">
        your review
      </DiagramBox>
      <DiagramBox cx={115} cy={165} width={200} tone="primary" filled size={19} bold>
        learn
      </DiagramBox>
      <DiagramArrow from={[415, 42]} via={[545, 42]} to={[545, 138]} tone="foreground" />
      <DiagramArrow from={[545, 192]} via={[545, 288]} to={[432, 288]} tone="foreground" />
      <DiagramArrow from={[228, 288]} via={[115, 288]} to={[115, 192]} tone="danger" />
      <DiagramText x={140} y={238} anchor="start" size={16} tone="danger">
        correction
      </DiagramText>
      <DiagramArrow from={[115, 138]} via={[115, 42]} to={[243, 42]} tone="primary" />
      {durableArtifacts.map((artifact, index) => (
        <DiagramText key={artifact} x={330} y={140 + index * 24} tone="primary">
          {artifact}
        </DiagramText>
      ))}
    </DiagramSvg>
  );
}

export function FeedbackLoopsSlide() {
  return (
    <ComparisonSlide
      chapter="more"
      title="Feedback loops"
      claim="The agent checks its own work. Every correction makes the next task better."
      source={{
        href: 'https://addcommitpush.io/brain/designing-learning-loops-in-harnesses',
        label: 'addcommitpush.io/brain/designing-learning-loops-in-harnesses',
      }}
      left={{
        heading: 'Inner loop: self-verification',
        caption: 'The agent proves the change against real checks before it asks for your time.',
        visual: <InnerLoop />,
      }}
      right={{
        heading: 'Outer loop: learning',
        caption:
          'Every correction you make becomes a rule, a test or a skill. The next task starts with it.',
        visual: <OuterLoop />,
      }}
    />
  );
}
