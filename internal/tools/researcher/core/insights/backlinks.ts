import type { SourceRecord, SourcesEnvelope } from "../../contracts/sources";

export interface ReconcileSourceInsightBacklinksInput {
  sources: SourcesEnvelope;
  insightId: string;
  previousSourceIds: string[];
  nextSourceIds: string[];
}

export function reconcileSourceInsightBacklinks(
  input: ReconcileSourceInsightBacklinksInput,
): void {
  const nextSourceIds = toSortedUniqueIds(input.nextSourceIds);
  const previousSourceIds = toSortedUniqueIds(input.previousSourceIds);
  const sourceRecordsById = new Map(
    input.sources.sources.map((sourceRecord) => [sourceRecord.id, sourceRecord] as const),
  );

  for (const sourceId of nextSourceIds) {
    if (!sourceRecordsById.has(sourceId)) {
      throw new Error(`Supporting source not found: ${sourceId}`);
    }
  }

  const removedSourceIds = previousSourceIds.filter((sourceId) => !nextSourceIds.includes(sourceId));
  const addedSourceIds = nextSourceIds.filter((sourceId) => !previousSourceIds.includes(sourceId));

  for (const sourceId of removedSourceIds) {
    const sourceRecord = sourceRecordsById.get(sourceId);

    if (!sourceRecord) {
      continue;
    }

    sourceRecord.linked_insights = sourceRecord.linked_insights
      .filter((linkedInsightId) => linkedInsightId !== input.insightId)
      .sort((left, right) => left.localeCompare(right));
  }

  for (const sourceId of addedSourceIds) {
    const sourceRecord = sourceRecordsById.get(sourceId);

    if (!sourceRecord) {
      throw new Error(`Supporting source not found: ${sourceId}`);
    }

    sourceRecord.linked_insights = appendSortedUniqueId(sourceRecord, input.insightId);
  }

  for (const sourceId of nextSourceIds) {
    const sourceRecord = sourceRecordsById.get(sourceId);

    if (!sourceRecord) {
      throw new Error(`Supporting source not found: ${sourceId}`);
    }

    sourceRecord.linked_insights = appendSortedUniqueId(sourceRecord, input.insightId);
  }
}

function appendSortedUniqueId(sourceRecord: SourceRecord, insightId: string): string[] {
  return toSortedUniqueIds([...sourceRecord.linked_insights, insightId]);
}

function toSortedUniqueIds(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  ).sort((left, right) => left.localeCompare(right));
}
