import { Claim, SlideShell, SourceLink } from './shared';

const axisMin = 35;
const axisMax = 100;

const modelGroups = [
  {
    label: 'Frontier / agentic',
    rows: [
      {
        model: 'Claude Code',
        version: ['v2.0.13', 'claude-sonnet-4-5-20250929'],
        unhealthy: 94.8,
        healthy: 96.2,
        gap: '+1.4 pp',
      },
      {
        model: 'Sonnet',
        version: ['claude-sonnet-4-5-20250929'],
        unhealthy: 84.0,
        healthy: 86.8,
        gap: '+2.7 pp',
      },
    ],
  },
  {
    label: 'Medium direct LLMs',
    rows: [
      {
        model: 'Qwen',
        version: ['Qwen3-Coder-30B-A3B-Instruct'],
        unhealthy: 72.2,
        healthy: 80.7,
        gap: '+8.6 pp',
      },
      {
        model: 'GPT-OSS',
        version: ['gpt-oss-20b'],
        unhealthy: 53.0,
        healthy: 64.1,
        gap: '+11.2 pp',
      },
      {
        model: 'GLM',
        version: ['GLM-4-32B-0414'],
        unhealthy: 50.0,
        healthy: 60.1,
        gap: '+10.2 pp',
      },
      {
        model: 'Gemma',
        version: ['gemma-3-27b-it'],
        unhealthy: 40.6,
        healthy: 55.7,
        gap: '+15.1 pp',
      },
      {
        model: 'Granite',
        version: ['Granite-4.0-H-Small'],
        unhealthy: 37.2,
        healthy: 46.5,
        gap: '+9.3 pp',
      },
    ],
  },
] as const;

const axisTicks = [40, 60, 80, 100] as const;

function position(value: number) {
  return `${((value - axisMin) / (axisMax - axisMin)) * 100}%`;
}

export function CodeQualityEvidenceSlide() {
  return (
    <SlideShell>
      <Claim>Better models flatten the CodeHealth gap.</Claim>

      <div className="w-full max-w-7xl">
        <div className="mb-3 grid grid-cols-[260px_minmax(0,1fr)_92px] gap-6 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <div>Model</div>
          <div>Refactor tests passed</div>
          <div className="text-right">Gap</div>
        </div>

        <div className="grid grid-cols-[260px_minmax(0,1fr)_92px] gap-6">
          <div />
          <div className="relative h-7 border-t border-border/50 font-mono text-sm text-muted-foreground">
            {axisTicks.map((tick) => (
              <span
                key={tick}
                className="absolute top-2 -translate-x-1/2"
                style={{ left: position(tick) }}
              >
                {tick}%
              </span>
            ))}
          </div>
          <div />
        </div>

        <div className="mt-2 space-y-4">
          {modelGroups.map((group) => (
            <section key={group.label}>
              <div className="mb-2 font-mono text-sm uppercase tracking-[0.22em] text-primary/75">
                {group.label}
              </div>

              <div>
                {group.rows.map((row) => {
                  const unhealthyLeft = position(row.unhealthy);
                  const healthyLeft = position(row.healthy);
                  const connectorWidth = `calc(${healthyLeft} - ${unhealthyLeft})`;

                  return (
                    <div
                      key={row.model}
                      className="grid grid-cols-[260px_minmax(0,1fr)_92px] items-center gap-6"
                    >
                      <div className="font-mono">
                        <div className="text-xl leading-tight text-foreground">{row.model}</div>
                        <div className="mt-1 space-y-0.5 text-xs leading-none text-muted-foreground">
                          {row.version.map((version) => (
                            <div key={version}>{version}</div>
                          ))}
                        </div>
                      </div>

                      <div className="relative h-[68px]">
                        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border/45" />

                        {axisTicks.map((tick) => (
                          <div
                            key={tick}
                            className="absolute top-1/2 h-9 w-px -translate-y-1/2 bg-border/35"
                            style={{ left: position(tick) }}
                          />
                        ))}

                        <div
                          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-primary/65"
                          style={{ left: unhealthyLeft, width: connectorWidth }}
                        />

                        <div
                          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                          style={{ left: unhealthyLeft }}
                        >
                          <span className="block h-4 w-4 rounded-full border border-muted-foreground bg-background shadow-[0_0_14px_rgba(148,163,184,0.45)]" />
                        </div>
                        <span
                          className="absolute top-0 -translate-x-1/2 font-mono text-sm leading-none text-muted-foreground"
                          style={{ left: unhealthyLeft }}
                        >
                          {row.unhealthy.toFixed(1)}
                        </span>

                        <div
                          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                          style={{ left: healthyLeft }}
                        >
                          <span className="block h-5 w-5 rounded-full bg-primary shadow-[0_0_18px_rgba(20,184,166,0.8)]" />
                        </div>
                        <span
                          className="absolute bottom-0 -translate-x-1/2 font-mono text-sm font-semibold leading-none text-primary"
                          style={{ left: healthyLeft }}
                        >
                          {row.healthy.toFixed(1)}
                        </span>
                      </div>

                      <div className="text-right font-mono text-xl font-bold text-primary">
                        {row.gap}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between text-base text-muted-foreground">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground bg-background" />
              <span>unhealthy code</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-primary" />
              <span className="text-primary">healthy code</span>
            </div>
          </div>

          <SourceLink href="https://arxiv.org/abs/2601.02200">
            Borg et al., 2026 · Python competitive-programming files
          </SourceLink>
        </div>
      </div>
    </SlideShell>
  );
}
