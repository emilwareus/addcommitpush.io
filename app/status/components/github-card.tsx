import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GitHubChart } from './github-chart'
import type { GitHubStatusData } from '@/lib/github'

interface GitHubCardProps {
  data: GitHubStatusData
}

export function GitHubCard({ data }: GitHubCardProps) {
  return (
    <Card className="h-full flex flex-col hover:border-primary/40 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex flex-col">
            <span>GitHub Activity</span>
            <span className="text-xs font-normal text-muted-foreground">Past year</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Stats Grid - Server Rendered */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-bold text-primary">{data.totalCommits}</p>
            <p className="text-xs text-muted-foreground">Commits</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-secondary">{data.totalPRs}</p>
            <p className="text-xs text-muted-foreground">Pull Requests</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-accent">{data.totalIssues}</p>
            <p className="text-xs text-muted-foreground">Issues</p>
          </div>
        </div>

        {/* Chart - Client Component - Always visible */}
        <div className="flex flex-1 min-h-[200px] -ml-2">
          <GitHubChart data={data.commitsByDay} />
        </div>
      </CardContent>
    </Card>
  )
}
