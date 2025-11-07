'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import type { DayActivity } from '@/lib/github'

interface GitHubChartProps {
  data: DayActivity[]
}

export function GitHubChart({ data }: GitHubChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis
          dataKey="date"
          tickFormatter={(val) => new Date(val).toLocaleDateString('en', { weekday: 'short' })}
          fontSize={12}
          stroke="oklch(0.7 0.14 195)"
        />
        <YAxis fontSize={12} stroke="oklch(0.7 0.14 195)" />
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
  )
}
