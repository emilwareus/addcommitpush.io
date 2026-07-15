'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HealthMeasurement } from '@/lib/life/contracts';
import { enumLabel, formatInOwnerTimezone } from '@/lib/life/formatting';

export function HealthChart({
  measurements,
  timezone,
}: {
  measurements: HealthMeasurement[];
  timezone: string;
}) {
  if (measurements.length === 0) return null;
  const { metric_code: metricCode, unit } = measurements[0];
  if (
    !measurements.every(
      (measurement) => measurement.metric_code === metricCode && measurement.unit === unit
    )
  ) {
    throw new Error('Health charts require exactly one metric code and unit.');
  }
  const points = [...measurements].reverse().map((measurement) => ({
    timestamp: Date.parse(measurement.measured_at),
    value: measurement.value,
  }));
  return (
    <section className="border border-dashed border-border bg-card p-5 sm:p-6">
      <header>
        <p className="section-kicker">{enumLabel(metricCode)}</p>
        <h2 className="mt-2 font-serif text-2xl font-semibold text-primary">
          {metricCode} · {unit}
        </h2>
      </header>
      {points.length > 1 && (
        <div className="mt-5 h-64 w-full" aria-label={`${metricCode} trend in ${unit}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={points}
              accessibilityLayer
              margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(value: number) =>
                  new Intl.DateTimeFormat('en', {
                    timeZone: timezone,
                    month: 'short',
                    day: 'numeric',
                  }).format(new Date(value))
                }
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) =>
                  formatInOwnerTimezone(new Date(Number(value)).toISOString(), timezone)
                }
                formatter={(value) => [`${String(value)} ${unit}`, enumLabel(metricCode)]}
              />
              <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-dashed border-border">
              <th className="p-3">Measured start</th>
              <th className="p-3">Measured end</th>
              <th className="p-3">Value</th>
              <th className="p-3">Dimensions</th>
              <th className="p-3">Provenance</th>
            </tr>
          </thead>
          <tbody>
            {measurements.map((measurement) => (
              <tr
                key={measurement.id}
                className="border-b border-dashed border-border last:border-0"
              >
                <td className="p-3">{formatInOwnerTimezone(measurement.measured_at, timezone)}</td>
                <td className="p-3">
                  {measurement.ended_at
                    ? formatInOwnerTimezone(measurement.ended_at, timezone)
                    : 'Point measurement'}
                </td>
                <td className="p-3 font-medium">
                  {measurement.value} {measurement.unit}
                </td>
                <td className="p-3">
                  <code>{JSON.stringify(measurement.dimensions)}</code>
                </td>
                <td className="p-3">
                  {measurement.source_id ? `Source ${measurement.source_id}` : 'Manual'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
