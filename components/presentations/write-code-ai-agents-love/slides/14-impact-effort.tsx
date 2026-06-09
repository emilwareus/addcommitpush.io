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

      <div className="relative h-[470px] w-full max-w-6xl">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-mono uppercase tracking-[0.24em] text-muted-foreground">
          impact
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-sm font-mono uppercase tracking-[0.24em] text-muted-foreground">
          effort
        </div>

        <div className="absolute inset-x-16 bottom-12 top-0">
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
        </div>

        <div className="absolute bottom-12 left-16 right-16 flex justify-between pt-3 text-sm text-muted-foreground">
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
        </div>
        <div className="absolute bottom-12 left-16 top-0 flex -translate-x-7 flex-col-reverse justify-between py-2 text-sm text-muted-foreground">
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
        </div>
      </div>
    </SlideShell>
  );
}
