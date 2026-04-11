import { readFile, readdir, rename, rm, writeFile } from "node:fs/promises";

import { resolveWorkspacePath } from "../../fs/workspace-paths";
import { parseAnalysisArtifact, parseInsightArtifact } from "../artifacts/markdown";
import { renderAnalysisArtifact, renderInsightArtifact } from "../artifacts/markdown";

export interface ReconcileReportBacklinksInput {
  projectRoot: string;
  slug: string;
  reportId: string;
  previousAnalysisIds: string[];
  nextAnalysisIds: string[];
  previousInsightIds: string[];
  nextInsightIds: string[];
}

export async function reconcileReportBacklinks(
  input: ReconcileReportBacklinksInput,
): Promise<void> {
  await Promise.all([
    reconcileAnalysisReportBacklinks(input),
    reconcileInsightReportBacklinks(input),
  ]);
}

interface ArtifactRecord<TDocument> {
  path: string;
  document: TDocument;
}

async function reconcileAnalysisReportBacklinks(
  input: ReconcileReportBacklinksInput,
): Promise<void> {
  const analysisDirectoryPath = await resolveWorkspacePath(
    input.projectRoot,
    input.slug,
    "analysis",
  );
  const analysisRecords = await loadArtifactRecords(
    analysisDirectoryPath,
    parseAnalysisArtifact,
  );
  const analysisRecordsById = new Map(
    analysisRecords.map((analysisRecord) => [
      analysisRecord.document.frontmatter.id,
      analysisRecord,
    ] as const),
  );
  const nextAnalysisIds = toSortedUniqueIds(input.nextAnalysisIds);
  const previousAnalysisIds = toSortedUniqueIds(input.previousAnalysisIds);

  for (const analysisId of nextAnalysisIds) {
    if (!analysisRecordsById.has(analysisId)) {
      throw new Error(`Referenced analysis not found: ${analysisId}`);
    }
  }

  for (const analysisId of new Set([...previousAnalysisIds, ...nextAnalysisIds])) {
    const analysisRecord = analysisRecordsById.get(analysisId);

    if (!analysisRecord) {
      continue;
    }

    const shouldLink = nextAnalysisIds.includes(analysisId);
    const linkedReports = shouldLink
      ? toSortedUniqueIds([
          ...analysisRecord.document.frontmatter.linked_reports,
          input.reportId,
        ])
      : analysisRecord.document.frontmatter.linked_reports.filter(
          (linkedReportId) => linkedReportId !== input.reportId,
        );

    if (
      linkedReports.join("|") ===
      analysisRecord.document.frontmatter.linked_reports.join("|")
    ) {
      continue;
    }

    await writeTextAtomically(
      analysisRecord.path,
      renderAnalysisArtifact({
        ...analysisRecord.document,
        frontmatter: {
          ...analysisRecord.document.frontmatter,
          linked_reports: linkedReports,
        },
      }),
    );
  }
}

async function reconcileInsightReportBacklinks(
  input: ReconcileReportBacklinksInput,
): Promise<void> {
  const insightsDirectoryPath = await resolveWorkspacePath(
    input.projectRoot,
    input.slug,
    "insights",
  );
  const insightRecords = await loadArtifactRecords(
    insightsDirectoryPath,
    parseInsightArtifact,
  );
  const insightRecordsById = new Map(
    insightRecords.map((insightRecord) => [
      insightRecord.document.frontmatter.id,
      insightRecord,
    ] as const),
  );
  const nextInsightIds = toSortedUniqueIds(input.nextInsightIds);
  const previousInsightIds = toSortedUniqueIds(input.previousInsightIds);

  for (const insightId of nextInsightIds) {
    if (!insightRecordsById.has(insightId)) {
      throw new Error(`Referenced insight not found: ${insightId}`);
    }
  }

  for (const insightId of new Set([...previousInsightIds, ...nextInsightIds])) {
    const insightRecord = insightRecordsById.get(insightId);

    if (!insightRecord) {
      continue;
    }

    const shouldLink = nextInsightIds.includes(insightId);
    const linkedReports = shouldLink
      ? toSortedUniqueIds([
          ...insightRecord.document.frontmatter.linked_reports,
          input.reportId,
        ])
      : insightRecord.document.frontmatter.linked_reports.filter(
          (linkedReportId) => linkedReportId !== input.reportId,
        );

    if (
      linkedReports.join("|") ===
      insightRecord.document.frontmatter.linked_reports.join("|")
    ) {
      continue;
    }

    await writeTextAtomically(
      insightRecord.path,
      renderInsightArtifact({
        ...insightRecord.document,
        frontmatter: {
          ...insightRecord.document.frontmatter,
          linked_reports: linkedReports,
        },
      }),
    );
  }
}

async function loadArtifactRecords<TDocument>(
  directoryPath: string,
  parseArtifact: (document: string) => TDocument,
): Promise<Array<ArtifactRecord<TDocument>>> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    markdownFiles.map(async (fileName) => {
      const path = `${directoryPath}/${fileName}`;

      return {
        path,
        document: parseArtifact(await readFile(path, "utf8")),
      };
    }),
  );
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

async function writeTextAtomically(targetPath: string, value: string): Promise<void> {
  const temporaryPath = `${targetPath}.tmp`;

  try {
    await writeFile(temporaryPath, ensureTrailingNewline(value), "utf8");
    await rename(temporaryPath, targetPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}
