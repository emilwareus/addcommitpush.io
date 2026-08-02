'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import type { GitHubStatusData } from '@/lib/github';

interface StatusGridProps {
  data: GitHubStatusData;
}

interface IncidentReport {
  title: string;
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate?: string; // Optional end date for date ranges
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'maintenance';
}

const INCIDENTS: IncidentReport[] = [
  {
    title: 'Downtime',
    startDate: '2024-10-31',
    description: 'Camping with two friends and a dog.',
    severity: 'critical',
  },
  {
    title: 'Limited availability',
    startDate: '2024-09-05',
    endDate: '2024-09-18',
    description: 'Traveling Iceland and got engaged.',
    severity: 'major',
  },
];

function getCommitColor(count: number): string {
  if (count === 0) return 'bg-muted';
  if (count < 5) return 'bg-primary/50';
  if (count < 10) return 'bg-primary/80';
  return 'bg-primary';
}

function getPRColor(count: number): string {
  if (count === 0) return 'bg-muted';
  if (count === 1) return 'bg-secondary/60';
  if (count === 2) return 'bg-secondary/80';
  return 'bg-secondary';
}

function getIssueColor(count: number): string {
  if (count === 0) return 'bg-muted';
  if (count === 1) return 'bg-accent/60';
  if (count === 2) return 'bg-accent/80';
  return 'bg-accent';
}

function getReviewColor(count: number): string {
  if (count === 0) return 'bg-muted';
  if (count < 3) return 'bg-primary/40';
  if (count < 5) return 'bg-primary/70';
  return 'bg-primary';
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateRange(startDate: string, endDate?: string): string {
  const start = formatDate(startDate);
  if (!endDate || startDate === endDate) {
    return start;
  }
  const end = formatDate(endDate);
  return `${start} - ${end}`;
}

function getSeverityColor(severity: IncidentReport['severity']): string {
  switch (severity) {
    case 'critical':
      return 'bg-primary';
    case 'major':
      return 'bg-primary/80';
    case 'minor':
      return 'bg-primary/60';
    case 'maintenance':
      return 'bg-primary/40';
    default:
      return 'bg-muted-foreground';
  }
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: { date: string; count: number; label: string };
}

export function StatusGrid({ data }: StatusGridProps) {
  // Calculate uptime percentages for each activity type
  const totalDays = data.commitsByDay.length;
  const daysWithCommits = data.commitsByDay.filter((d) => d.count > 0).length;
  const daysWithPRs = data.prsByDay.filter((d) => d.count > 0).length;
  const daysWithIssues = data.issuesByDay.filter((d) => d.count > 0).length;
  const daysWithReviews = data.reviewsByDay.filter((d) => d.count > 0).length;

  const commitUptime = Math.round((daysWithCommits / totalDays) * 100);
  const prUptime = Math.round((daysWithPRs / totalDays) * 100);
  const issueUptime = Math.round((daysWithIssues / totalDays) * 100);
  const reviewUptime = Math.round((daysWithReviews / totalDays) * 100);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: { date: '', count: 0, label: '' },
  });

  const handleBarHover = (
    e: React.MouseEvent<HTMLDivElement>,
    day: { date: string; count: number },
    label: string
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      content: { date: day.date, count: day.count, label },
    });
  };

  const handleBarLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, content: { date: '', count: 0, label: '' } });
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="display-heading mb-2 text-3xl">Uptime</h2>
        <p className="text-sm text-muted-foreground">
          Service status, uptime, and incident reports.
        </p>
      </div>

      {/* Status Banner */}
      <div className="mb-4 border border-dashed border-border bg-[var(--hover)] px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse bg-primary" />
          <p className="text-sm font-medium text-primary">
            All systems operational and fully caffeinated
          </p>
        </div>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="overflow-x-auto">
          {/* Commits */}
          <div className="flex flex-col gap-2 py-4 border-b border-border/50 min-w-max">
            <div className="flex items-center gap-4">
              <p className="text-sm font-semibold min-w-[140px]">Code Commits</p>
              <p className="text-sm font-mono font-semibold">{commitUptime}% uptime</p>
            </div>
            <div className="flex gap-1 pb-2 relative">
              {[...data.commitsByDay].reverse().map((day, i) => (
                <div
                  key={i}
                  className={`h-10 w-3 flex-shrink-0 ${getCommitColor(day.count)} cursor-pointer transition-all`}
                  onMouseEnter={(e) => handleBarHover(e, day, 'commit')}
                  onMouseLeave={handleBarLeave}
                />
              ))}
            </div>
          </div>

          {/* Pull Requests */}
          <div className="flex flex-col gap-2 py-4 border-b border-border/50 min-w-max">
            <div className="flex items-center gap-4">
              <p className="text-sm font-semibold min-w-[140px]">Pull Requests</p>
              <p className="text-sm font-mono font-semibold">{prUptime}% uptime</p>
            </div>
            <div className="flex gap-1 pb-2 relative">
              {[...data.prsByDay].reverse().map((day, i) => (
                <div
                  key={i}
                  className={`h-10 w-3 flex-shrink-0 ${getPRColor(day.count)} cursor-pointer transition-all`}
                  onMouseEnter={(e) => handleBarHover(e, day, 'PR')}
                  onMouseLeave={handleBarLeave}
                />
              ))}
            </div>
          </div>

          {/* Issues */}
          <div className="flex flex-col gap-2 py-4 border-b border-border/50 min-w-max">
            <div className="flex items-center gap-4">
              <p className="text-sm font-semibold min-w-[140px]">Issues Created</p>
              <p className="text-sm font-mono font-semibold">{issueUptime}% uptime</p>
            </div>
            <div className="flex gap-1 pb-2 relative">
              {[...data.issuesByDay].reverse().map((day, i) => (
                <div
                  key={i}
                  className={`h-10 w-3 flex-shrink-0 ${getIssueColor(day.count)} cursor-pointer transition-all`}
                  onMouseEnter={(e) => handleBarHover(e, day, 'issue')}
                  onMouseLeave={handleBarLeave}
                />
              ))}
            </div>
          </div>

          {/* Reviews */}
          <div className="flex flex-col gap-2 py-4 min-w-max">
            <div className="flex items-center gap-4">
              <p className="text-sm font-semibold min-w-[140px]">PR Reviews</p>
              <p className="text-sm font-mono font-semibold">{reviewUptime}% uptime</p>
            </div>
            <div className="flex gap-1 pb-2 relative">
              {[...data.reviewsByDay].reverse().map((day, i) => (
                <div
                  key={i}
                  className={`h-10 w-3 flex-shrink-0 ${getReviewColor(day.count)} cursor-pointer transition-all`}
                  onMouseEnter={(e) => handleBarHover(e, day, 'review')}
                  onMouseLeave={handleBarLeave}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Incident Reports */}
        <div className="mt-6 border-t border-dashed border-[var(--hair)] pt-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Incident Reports</h3>
            <p className="text-xs text-muted-foreground">
              Historical incidents and service disruptions
            </p>
          </div>
          <div className="space-y-3">
            {INCIDENTS.map((incident, index) => (
              <div
                key={index}
                className="flex items-start gap-3 border border-dashed border-border bg-[var(--hover)] p-3"
              >
                <div className="flex-shrink-0">
                  <div className={`mt-1.5 h-2 w-2 ${getSeverityColor(incident.severity)}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold">{incident.title}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateRange(incident.startDate, incident.endDate)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{incident.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 border-t border-dashed border-[var(--hair)] pt-4">
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <p className="font-medium mb-2">Commits:</p>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-muted" />
                  <span>0</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-primary/50" />
                  <span>1-4</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-primary/80" />
                  <span>5-9</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-primary" />
                  <span>10+</span>
                </div>
              </div>
            </div>
            <div>
              <p className="font-medium mb-2">Pull Requests:</p>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-muted" />
                  <span>0</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-secondary/60" />
                  <span>1</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-secondary/80" />
                  <span>2</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-secondary" />
                  <span>3+</span>
                </div>
              </div>
            </div>
            <div>
              <p className="font-medium mb-2">Issues Created:</p>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-muted" />
                  <span>0</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-accent/60" />
                  <span>1</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-accent/80" />
                  <span>2</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-accent" />
                  <span>3+</span>
                </div>
              </div>
            </div>
            <div>
              <p className="font-medium mb-2">PR Reviews:</p>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-muted" />
                  <span>0</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-primary/40" />
                  <span>1-2</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-primary/70" />
                  <span>3-4</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-primary" />
                  <span>5+</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Fixed Tooltip - rendered outside Card to avoid overflow clipping */}
      {tooltip.visible && (
        <div
          className="fixed z-[9999] whitespace-nowrap border border-dashed border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-none pointer-events-none"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-semibold">{formatDate(tooltip.content.date)}</div>
          <div className="text-muted-foreground">
            {tooltip.content.count}{' '}
            {tooltip.content.count === 1
              ? tooltip.content.label === 'PR'
                ? 'PR'
                : tooltip.content.label === 'commit'
                  ? 'commit'
                  : tooltip.content.label === 'issue'
                    ? 'issue'
                    : 'review'
              : tooltip.content.label === 'PR'
                ? 'PRs'
                : tooltip.content.label === 'commit'
                  ? 'commits'
                  : tooltip.content.label === 'issue'
                    ? 'issues'
                    : 'reviews'}
          </div>
        </div>
      )}
    </div>
  );
}
