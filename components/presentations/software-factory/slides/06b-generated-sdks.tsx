import { CodeBlock, CodeCard, ComparisonSlide, ReviewerQuestions } from './comparison';

export function GeneratedSdksSlide() {
  return (
    <ComparisonSlide
      chapter="a-lot"
      title="Generated SDKs"
      claim="If the contract matters, make it code the agent can import."
      source={{
        href: 'https://github.com/oaiz-io/gnr8',
        label: 'github.com/oaiz-io/gnr8',
      }}
      left={{
        heading: 'Contract in prose',
        caption: 'It runs. Whether it is right lives in a wiki page.',
        visual: (
          <CodeCard label="AGENT DIFF" tone="worse">
            <CodeBlock>{`await fetch(\`/api/sites/\${id}/alarm\`, {
  method: "PUT",
  body: JSON.stringify({ limit: 92 })
})`}</CodeBlock>
          </CodeCard>
        ),
        note: <ReviewerQuestions questions={['/alarm?', 'limit?', '°C or °F?', 'PUT or PATCH?']} />,
      }}
      right={{
        heading: 'Contract as code',
        caption: 'Change the contract, regenerate, and the compiler finds every old call site.',
        visual: (
          <CodeCard label="AGENT DIFF" tone="better">
            <CodeBlock>{`await alarms.setThreshold({
  siteId,
  thresholdCelsius: 92,
})`}</CodeBlock>
          </CodeCard>
        ),
        note: (
          <p className="font-mono text-[clamp(0.8rem,1.15vw,1.25rem)] text-primary">
            contract changes → tsc: 3 call sites to fix
          </p>
        ),
      }}
    />
  );
}
