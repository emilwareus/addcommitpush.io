import { ComparisonSlide } from './comparison';
import { DiagramArrow, DiagramBox, DiagramSvg, DiagramText } from './diagram';

function OneBigBet() {
  return (
    <DiagramSvg
      height={290}
      label="Illustrative: one idea becomes one large build; learning starts at launch, when users turn out to want something else"
    >
      <DiagramBox cx={55} cy={70} width={100} tone="foreground">
        idea
      </DiagramBox>
      <DiagramArrow from={[105, 70]} to={[143, 70]} tone="foreground" />
      <DiagramBox cx={330} cy={70} width={370} height={60} tone="foreground" filled>
        build the whole thing
      </DiagramBox>
      <DiagramArrow from={[515, 70]} to={[553, 70]} tone="foreground" />
      <DiagramBox cx={615} cy={70} width={120} tone="foreground">
        launch
      </DiagramBox>
      <DiagramArrow from={[615, 95]} to={[615, 168]} tone="danger" />
      <DiagramBox cx={460} cy={196} width={420} height={54} tone="danger" size={17}>
        users wanted something else
      </DiagramBox>
      <DiagramText x={250} y={262} anchor="start" size={16} tone="danger">
        the first real feedback arrives last
      </DiagramText>
    </DiagramSvg>
  );
}

const variants = [
  { name: 'variant A', cy: 50, kept: false },
  { name: 'variant B', cy: 145, kept: true },
  { name: 'variant C', cy: 240, kept: false },
] as const;

function ManySmallBets() {
  return (
    <DiagramSvg
      height={290}
      label="Illustrative: one idea becomes three cheap variants; users try them, two are dropped and one is built deep"
    >
      <DiagramBox cx={50} cy={145} width={90} tone="foreground">
        idea
      </DiagramBox>
      {variants.map(({ name, cy, kept }) => (
        <g key={name}>
          <DiagramArrow from={[95, 145]} to={[148, cy]} tone="foreground" width={2} />
          <DiagramBox
            cx={210}
            cy={cy}
            width={120}
            height={46}
            tone={kept ? 'primary' : 'quiet'}
            filled={kept}
            dashed={!kept}
            size={16}
          >
            {name}
          </DiagramBox>
          <DiagramArrow
            from={[270, cy]}
            to={[338, 145]}
            tone={kept ? 'primary' : 'quiet'}
            width={2}
          />
        </g>
      ))}
      <DiagramBox cx={390} cy={145} width={100} tone="foreground">
        users
      </DiagramBox>
      <DiagramArrow from={[440, 145]} to={[478, 145]} tone="primary" />
      <DiagramBox cx={580} cy={145} width={200} height={90} tone="primary" filled bold>
        build B deep
      </DiagramBox>
      <DiagramText x={210} y={92} size={14} tone="quiet">
        dropped
      </DiagramText>
      <DiagramText x={210} y={282} size={14} tone="quiet">
        dropped
      </DiagramText>
    </DiagramSvg>
  );
}

export function BuildToLearnSlide() {
  return (
    <ComparisonSlide
      chapter="most"
      title="Build to learn"
      claim="Code is cheap now. Spend it on learning what users want."
      source={{
        href: 'https://addcommitpush.io/blog/saas-zero-to-one-hindsight',
        label: 'addcommitpush.io/blog/saas-zero-to-one-hindsight',
      }}
      left={{
        heading: 'One big bet',
        caption: 'Months of conviction, then the first real answer from users.',
        visual: <OneBigBet />,
      }}
      right={{
        heading: 'Many small bets',
        caption: 'Build three rough versions, let users choose, then build one properly.',
        visual: <ManySmallBets />,
      }}
    />
  );
}
