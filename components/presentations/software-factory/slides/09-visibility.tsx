import { ComparisonSlide } from './comparison';
import { DiagramArrow, DiagramBox, DiagramSvg, DiagramText } from './diagram';

// The production signals OAIZ agents read: Grafana (Loki, Tempo, Prometheus), Sentry and a
// read-only Postgres replica. Each is exposed to the agent through a skill.
const productionSources: readonly { signal: string; tool: string }[] = [
  { signal: 'logs', tool: 'Loki' },
  { signal: 'traces', tool: 'Tempo' },
  { signal: 'metrics', tool: 'Prometheus' },
  { signal: 'errors', tool: 'Sentry' },
  { signal: 'data', tool: 'Postgres replica' },
];

const agent = { cx: 110, cy: 140 } as const;
const sourceX = 400;
const sourceWidth = 280;
const sourceRow = (index: number) => 40 + index * 50;

function ProductionSources({
  connected,
  reader,
  header,
}: {
  connected: boolean;
  reader: readonly [number, number];
  header: string;
}) {
  return (
    <g>
      <DiagramText
        x={sourceX}
        y={12}
        anchor="start"
        size={14}
        tone={connected ? 'primary' : 'quiet'}
        bold={connected}
      >
        {header}
      </DiagramText>
      {productionSources.map(({ signal, tool }, index) => {
        const cy = sourceRow(index);
        return (
          <g key={signal}>
            <DiagramArrow
              from={reader}
              to={[sourceX, cy]}
              tone={connected ? 'primary' : 'quiet'}
              width={connected ? 2 : 1.5}
              dashed={!connected}
              head={false}
            />
            <rect
              x={sourceX}
              y={cy - 20}
              width={sourceWidth}
              height={40}
              className={
                connected
                  ? 'fill-[var(--card)] stroke-primary'
                  : 'fill-background stroke-[var(--hair)]'
              }
              strokeWidth={connected ? 2.5 : 2}
              strokeDasharray={connected ? undefined : '6 5'}
            />
            <DiagramText
              x={sourceX + 16}
              y={cy + 6}
              anchor="start"
              tone={connected ? 'primary' : 'quiet'}
              bold
            >
              {signal}
            </DiagramText>
            <DiagramText
              x={sourceX + 112}
              y={cy + 6}
              anchor="start"
              size={16}
              tone={connected ? 'foreground' : 'quiet'}
            >
              {tool}
            </DiagramText>
          </g>
        );
      })}
    </g>
  );
}

// Without access, a human reads production and pastes a fragment into the chat.
const human = { cx: 305, cy: agent.cy } as const;

function BlindAgent() {
  return (
    <DiagramSvg
      height={330}
      label="Only a human can see production. The agent waits for them to paste a log line or a screenshot, and guesses from that"
    >
      <ProductionSources
        connected={false}
        reader={[human.cx + 50, human.cy]}
        header="PRODUCTION · ONLY YOU CAN SEE IT"
      />
      <DiagramBox cx={agent.cx} cy={agent.cy} width={160} height={56} tone="foreground" filled>
        agent
      </DiagramBox>
      <DiagramBox cx={human.cx} cy={human.cy} width={100} height={56} tone="danger">
        you
      </DiagramBox>
      <DiagramArrow from={[human.cx - 50, human.cy]} to={[agent.cx + 82, agent.cy]} tone="danger" />
      <DiagramText x={222} y={196} size={15} tone="danger">
        one log line,
      </DiagramText>
      <DiagramText x={222} y={215} size={15} tone="danger">
        a screenshot
      </DiagramText>
      <DiagramArrow from={[agent.cx, agent.cy + 28]} to={[agent.cx, 274]} tone="danger" />
      <DiagramBox cx={200} cy={300} width={300} height={44} tone="danger" size={17}>
        guesses the cause
      </DiagramBox>
      <DiagramText x={366} y={306} anchor="start" size={16} tone="danger">
        waits for more
      </DiagramText>
    </DiagramSvg>
  );
}

function SightedAgent() {
  return (
    <DiagramSvg
      height={330}
      label="The agent reads logs, traces, metrics, errors and a read-only data replica, and sees the blast radius of 53 rows before merge"
    >
      <ProductionSources
        connected
        reader={[agent.cx + 80, agent.cy]}
        header="PRODUCTION · READ-ONLY"
      />
      <DiagramBox cx={agent.cx} cy={agent.cy} width={160} height={56} tone="primary" filled bold>
        agent
      </DiagramBox>
      <DiagramArrow from={[agent.cx, agent.cy + 28]} to={[agent.cx, 274]} tone="primary" />
      <DiagramBox cx={200} cy={300} width={300} height={44} tone="primary" filled size={17}>
        blast radius: 53 rows
      </DiagramBox>
      <DiagramText x={366} y={306} anchor="start" size={16} tone="primary" bold>
        seen before merge
      </DiagramText>
    </DiagramSvg>
  );
}

export function VisibilitySlide() {
  return (
    <ComparisonSlide
      chapter="more"
      title="Give the agent visibility"
      claim="Eyes on production: debug the incident, then prevent the next one."
      left={{
        heading: 'Blind to production',
        caption:
          'The agent waits for you to paste context, and it is rarely enough to make the call.',
        visual: <BlindAgent />,
      }}
      right={{
        heading: 'Eyes on production',
        caption: 'It sees what changed and who it hits, and tests migrations on realistic data.',
        visual: <SightedAgent />,
      }}
    />
  );
}
