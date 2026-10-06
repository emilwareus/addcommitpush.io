import {
  CodeCard,
  ComparisonSlide,
  Database,
  Port,
  ReviewOutline,
  ServiceLayers,
} from './comparison';

const testRun: readonly { status: 'pass' | 'fail'; name: string }[] = [
  { status: 'pass', name: 'returns readings for own site' },
  { status: 'pass', name: 'rejects missing permission' },
  { status: 'pass', name: 'rejects invalid date range' },
  { status: 'fail', name: "rejects another site's readings" },
];

function ComponentTestDiagram() {
  return (
    <svg
      viewBox="0 0 680 330"
      className="h-auto w-full"
      role="img"
      aria-label="A component test calls the public API; the service and its real database sit inside the test boundary, the external service is mocked outside"
    >
      <ServiceLayers
        x={140}
        y={60}
        width={330}
        height={220}
        portsWidth={80}
        adaptersWidth={90}
        domainHeight={80}
        outline="foreground"
        labelSize={13}
      />
      <g fill="none" className="stroke-primary" strokeWidth={3} strokeDasharray="4 5">
        <path d="M140 130 C 200 130, 250 110, 300 110" />
        <path d="M300 110 L 300 236" />
        <path d="M300 110 C 360 110, 410 120, 470 120" />
        <path d="M300 110 C 360 110, 410 220, 470 220" />
      </g>
      <g className="fill-primary">
        <circle cx={300} cy={110} r={10} />
        <circle cx={300} cy={240} r={7} />
      </g>

      <rect
        x={10}
        y={108}
        width={80}
        height={44}
        className="fill-background stroke-foreground"
        strokeWidth={2}
      />
      <text x={50} y={136} textAnchor="middle" className="fill-foreground font-mono" fontSize={15}>
        test
      </text>

      <g className="stroke-foreground" strokeWidth={2}>
        <line x1={90} y1={130} x2={128} y2={130} />
        <line x1={482} y1={120} x2={514} y2={120} />
        <line x1={482} y1={220} x2={604} y2={220} />
      </g>
      <Port cx={140} cy={130} />
      <Port cx={470} cy={120} />
      <Port cx={470} cy={220} />

      <Database cx={534} top={100} />
      <text x={534} y={172} textAnchor="middle" className="fill-foreground font-mono" fontSize={14}>
        real DB
      </text>

      <ReviewOutline x={110} y={20} width={478} height={300} />

      <rect
        x={604}
        y={196}
        width={70}
        height={48}
        fill="none"
        className="stroke-[var(--hair)]"
        strokeWidth={2}
        strokeDasharray="5 4"
      />
      <text x={639} y={225} textAnchor="middle" className="fill-foreground font-mono" fontSize={14}>
        mock
      </text>
      <text x={639} y={270} textAnchor="middle" className="fill-foreground font-mono" fontSize={12}>
        external
      </text>
    </svg>
  );
}

function TestRun() {
  return (
    <CodeCard label="COMPONENT TESTS · readings API" tone="better">
      <div className="grid grid-cols-[4em_1fr] gap-x-3 gap-y-0.5 text-[0.92em]">
        {testRun.map(({ status, name }) =>
          status === 'pass' ? (
            <div key={name} className="contents">
              <span className="font-semibold text-primary">PASS</span>
              <span>{name}</span>
            </div>
          ) : (
            <div key={name} className="contents text-[var(--danger)]">
              <span className="font-bold">FAIL</span>
              <span className="font-semibold">{name}</span>
              <span />
              <span>expected 404 · received 200</span>
            </div>
          )
        )}
      </div>
      <div className="-mx-5 mt-3 grid grid-cols-[4em_1fr] gap-x-3 text-[0.92em] border-t-[1.5px] border-dashed border-[var(--hair)] px-5 pt-3 text-primary">
        <span className="font-semibold">RUN 2</span>
        <span>agent fixes the query · 4 / 4 PASS</span>
      </div>
    </CodeCard>
  );
}

export function TestHardSlide() {
  return (
    <ComparisonSlide
      chapter="a-lot"
      title="Test hard what can be tested hard"
      claim="Tests are not for the percentage. They make behaviour visible."
      source={{
        href: 'https://addcommitpush.io/brain/tests-are-the-agent-feedback-loop',
        label: 'addcommitpush.io/brain/tests-are-the-agent-feedback-loop',
      }}
      left={{
        heading: 'Test at the boundary',
        caption: "Call the public API. Use the real database. Mock only what you don't own.",
        visual: <ComponentTestDiagram />,
      }}
      right={{
        heading: 'A failure the agent can act on',
        caption: 'You read the names. The agent reads the failure, fixes it and runs again.',
        visual: <TestRun />,
      }}
    />
  );
}
