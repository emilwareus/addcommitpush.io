import type { ParsedAnalysisDocument } from "../../contracts/analysis";
import type {
  ManifestVerificationSummary,
  ResearchManifest,
} from "../../contracts/manifest";
import type { ParsedInsightDocument } from "../../contracts/insights";
import type { ParsedReportDocument } from "../../contracts/reports";
import type { SourceRecord } from "../../contracts/sources";
import { isNoneNotedYet } from "../artifacts/markdown";

export interface StatusArtifactRecord<TDocument> {
  path: string;
  document: TDocument;
}

export interface EvaluateResearchDebtInput {
  manifest: ResearchManifest;
  sources: SourceRecord[];
  insightRecords: Array<StatusArtifactRecord<ParsedInsightDocument>>;
  analysisRecords: Array<StatusArtifactRecord<ParsedAnalysisDocument>>;
  reportRecords: Array<StatusArtifactRecord<ParsedReportDocument>>;
}

export interface EvaluatedResearchDebt {
  freshnessDebt: {
    count: number;
    staleSources: string[];
  };
  verificationDebt: {
    count: number;
    unsupportedInsights: string[];
    unsupportedReports: string[];
    contradictedAnalysis: string[];
    analysisWithOpenQuestions: string[];
    blockedReports: string[];
  };
  impacted: {
    insights: string[];
    analysis: string[];
    reports: string[];
  };
  manifestVerification: ManifestVerificationSummary;
}

export function evaluateResearchDebt(
  input: EvaluateResearchDebtInput,
): EvaluatedResearchDebt {
  const insightRecordsById = new Map(
    input.insightRecords.map((record) => [record.document.frontmatter.id, record] as const),
  );
  const analysisRecordsById = new Map(
    input.analysisRecords.map((record) => [record.document.frontmatter.id, record] as const),
  );

  const staleSources = input.sources
    .filter((source) => source.side_states.includes("stale"))
    .map((source) => source.id)
    .sort((left, right) => left.localeCompare(right));
  const staleSourceSet = new Set(staleSources);

  const freshnessImpactedInsights = sortUniqueIds(
    input.sources
      .filter((source) => staleSourceSet.has(source.id))
      .flatMap((source) => source.linked_insights),
  );
  const freshnessImpactedAnalysis = sortUniqueIds(
    freshnessImpactedInsights.flatMap((insightId) => {
      const insightRecord = insightRecordsById.get(insightId);
      return insightRecord?.document.frontmatter.linked_analysis ?? [];
    }),
  );
  const freshnessImpactedReports = sortUniqueIds(
    freshnessImpactedInsights.flatMap((insightId) => {
      const insightRecord = insightRecordsById.get(insightId);
      return insightRecord?.document.frontmatter.linked_reports ?? [];
    }),
  );

  const unsupportedInsights = sortUniqueIds(
    input.insightRecords
      .filter((insightRecord) =>
        isInsightUnsupported(insightRecord.document, input.sources),
      )
      .map((insightRecord) => insightRecord.document.frontmatter.id),
  );
  const unsupportedInsightSet = new Set(unsupportedInsights);
  const contradictedAnalysis = sortUniqueIds(
    input.analysisRecords
      .filter((analysisRecord) =>
        hasMeaningfulBulletItems(analysisRecord.document.sections.contradictions),
      )
      .map((analysisRecord) => analysisRecord.document.frontmatter.id),
  );
  const analysisWithOpenQuestions = sortUniqueIds(
    input.analysisRecords
      .filter((analysisRecord) =>
        hasMeaningfulBulletItems(analysisRecord.document.sections.openQuestions),
      )
      .map((analysisRecord) => analysisRecord.document.frontmatter.id),
  );

  const reportAssessments = input.reportRecords.map((reportRecord) =>
    assessReportDebt(
      reportRecord.document,
      insightRecordsById,
      analysisRecordsById,
      unsupportedInsightSet,
    ),
  );
  const unsupportedReports = sortUniqueIds(
    reportAssessments
      .filter((assessment) => assessment.unsupported)
      .map((assessment) => assessment.reportId),
  );
  const blockedReports = sortUniqueIds(
    reportAssessments
      .filter((assessment) => assessment.blocked)
      .map((assessment) => assessment.reportId),
  );

  const unsupportedImpactedAnalysis = sortUniqueIds(
    unsupportedInsights.flatMap((insightId) => {
      const insightRecord = insightRecordsById.get(insightId);
      return insightRecord?.document.frontmatter.linked_analysis ?? [];
    }),
  );
  const unsupportedImpactedReports = sortUniqueIds(
    unsupportedInsights.flatMap((insightId) => {
      const insightRecord = insightRecordsById.get(insightId);
      return insightRecord?.document.frontmatter.linked_reports ?? [];
    }),
  );
  const analysisImpactedReports = sortUniqueIds(
    [...contradictedAnalysis, ...analysisWithOpenQuestions].flatMap((analysisId) => {
      const analysisRecord = analysisRecordsById.get(analysisId);
      return analysisRecord?.document.frontmatter.linked_reports ?? [];
    }),
  );

  const verificationCount =
    unsupportedInsights.length +
    unsupportedReports.length +
    contradictedAnalysis.length +
    analysisWithOpenQuestions.length;

  return {
    freshnessDebt: {
      count: staleSources.length,
      staleSources,
    },
    verificationDebt: {
      count: verificationCount,
      unsupportedInsights,
      unsupportedReports,
      contradictedAnalysis,
      analysisWithOpenQuestions,
      blockedReports,
    },
    impacted: {
      insights: sortUniqueIds([...freshnessImpactedInsights, ...unsupportedInsights]),
      analysis: sortUniqueIds([
        ...freshnessImpactedAnalysis,
        ...unsupportedImpactedAnalysis,
        ...contradictedAnalysis,
        ...analysisWithOpenQuestions,
      ]),
      reports: sortUniqueIds([
        ...freshnessImpactedReports,
        ...unsupportedImpactedReports,
        ...analysisImpactedReports,
        ...unsupportedReports,
        ...blockedReports,
      ]),
    },
    manifestVerification: {
      debt: verificationCount,
      unsupported_insights: unsupportedInsights.length,
      unsupported_reports: unsupportedReports.length,
      contradicted_analysis: contradictedAnalysis.length,
      unresolved_analysis_questions: analysisWithOpenQuestions.length,
    },
  };
}

function isInsightUnsupported(
  insight: ParsedInsightDocument,
  sources: SourceRecord[],
): boolean {
  if (
    insight.frontmatter.side_states.includes("unsupported") ||
    insight.frontmatter.status === "disputed" ||
    insight.frontmatter.status === "superseded"
  ) {
    return true;
  }

  const sourcesById = new Map(sources.map((source) => [source.id, source] as const));
  let hasValidSupport = false;

  for (const sourceId of insight.frontmatter.derived_from_sources) {
    const source = sourcesById.get(sourceId);

    if (!source) {
      continue;
    }

    if (isSourceSupportValid(source)) {
      hasValidSupport = true;
      break;
    }
  }

  return !hasValidSupport;
}

function isSourceSupportValid(source: SourceRecord): boolean {
  return !source.side_states.some((sideState) =>
    sideState === "rejected" || sideState === "stale" || sideState === "superseded",
  );
}

function assessReportDebt(
  report: ParsedReportDocument,
  insightRecordsById: Map<string, StatusArtifactRecord<ParsedInsightDocument>>,
  analysisRecordsById: Map<string, StatusArtifactRecord<ParsedAnalysisDocument>>,
  unsupportedInsightIds: Set<string>,
): {
  reportId: string;
  unsupported: boolean;
  blocked: boolean;
} {
  let unsupported =
    report.frontmatter.side_states.includes("unsupported") ||
    report.frontmatter.status === "disputed" ||
    report.frontmatter.status === "superseded";
  let blocked = unsupported;

  const effectiveInsightIds = new Set<string>();

  for (const analysisId of report.frontmatter.derived_from_analysis) {
    const analysisRecord = analysisRecordsById.get(analysisId);

    if (!analysisRecord) {
      unsupported = true;
      blocked = true;
      continue;
    }

    if (
      analysisRecord.document.frontmatter.status === "disputed" ||
      analysisRecord.document.frontmatter.status === "superseded"
    ) {
      blocked = true;
    }

    if (hasMeaningfulBulletItems(analysisRecord.document.sections.contradictions)) {
      blocked = true;
    }

    if (hasMeaningfulBulletItems(analysisRecord.document.sections.openQuestions)) {
      blocked = true;
    }

    for (const insightId of analysisRecord.document.frontmatter.derived_from_insights) {
      effectiveInsightIds.add(insightId);
    }
  }

  for (const insightId of report.frontmatter.derived_from_insights) {
    effectiveInsightIds.add(insightId);
  }

  for (const insightId of effectiveInsightIds) {
    if (unsupportedInsightIds.has(insightId)) {
      unsupported = true;
      blocked = true;
    }

    const insightRecord = insightRecordsById.get(insightId);

    if (!insightRecord) {
      unsupported = true;
      blocked = true;
      continue;
    }

    if (
      insightRecord.document.frontmatter.side_states.includes("stale") ||
      insightRecord.document.frontmatter.side_states.includes("unsupported") ||
      insightRecord.document.frontmatter.status === "disputed" ||
      insightRecord.document.frontmatter.status === "superseded"
    ) {
      unsupported = true;
      blocked = true;
    }
  }

  return {
    reportId: report.frontmatter.id,
    unsupported,
    blocked,
  };
}

function hasMeaningfulBulletItems(items: string[]): boolean {
  return items.some((item) => !isNoneNotedYet(item));
}

function sortUniqueIds(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  ).sort((left, right) => left.localeCompare(right));
}
