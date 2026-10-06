import { CodeBlock, CodeCard, ComparisonSlide, ReviewerQuestions } from './comparison';

export function CodeQualitySlide() {
  return (
    <ComparisonSlide
      chapter="a-lot"
      title="Code quality"
      claim="Code quality is how fast you can judge the agent's change."
      source={{
        href: 'https://addcommitpush.io/brain/maintainability-beats-one-shot-correctness',
        label: 'addcommitpush.io/brain/maintainability-beats-one-shot-correctness',
      }}
      left={{
        heading: 'Hard to judge',
        caption: 'The tests pass. You still have to decode the rule.',
        visual: (
          <CodeCard label="AGENT DIFF" tone="worse">
            <CodeBlock>{`if (s.t > 92 && s.m !== 2 && !f) {
  await doThing(s, a, true, 3)
}`}</CodeBlock>
          </CodeCard>
        ),
        note: <ReviewerQuestions questions={['92?', 'm !== 2?', 'f?', 'true, 3?', 'doThing?']} />,
      }}
      right={{
        heading: 'Easy to judge',
        caption: 'The tests pass. The rule reads like the domain, so you can say yes or no.',
        visual: (
          <CodeCard label="AGENT DIFF" tone="better">
            <CodeBlock>{`if (sensor.isOverheating()) {
  await alarms.raise(
    OverheatAlarm.for(sensor))
}`}</CodeBlock>
          </CodeCard>
        ),
        note: (
          <p className="font-serif text-[clamp(1rem,1.6vw,1.6rem)] italic text-primary">
            &ldquo;Raise an overheat alarm for this sensor.&rdquo;
          </p>
        ),
      }}
    />
  );
}
