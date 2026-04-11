export interface InsightFingerprintInput {
  title: string;
  claim: string;
  derivedFromSources: string[];
}

export function createInsightFingerprint(input: InsightFingerprintInput): string {
  return [
    normalizeComparableText(input.title),
    normalizeComparableText(input.claim),
    normalizeSourceIds(input.derivedFromSources).join("|"),
  ].join("::");
}

export function normalizeComparableText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeSourceIds(sourceIds: string[]): string[] {
  return Array.from(
    new Set(
      sourceIds
        .map((sourceId) => sourceId.trim())
        .filter((sourceId) => sourceId.length > 0),
    ),
  ).sort((left, right) => left.localeCompare(right));
}
