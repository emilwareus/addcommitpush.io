import { ComparisonSlide } from './comparison';
import { DiagramSvg, DiagramText } from './diagram';

const problems = ['problem 1', 'problem 2', 'problem 3', 'problem 4', 'problem 5'] as const;
const surfaces = ['web', 'mobile', 'API', 'on-prem'] as const;

const gridX = 100;
const gridY = 40;
const cellWidth = 106;
const cellHeight = 52;
const cellGap = 10;

function ScopeGrid({ focus }: { focus?: number }) {
  return (
    <DiagramSvg
      height={310}
      label={
        focus === undefined
          ? 'Illustrative: five problems on four surfaces, every cell started and none finished'
          : 'Illustrative: one problem finished on every surface, the other four marked not now'
      }
    >
      {problems.map((problem, column) => {
        const x = gridX + column * (cellWidth + cellGap);
        const focused = column === focus;
        const parked = focus !== undefined && !focused;
        return (
          <g key={problem}>
            <DiagramText
              x={x + cellWidth / 2}
              y={gridY - 14}
              size={15}
              tone={focused ? 'primary' : parked ? 'quiet' : 'foreground'}
              bold={focused}
            >
              {problem}
            </DiagramText>
            {surfaces.map((surface, row) => {
              const y = gridY + row * (cellHeight + cellGap);
              return (
                <g key={surface}>
                  <rect
                    x={x}
                    y={y}
                    width={cellWidth}
                    height={cellHeight}
                    className={
                      focused
                        ? 'fill-primary'
                        : parked
                          ? 'fill-background stroke-[var(--hair)]'
                          : 'fill-background stroke-[var(--danger)]'
                    }
                    strokeWidth={focused ? 0 : 2}
                    strokeDasharray={parked ? '6 5' : undefined}
                  />
                  {focus === undefined ? (
                    <rect
                      x={x}
                      y={y}
                      width={cellWidth * 0.2}
                      height={cellHeight}
                      className="fill-[var(--danger)]"
                    />
                  ) : null}
                </g>
              );
            })}
            {parked ? (
              <DiagramText
                x={x + cellWidth / 2}
                y={gridY + 4 * (cellHeight + cellGap) + 14}
                size={14}
                tone="quiet"
              >
                not now
              </DiagramText>
            ) : null}
          </g>
        );
      })}
      {surfaces.map((surface, row) => (
        <DiagramText
          key={surface}
          x={0}
          y={gridY + row * (cellHeight + cellGap) + cellHeight / 2 + 6}
          anchor="start"
          size={16}
        >
          {surface}
        </DiagramText>
      ))}
    </DiagramSvg>
  );
}

export function FocusSlide() {
  return (
    <ComparisonSlide
      chapter="most"
      title="Know what not to build"
      claim="Good taste is knowing what not to build."
      source={{
        href: 'https://addcommitpush.io/blog/saas-zero-to-one-hindsight',
        label: 'addcommitpush.io/blog/saas-zero-to-one-hindsight',
      }}
      left={{
        heading: 'Everything, a little',
        caption: 'Cheap code makes it tempting to start everything. Nothing gets finished.',
        visual: <ScopeGrid />,
      }}
      right={{
        heading: 'One thing, deeply',
        caption: 'Pick one problem and finish it everywhere. The rest waits, on purpose.',
        visual: <ScopeGrid focus={1} />,
      }}
    />
  );
}
