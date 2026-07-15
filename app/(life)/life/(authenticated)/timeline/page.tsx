import { LifePageHeader } from '@/components/life/page-header';
import { TimelineRail } from '@/components/life/timeline-rail';
import { MEMORY_KINDS } from '@/lib/life/constants';
import type { Memory } from '@/lib/life/contracts';
import { enumLabel, ownerDateToIso } from '@/lib/life/formatting';
import { getOwner, getTimeline } from '@/lib/life/queries.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function first(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function ownerDateParts(timezone: string): { year: number; month: number; day: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })
      .formatToParts(new Date())
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  );
  return { year: parts.year, month: parts.month, day: parts.day };
}

function dateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function nextDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return dateString(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

function rangeStart(range: string, timezone: string): string | undefined {
  const current = ownerDateParts(timezone);
  if (range === 'year') return dateString(current.year, 1, 1);
  if (range === 'quarter')
    return dateString(current.year, Math.floor((current.month - 1) / 3) * 3 + 1, 1);
  if (range === 'month') return dateString(current.year, current.month, 1);
  return undefined;
}

function rangeEnd(range: string, timezone: string): string | undefined {
  const current = ownerDateParts(timezone);
  if (range === 'year') return dateString(current.year + 1, 1, 1);
  if (range === 'quarter') {
    const nextQuarterMonth = Math.floor((current.month - 1) / 3) * 3 + 4;
    return nextQuarterMonth > 12
      ? dateString(current.year + 1, nextQuarterMonth - 12, 1)
      : dateString(current.year, nextQuarterMonth, 1);
  }
  if (range === 'month') {
    return current.month === 12
      ? dateString(current.year + 1, 1, 1)
      : dateString(current.year, current.month + 1, 1);
  }
  return undefined;
}

function isMemoryKind(value: string | undefined): value is Memory['kind'] {
  return value !== undefined && MEMORY_KINDS.some((kind) => kind === value);
}

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parameters = await searchParams;
  const owner = await getOwner();
  const range = ['all', 'year', 'quarter', 'month', 'custom'].includes(
    first(parameters.range) ?? ''
  )
    ? (first(parameters.range) ?? 'all')
    : 'all';
  const customStart = first(parameters.start);
  const customEnd = first(parameters.end);
  const startDate = range === 'custom' ? customStart : rangeStart(range, owner.timezone);
  const endDate =
    range === 'custom' ? customEnd && nextDate(customEnd) : rangeEnd(range, owner.timezone);
  const domain = first(parameters.domain)?.trim() || undefined;
  const rawKind = first(parameters.kind);
  const kind = isMemoryKind(rawKind) ? rawKind : undefined;
  const timeline = await getTimeline({
    start: startDate ? ownerDateToIso(startDate, owner.timezone) : undefined,
    end: endDate ? ownerDateToIso(endDate, owner.timezone) : undefined,
    domain,
    limit: 500,
  });
  const presented = kind ? timeline.filter((memory) => memory.kind === kind) : timeline;

  return (
    <div className="mx-auto max-w-6xl">
      <LifePageHeader
        kicker="Valid time"
        title="Timeline"
        description={`Precision-aware memory chronology in ${owner.timezone}. Bounds filter occurred_start only; they do not test interval overlap.`}
      />
      <form
        method="get"
        className="mb-8 grid gap-4 border border-dashed border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-6"
      >
        <label>
          <span className="section-kicker mb-2 block">Range</span>
          <select
            name="range"
            defaultValue={range}
            className="h-10 w-full border border-dashed border-border bg-input px-3 text-sm"
          >
            <option value="all">All</option>
            <option value="year">This year</option>
            <option value="quarter">This quarter</option>
            <option value="month">This month</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label>
          <span className="section-kicker mb-2 block">Start</span>
          <input
            type="date"
            name="start"
            defaultValue={customStart}
            className="h-10 w-full border border-dashed border-border bg-input px-3 text-sm"
          />
        </label>
        <label>
          <span className="section-kicker mb-2 block">End</span>
          <input
            type="date"
            name="end"
            defaultValue={customEnd}
            className="h-10 w-full border border-dashed border-border bg-input px-3 text-sm"
          />
        </label>
        <label>
          <span className="section-kicker mb-2 block">Domain</span>
          <input
            name="domain"
            defaultValue={domain}
            placeholder="All"
            className="h-10 w-full border border-dashed border-border bg-input px-3 text-sm"
          />
        </label>
        <label>
          <span className="section-kicker mb-2 block">Kind (this result)</span>
          <select
            name="kind"
            defaultValue={kind ?? ''}
            className="h-10 w-full border border-dashed border-border bg-input px-3 text-sm"
          >
            <option value="">All</option>
            {MEMORY_KINDS.map((value) => (
              <option key={value} value={value}>
                {enumLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <button className="mt-auto h-10 border border-dashed border-primary bg-primary px-4 text-sm text-primary-foreground">
          Update
        </button>
        <p className="text-xs leading-5 text-muted-foreground sm:col-span-2 lg:col-span-6">
          Kind is a presentation filter over these results. Domain and time bounds run on the
          server. Undated records appear only without a lower time bound.
        </p>
      </form>
      <TimelineRail memories={presented} timezone={owner.timezone} />
    </div>
  );
}
