import type { DayActivity } from '@/lib/github';

interface GitHubChartProps {
  data: DayActivity[];
}

export function GitHubChart({ data }: GitHubChartProps) {
  const width = 800;
  const height = 200;
  const padding = { top: 10, right: 10, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barWidth = Math.max(1, chartWidth / data.length - 1);

  // Get month labels
  const monthLabels: { x: number; label: string }[] = [];
  const seenMonths = new Set<string>();

  data.forEach((day, i) => {
    const date = new Date(day.date);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    if (!seenMonths.has(monthKey)) {
      seenMonths.add(monthKey);
      monthLabels.push({
        x: padding.left + (i / data.length) * chartWidth,
        label: date.toLocaleDateString('en', { month: 'short' }),
      });
    }
  });

  // Y-axis ticks
  const yTicks = [0, Math.round(maxCount / 2), maxCount];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Y-axis */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        stroke="oklch(0.7 0.14 195)"
        strokeWidth={1}
      />

      {/* Y-axis ticks and labels */}
      {yTicks.map((tick) => {
        const y = height - padding.bottom - (tick / maxCount) * chartHeight;
        return (
          <g key={tick}>
            <line
              x1={padding.left - 4}
              y1={y}
              x2={padding.left}
              y2={y}
              stroke="oklch(0.7 0.14 195)"
              strokeWidth={1}
            />
            <text
              x={padding.left - 8}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              fill="oklch(0.7 0.14 195)"
              fontSize={12}
            >
              {tick}
            </text>
          </g>
        );
      })}

      {/* X-axis */}
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke="oklch(0.7 0.14 195)"
        strokeWidth={1}
      />

      {/* X-axis month labels */}
      {monthLabels.map(({ x, label }) => (
        <text
          key={`${x}-${label}`}
          x={x}
          y={height - padding.bottom + 16}
          textAnchor="start"
          fill="oklch(0.7 0.14 195)"
          fontSize={12}
        >
          {label}
        </text>
      ))}

      {/* Bars */}
      {data.map((day, i) => {
        const barHeight = (day.count / maxCount) * chartHeight;
        const x = padding.left + (i / data.length) * chartWidth;
        const y = height - padding.bottom - barHeight;

        return (
          <rect
            key={day.date}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            fill="oklch(0.7 0.14 195)"
            rx={2}
          />
        );
      })}
    </svg>
  );
}
