'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { DayActivity } from '@/lib/github';

interface GitHubChartProps {
  data: DayActivity[];
}

export function GitHubChart({ data }: GitHubChartProps) {
  // Get the first day of each month to use as ticks
  const monthTicks: string[] = [];
  const seenMonths = new Set<string>();

  data.forEach((day) => {
    const date = new Date(day.date);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

    // Only add the first occurrence of each month
    if (!seenMonths.has(monthKey)) {
      seenMonths.add(monthKey);
      monthTicks.push(day.date);
    }
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
        <XAxis
          dataKey="date"
          tickFormatter={(val) => {
            const date = new Date(val);
            return date.toLocaleDateString('en', { month: 'short' });
          }}
          ticks={monthTicks}
          fontSize={12}
          stroke="oklch(0.7 0.14 195)"
        />
        <YAxis fontSize={12} stroke="oklch(0.7 0.14 195)" width={35} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'oklch(0.15 0.015 265)',
            border: '1px solid oklch(0.25 0.015 265)',
            borderRadius: '8px',
          }}
          labelStyle={{ color: 'oklch(0.92 0.005 280)' }}
        />
        <Bar dataKey="count" fill="oklch(0.7 0.14 195)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
