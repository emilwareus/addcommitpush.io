import { ComparisonSlide } from './comparison';
import { DiagramArrow, DiagramBox, DiagramSvg, DiagramText } from './diagram';

const handoffs: readonly { status: string; ready: boolean }[] = [
  { status: 'ready for review', ready: true },
  { status: 'ready for review', ready: true },
  { status: 'blocked: question', ready: false },
  { status: 'needs a decision', ready: false },
];

function Laptop() {
  return (
    <DiagramSvg height={280} label="On a laptop one task runs while you watch it; three tasks wait">
      <DiagramText x={0} y={22} anchor="start" size={15}>
        YOUR LAPTOP
      </DiagramText>
      <rect
        x={0}
        y={34}
        width={680}
        height={230}
        fill="none"
        className="stroke-foreground"
        strokeWidth={2}
      />
      <DiagramBox cx={105} cy={80} width={170} height={48} tone="foreground" filled>
        task 1
      </DiagramBox>
      <DiagramBox cx={420} cy={80} width={170} height={48} tone="danger">
        you watch
      </DiagramBox>
      <DiagramArrow from={[190, 72]} to={[332, 72]} tone="foreground" width={2} />
      <DiagramArrow from={[332, 90]} to={[192, 90]} tone="foreground" width={2} />
      {[2, 3, 4].map((task, index) => {
        const cy = 142 + index * 48;
        return (
          <g key={task}>
            <DiagramBox cx={105} cy={cy} width={170} height={40} tone="quiet" dashed size={17}>
              task {task}
            </DiagramBox>
            <DiagramText x={205} y={cy + 5} anchor="start" size={16} tone="quiet">
              waiting
            </DiagramText>
          </g>
        );
      })}
    </DiagramSvg>
  );
}

function Server() {
  return (
    <DiagramSvg
      height={280}
      label="One server runs four tasks in their own workspaces; each ends in a handoff you review"
    >
      <DiagramText x={0} y={22} anchor="start" size={15}>
        ONE SERVER
      </DiagramText>
      <rect
        x={0}
        y={34}
        width={500}
        height={230}
        fill="none"
        className="stroke-foreground"
        strokeWidth={2}
      />
      {handoffs.map(({ status, ready }, index) => {
        const y = 70 + index * 52;
        return (
          <g key={`${status}-${index}`}>
            <rect
              x={16}
              y={y - 20}
              width={270}
              height={40}
              className="fill-[var(--card)] stroke-primary"
              strokeWidth={2}
            />
            <DiagramText x={30} y={y + 5} anchor="start" bold>
              task {index + 1}
            </DiagramText>
            <DiagramText x={110} y={y + 5} anchor="start" size={15}>
              agent · checks
            </DiagramText>
            <DiagramArrow from={[286, y]} to={[302, y]} tone="foreground" width={2} head={false} />
            <DiagramText
              x={306}
              y={y + 5}
              anchor="start"
              size={16}
              tone={ready ? 'primary' : 'foreground'}
              bold={ready}
            >
              {status}
            </DiagramText>
            <DiagramArrow from={[500, y]} to={[582, 150]} tone="quiet" width={2} />
          </g>
        );
      })}
      <DiagramBox cx={630} cy={150} width={90} height={52} tone="foreground">
        you
      </DiagramBox>
      <DiagramText x={630} y={198} size={16}>
        review
      </DiagramText>
    </DiagramSvg>
  );
}

export function ServerSlide() {
  return (
    <ComparisonSlide
      chapter="more"
      title="Get a server. Let it run"
      claim="Spend tokens. Save your attention."
      source={{
        href: 'https://addcommitpush.io/brain/setup-is-part-of-the-task',
        label: 'addcommitpush.io/brain/setup-is-part-of-the-task',
      }}
      left={{
        heading: 'One task at a time',
        caption: 'The agent waits for you, and the queue waits for the agent.',
        visual: <Laptop />,
      }}
      right={{
        heading: 'Many tasks, one inbox',
        caption: 'Each task runs in its own workspace. You only read the handoffs.',
        visual: <Server />,
      }}
    />
  );
}
