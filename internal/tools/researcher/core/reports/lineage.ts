import type { ParsedAnalysisDocument } from "../../contracts/analysis";
import type { ParsedInsightDocument } from "../../contracts/insights";
import type { SourceRecord } from "../../contracts/sources";

export interface ArtifactRecord<TDocument> {
  path: string;
  document: TDocument;
}

export interface BuildReportLineageInput {
  analysisRecords: Array<ArtifactRecord<ParsedAnalysisDocument>>;
  directInsightRecords: Array<ArtifactRecord<ParsedInsightDocument>>;
  allInsightRecords: Array<ArtifactRecord<ParsedInsightDocument>>;
  sourceRecords: SourceRecord[];
}

export interface ReportLineage {
  effectiveInsightIds: string[];
  analysisInputs: string[];
  insightReferences: string[];
  sourceReferences: string[];
}

export function buildReportLineage(input: BuildReportLineageInput): ReportLineage {
  const insightRecordsById = new Map(
    input.allInsightRecords.map((insightRecord) => [insightRecord.document.frontmatter.id, insightRecord]),
  );
  const sourceRecordsById = new Map(
    input.sourceRecords.map((sourceRecord) => [sourceRecord.id, sourceRecord]),
  );
  const effectiveInsightRecords = resolveEffectiveInsightRecords(
    input.analysisRecords,
    input.directInsightRecords,
    insightRecordsById,
  );
  const effectiveInsightIds = effectiveInsightRecords.map(
    (insightRecord) => insightRecord.document.frontmatter.id,
  );
  const sourceReferences = renderSourceReferences(effectiveInsightRecords, sourceRecordsById);

  return {
    effectiveInsightIds,
    analysisInputs: renderAnalysisInputs(input.analysisRecords),
    insightReferences: renderInsightReferences(effectiveInsightRecords),
    sourceReferences,
  };
}

function resolveEffectiveInsightRecords(
  analysisRecords: Array<ArtifactRecord<ParsedAnalysisDocument>>,
  directInsightRecords: Array<ArtifactRecord<ParsedInsightDocument>>,
  insightRecordsById: Map<string, ArtifactRecord<ParsedInsightDocument>>,
): Array<ArtifactRecord<ParsedInsightDocument>> {
  const effectiveInsightIds = new Set<string>();

  for (const analysisRecord of analysisRecords) {
    for (const insightId of analysisRecord.document.frontmatter.derived_from_insights) {
      effectiveInsightIds.add(insightId);
    }
  }

  for (const directInsightRecord of directInsightRecords) {
    effectiveInsightIds.add(directInsightRecord.document.frontmatter.id);
  }

  return Array.from(effectiveInsightIds)
    .sort((left, right) => left.localeCompare(right))
    .map((insightId) => {
      const insightRecord = insightRecordsById.get(insightId);

      if (!insightRecord) {
        throw new Error(`Referenced insight not found: ${insightId}`);
      }

      return insightRecord;
    });
}

function renderAnalysisInputs(
  analysisRecords: Array<ArtifactRecord<ParsedAnalysisDocument>>,
): string[] {
  if (analysisRecords.length === 0) {
    return ["None included."];
  }

  return analysisRecords
    .slice()
    .sort((left, right) =>
      left.document.frontmatter.id.localeCompare(right.document.frontmatter.id),
    )
    .map(
      (analysisRecord) =>
        `\`${analysisRecord.document.frontmatter.id}\` ${analysisRecord.document.frontmatter.title}`,
    );
}

function renderInsightReferences(
  insightRecords: Array<ArtifactRecord<ParsedInsightDocument>>,
): string[] {
  if (insightRecords.length === 0) {
    return ["None included."];
  }

  return insightRecords.map((insightRecord) => {
    const sourceIds = insightRecord.document.frontmatter.derived_from_sources
      .map((sourceId) => `\`${sourceId}\``)
      .join(", ");

    return `\`${insightRecord.document.frontmatter.id}\` ${insightRecord.document.frontmatter.title} (sources: ${sourceIds})`;
  });
}

function renderSourceReferences(
  insightRecords: Array<ArtifactRecord<ParsedInsightDocument>>,
  sourceRecordsById: Map<string, SourceRecord>,
): string[] {
  const sourceIds = Array.from(
    new Set(
      insightRecords.flatMap((insightRecord) => insightRecord.document.frontmatter.derived_from_sources),
    ),
  ).sort((left, right) => left.localeCompare(right));

  if (sourceIds.length === 0) {
    return ["None included."];
  }

  return sourceIds.map((sourceId) => {
    const sourceRecord = sourceRecordsById.get(sourceId);

    if (!sourceRecord) {
      throw new Error(`Referenced source not found: ${sourceId}`);
    }

    return `\`${sourceRecord.id}\` ${sourceRecord.title} - ${sourceRecord.canonical_url}`;
  });
}
