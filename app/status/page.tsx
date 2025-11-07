import { Suspense } from 'react'
import { getGitHubStatusData } from '@/lib/github'
import { getLinearStatusData } from '@/lib/linear'
import type { DayActivity } from '@/lib/github'
import { StatusGrid } from './components/status-grid'
import { StatusDashboard } from './status-dashboard'

export const dynamic = 'force-dynamic' // Don't pre-render at build time
export const revalidate = 3600 // 1 hour

export const metadata = {
  title: 'Status - Emil Wareus',
  description: 'What I\'m working on, listening to, and doing right now.',
  openGraph: {
    title: 'Status - Emil Wareus',
    description: 'Real-time view into my current activities.',
    url: 'https://addcommitpush.io/status',
    images: [
      {
        url: 'https://addcommitpush.io/og-status.png',
        width: 1200,
        height: 630,
        alt: 'Status Page',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Status - Emil Wareus',
    description: 'Real-time view into my current activities.',
    images: ['https://addcommitpush.io/og-status.png'],
  },
}

export default async function StatusPage() {
  const [githubData, linearData] = await Promise.all([
    getGitHubStatusData(),
    getLinearStatusData(),
  ])

  // Combine Linear issues with GitHub issues
  const combinedIssuesByDay: DayActivity[] = githubData.issuesByDay.map((githubDay, index) => {
    const linearDay = linearData.issuesByDay[index]
    return {
      date: githubDay.date,
      count: githubDay.count + (linearDay?.count || 0),
    }
  })

  const combinedTotalIssues = githubData.totalIssues + linearData.totalIssues

  // Create combined data
  const combinedData = {
    ...githubData,
    issuesByDay: combinedIssuesByDay,
    totalIssues: combinedTotalIssues,
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 neon-glow">
          Status
        </h1>
        <p className="text-muted-foreground text-lg">
          What I&apos;m working on, listening to, and doing right now.
        </p>
      </div>

      <Suspense fallback={<div>Loading activity...</div>}>
        <StatusGrid data={combinedData} />
      </Suspense>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Current Activity</h2>
        <StatusDashboard githubData={combinedData} />
      </div>

      <p className="text-sm text-muted-foreground mt-8">
        Last updated: Just now
      </p>
    </div>
  )
}
