import { CodeCard, ComparisonSlide, Database, Port, ServiceLayers } from './comparison';

function ShortcutDiagram({ blocked }: { blocked: boolean }) {
  const pathClass = blocked ? 'stroke-primary' : 'stroke-[var(--hair)]';
  const nodeClass = blocked ? 'fill-primary' : 'fill-[var(--hair)]';

  return (
    <svg
      viewBox="0 0 680 190"
      className="h-auto max-h-[19vh] w-full"
      role="img"
      aria-label={
        blocked
          ? 'The route-to-database shortcut is blocked at the app boundary; the change goes through the app layer'
          : 'The route reaches the database directly, skipping the app layer'
      }
    >
      <ServiceLayers
        x={120}
        y={10}
        width={410}
        height={170}
        portsWidth={100}
        adaptersWidth={110}
        domainHeight={60}
        outline="foreground"
        labelSize={14}
      />
      <g fill="none" className={pathClass} strokeWidth={blocked ? 3 : 2} strokeDasharray="4 5">
        <path d="M120 120 C 180 120, 260 85, 320 85" />
        <path d="M320 85 C 380 85, 470 120, 530 120" />
        <path d="M320 85 L 320 160" />
      </g>
      <circle cx={320} cy={85} r={10} className={nodeClass} />
      <circle cx={320} cy={164} r={7} className={nodeClass} />
      {blocked ? (
        <g className="stroke-[var(--danger)]">
          <line x1={120} y1={60} x2={206} y2={60} strokeWidth={3} />
          <g strokeWidth={4} strokeLinecap="round">
            <line x1={208} y1={48} x2={232} y2={72} />
            <line x1={232} y1={48} x2={208} y2={72} />
          </g>
        </g>
      ) : (
        <line
          x1={120}
          y1={60}
          x2={530}
          y2={60}
          className="stroke-[var(--danger)]"
          strokeWidth={3}
        />
      )}
      <g className="stroke-foreground" strokeWidth={2}>
        <line x1={40} y1={60} x2={108} y2={60} />
        <line x1={40} y1={120} x2={108} y2={120} />
        <line x1={542} y1={90} x2={590} y2={90} />
      </g>
      <Port cx={120} cy={60} />
      <Port cx={120} cy={120} />
      <Port cx={530} cy={90} />
      <Database cx={616} top={72} tone={blocked ? 'foreground' : 'danger'} />
    </svg>
  );
}

export function LintSlide() {
  return (
    <ComparisonSlide
      chapter="a-lot"
      title="Lint your codebase"
      claim="Every repeated mistake becomes a check, not a sentence."
      source={{
        href: 'https://github.com/oaiz-io/polint',
        label: 'github.com/oaiz-io/polint',
      }}
      left={{
        heading: 'A rule in a document',
        caption: 'The agent may read it. Nothing stops the shortcut.',
        visual: (
          <div className="space-y-[clamp(0.5rem,1.5vh,1rem)]">
            <CodeCard label="AGENTS.MD" tone="worse">
              <p>Routes must go through the app layer. Never touch the database from a route.</p>
            </CodeCard>
            <ShortcutDiagram blocked={false} />
          </div>
        ),
      }}
      right={{
        heading: 'A rule in the linter',
        caption: 'The check fails with a file, a line and a fix. The agent repairs it in the loop.',
        visual: (
          <div className="space-y-[clamp(0.5rem,1.5vh,1rem)]">
            <CodeCard label="LINT · ports/http.go:42" tone="better">
              <p className="font-semibold text-[var(--danger)]">no-route-db-access</p>
              <p className="text-primary">Move persistence behind the app command.</p>
            </CodeCard>
            <ShortcutDiagram blocked />
          </div>
        ),
      }}
    />
  );
}
