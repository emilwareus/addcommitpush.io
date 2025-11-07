import { Card } from '@/components/ui/card'
import type { GitHubStatusData } from '@/lib/github'

interface StatusGridProps {
  data: GitHubStatusData
}

function getCommitColor(count: number): string {
  if (count === 0) return 'bg-muted'
  if (count < 5) return 'bg-primary/50'
  if (count < 10) return 'bg-primary/80'
  return 'bg-primary'
}

function getPRColor(count: number): string {
  if (count === 0) return 'bg-muted'
  if (count === 1) return 'bg-secondary/60'
  if (count === 2) return 'bg-secondary/80'
  return 'bg-secondary'
}

function getIssueColor(count: number): string {
  if (count === 0) return 'bg-muted'
  if (count === 1) return 'bg-accent/60'
  if (count === 2) return 'bg-accent/80'
  return 'bg-accent'
}

function getReviewColor(count: number): string {
  if (count === 0) return 'bg-muted'
  if (count < 3) return 'bg-violet-500/60'
  if (count < 5) return 'bg-violet-500/80'
  return 'bg-violet-500'
}

function getTooltip(date: string, count: number, type: string): string {
  const formattedDate = new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' })
  const suffix = count === 1 ? '' : 's'
  return `${formattedDate}: ${count} ${type}${suffix}`
}

export function StatusGrid({ data }: StatusGridProps) {
  // Calculate uptime percentages for each activity type
  const totalDays = data.commitsByDay.length
  const daysWithCommits = data.commitsByDay.filter((d) => d.count > 0).length
  const daysWithPRs = data.prsByDay.filter((d) => d.count > 0).length
  const daysWithIssues = data.issuesByDay.filter((d) => d.count > 0).length
  const daysWithReviews = data.reviewsByDay.filter((d) => d.count > 0).length

  const commitUptime = Math.round((daysWithCommits / totalDays) * 100)
  const prUptime = Math.round((daysWithPRs / totalDays) * 100)
  const issueUptime = Math.round((daysWithIssues / totalDays) * 100)
  const reviewUptime = Math.round((daysWithReviews / totalDays) * 100)

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Activity</h2>
      </div>

      <Card className="p-4 sm:p-6">
        {/* Commits */}
        <div className="flex flex-col gap-2 py-4 border-b border-border/50">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold">Commits</p>
            <p className="text-sm font-mono text-muted-foreground">{commitUptime}% active</p>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {data.commitsByDay.map((day, i) => (
              <div
                key={i}
                className={`w-3 h-10 rounded flex-shrink-0 ${getCommitColor(day.count)} transition-all`}
                title={getTooltip(day.date, day.count, 'commit')}
              />
            ))}
          </div>
        </div>

        {/* Pull Requests */}
        <div className="flex flex-col gap-2 py-4 border-b border-border/50">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold">Pull Requests</p>
            <p className="text-sm font-mono text-muted-foreground">{prUptime}% active</p>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {data.prsByDay.map((day, i) => (
              <div
                key={i}
                className={`w-3 h-10 rounded flex-shrink-0 ${getPRColor(day.count)} transition-all`}
                title={getTooltip(day.date, day.count, 'PR')}
              />
            ))}
          </div>
        </div>

        {/* Issues */}
        <div className="flex flex-col gap-2 py-4 border-b border-border/50">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold">Issues Created</p>
            <p className="text-sm font-mono text-muted-foreground">{issueUptime}% active</p>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {data.issuesByDay.map((day, i) => (
              <div
                key={i}
                className={`w-3 h-10 rounded flex-shrink-0 ${getIssueColor(day.count)} transition-all`}
                title={getTooltip(day.date, day.count, 'issue')}
              />
            ))}
          </div>
        </div>

        {/* Reviews */}
        <div className="flex flex-col gap-2 py-4">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold">PR Reviews</p>
            <p className="text-sm font-mono text-muted-foreground">{reviewUptime}% active</p>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {data.reviewsByDay.map((day, i) => (
              <div
                key={i}
                className={`w-3 h-10 rounded flex-shrink-0 ${getReviewColor(day.count)} transition-all`}
                title={getTooltip(day.date, day.count, 'review')}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div>
              <p className="font-medium mb-2">Commits:</p>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-muted" />
                  <span>0</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-primary/50" />
                  <span>1-4</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-primary/80" />
                  <span>5-9</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-primary" />
                  <span>10+</span>
                </div>
              </div>
            </div>
            <div>
              <p className="font-medium mb-2">PRs & Issues:</p>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-muted" />
                  <span>0</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-secondary/60" />
                  <span>1</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-secondary/80" />
                  <span>2</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-secondary" />
                  <span>3+</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
