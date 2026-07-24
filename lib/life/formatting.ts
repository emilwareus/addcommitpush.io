import type { Memory } from './contracts';

export function enumLabel(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatInOwnerTimezone(
  value: string,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(new Date(value));
}

export function formatMemoryTime(memory: Memory, timezone: string): string {
  if (!memory.occurred_start || memory.temporal_precision === 'unknown') return 'Undated';
  const date = new Date(memory.occurred_start);
  if (memory.temporal_precision === 'year') {
    return new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric' }).format(date);
  }
  if (memory.temporal_precision === 'month') {
    return new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
    }).format(date);
  }
  if (memory.temporal_precision === 'day') {
    return new Intl.DateTimeFormat('en', { timeZone: timezone, dateStyle: 'medium' }).format(date);
  }
  return formatInOwnerTimezone(memory.occurred_start, timezone);
}

export function timelineGroupLabel(memory: Memory, timezone: string): string {
  if (!memory.occurred_start || memory.temporal_precision === 'unknown') return 'Undated';
  const date = new Date(memory.occurred_start);
  if (memory.temporal_precision === 'year') return formatMemoryTime(memory, timezone);
  if (memory.temporal_precision === 'month') return formatMemoryTime(memory, timezone);
  return new Intl.DateTimeFormat('en', { timeZone: timezone, dateStyle: 'long' }).format(date);
}

export function formatRelativeTimestamp(value: string, timezone: string): string {
  return formatInOwnerTimezone(value, timezone);
}

export function ownerLocalDateTimeToIso(value: string, timezone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value);
  if (!match) throw new Error('Owner dates must use YYYY-MM-DD or YYYY-MM-DDTHH:mm.');
  const [, yearValue, monthValue, dayValue, hourValue = '00', minuteValue = '00'] = match;
  const target = Date.UTC(
    Number(yearValue),
    Number(monthValue) - 1,
    Number(dayValue),
    Number(hourValue),
    Number(minuteValue)
  );
  let candidate = target;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(candidate))
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)])
    );
    const represented = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    candidate = target - (represented - candidate);
  }

  const representedParts = Object.fromEntries(
    formatter
      .formatToParts(new Date(candidate))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  );
  if (
    representedParts.year !== Number(yearValue) ||
    representedParts.month !== Number(monthValue) ||
    representedParts.day !== Number(dayValue) ||
    representedParts.hour !== Number(hourValue) ||
    representedParts.minute !== Number(minuteValue)
  ) {
    throw new Error('The owner-local date and time does not exist in the selected timezone.');
  }

  return new Date(candidate).toISOString();
}

export function ownerDateToIso(dateValue: string, timezone: string): string {
  return ownerLocalDateTimeToIso(dateValue, timezone);
}

export function isoToOwnerDateTime(value: string, timezone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(value))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
