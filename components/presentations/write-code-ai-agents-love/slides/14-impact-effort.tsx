import { Claim, SlideShell } from './shared';

function MatrixItem({
  label,
  x,
  y,
  dx = 0,
  dy = 0,
}: {
  label: string;
  x: number;
  y: number;
  dx?: number;
  dy?: number;
}) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-md border border-primary/40 bg-primary/15 px-3 py-2 text-center text-sm font-semibold text-primary shadow-lg shadow-black/20"
      style={{
        left: `calc(${((x - 0.5) / 4) * 100}% + ${dx}px)`,
        top: `calc(${((4.5 - y) / 4) * 100}% + ${dy}px)`,
      }}
    >
      {label}
    </div>
  );
}

export function ImpactEffortSlide() {
  return (
    <SlideShell>
      <Claim>Start with high impact and manageable effort.</Claim>

      <div className="relative h-[470px] w-full max-w-6xl px-8 pb-8">
        <div className="relative h-full w-full">
          <div className="grid h-full grid-cols-4 grid-rows-4 rounded-lg border border-border/80 bg-card/40 shadow-lg shadow-black/20">
            {Array.from({ length: 16 }).map((_, index) => (
              <div key={index} className="border border-border/35" />
            ))}
          </div>

          <MatrixItem label="AGENTS.md" x={1} y={2} />
          <MatrixItem label="subagents" x={2} y={2} dy={12} />
          <MatrixItem label="architecture docs" x={2} y={3} />
          <MatrixItem label="generated SDKs" x={2} y={4} dx={-6} />
          <MatrixItem label="tests" x={3} y={4} dx={-35} dy={-18} />
          <MatrixItem label="custom rules" x={3} y={4} dx={45} dy={20} />
          <MatrixItem label="code quality" x={4} y={3} />
          <MatrixItem label="bounded context" x={4} y={4} />

          <span className="absolute -bottom-7 left-0 text-sm font-mono uppercase tracking-[0.24em] text-muted-foreground">
            lower impact/effort
          </span>
          <span className="absolute -bottom-7 right-0 text-sm font-mono uppercase tracking-[0.24em] text-muted-foreground">
            high effort
          </span>
          <span className="absolute -left-2 top-0 -translate-x-full text-sm font-mono uppercase tracking-[0.24em] text-muted-foreground">
            high impact
          </span>
        </div>
      </div>
    </SlideShell>
  );
}
