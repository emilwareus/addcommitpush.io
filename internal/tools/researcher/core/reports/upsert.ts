import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";

import type { ParsedAnalysisDocument } from "../../contracts/analysis";
import type { ParsedInsightDocument } from "../../contracts/insights";
import { formatArtifactId, type ResearchManifest } from "../../contracts/manifest";
import type { ParsedReportDocument, ReportStatus } from "../../contracts/reports";
import type { SourceRecord } from "../../contracts/sources";
import { resolveWorkspacePath } from "../../fs/workspace-paths";
import {
  parseAnalysisArtifact,
  parseInsightArtifact,
  parseReportArtifact,
  renderReportArtifact,
} from "../artifacts/markdown";
import { loadSourceStore, persistSourceStore } from "../sources/store";

import { reconcileReportBacklinks } from "./backlinks";
import { type ArtifactRecord, buildReportLineage } from "./lineage";

export interface UpsertReportInput {
  projectRoot: string;
  slug: string;
  title: string;
  reportId?: string;
  audience: string;
  angle: string;
  thesis: string;
  status?: ReportStatus;
  analysisIds: string[];
  insightIds: string[];
  freshAsOf?: string;
  summary: string;
  keyPoints: string[];
  body: string;
  limitations: string[];
  now?: Date;
}

export interface UpsertReportResult {
  operation: "created" | "updated";
  reportId: string;
  path: string;
  analysisIds: string[];
  insightIds: string[];
}

interface ExistingReportRecord {
  document: ParsedReportDocument;
  path: string;
}

interface NormalizedUpsertReportInput {
  projectRoot: string;
  slug: string;
  title: string;
  reportId: string | null;
  audience: string;
  angle: string;
  thesis: string;
  status: ReportStatus;
  analysisIds: string[];
  insightIds: string[];
  freshAsOf: string;
  summary: string;
  keyPoints: string[];
  body: string;
  limitations: string[];
  operationTimestamp: string;
}

export async function upsertReport(input: UpsertReportInput): Promise<UpsertReportResult> {
  const normalizedInput = normalizeUpsertReportInput(input);
  const store = await loadSourceStore({
    projectRoot: normalizedInput.projectRoot,
    slug: normalizedInput.slug,
  });
  const reportsDirectoryPath = await resolveWorkspacePath(
    normalizedInput.projectRoot,
    normalizedInput.slug,
    "reports",
  );
  const existingReports = await loadExistingReports(reportsDirectoryPath);
  const existingReport = normalizedInput.reportId
    ? existingReports.find(
        (report) => report.document.frontmatter.id === normalizedInput.reportId,
      ) ?? null
    : null;

  if (normalizedInput.reportId && !existingReport) {
    throw new Error(`Report not found: ${normalizedInput.reportId}`);
  }

  const [analysisRecords, insightRecords] = await Promise.all([
    loadAnalysisRecords(normalizedInput.projectRoot, normalizedInput.slug),
    loadInsightRecords(normalizedInput.projectRoot, normalizedInput.slug),
  ]);
  const analysisRecordsById = createArtifactRecordMap(analysisRecords);
  const insightRecordsById = createArtifactRecordMap(insightRecords);

  const resolvedAnalyses = normalizedInput.analysisIds.map((analysisId) => {
    const analysisRecord = analysisRecordsById.get(analysisId);

    if (!analysisRecord) {
      throw new Error(`Referenced analysis not found: ${analysisId}`);
    }

    return analysisRecord;
  });
  const resolvedInsights = normalizedInput.insightIds.map((insightId) => {
    const insightRecord = insightRecordsById.get(insightId);

    if (!insightRecord) {
      throw new Error(`Referenced insight not found: ${insightId}`);
    }

    return insightRecord;
  });

  const operation = existingReport ? "updated" : "created";
  const reportId = existingReport
    ? existingReport.document.frontmatter.id
    : formatArtifactId("report", store.manifest.next_ids.report);
  const previousLineage = existingReport
    ? buildReportLineage({
        analysisRecords: existingReport.document.frontmatter.derived_from_analysis.map(
          (analysisId) => {
            const analysisRecord = analysisRecordsById.get(analysisId);

            if (!analysisRecord) {
              throw new Error(`Referenced analysis not found: ${analysisId}`);
            }

            return analysisRecord;
          },
        ),
        directInsightRecords: existingReport.document.frontmatter.derived_from_insights.map(
          (insightId) => {
            const insightRecord = insightRecordsById.get(insightId);

            if (!insightRecord) {
              throw new Error(`Referenced insight not found: ${insightId}`);
            }

            return insightRecord;
          },
        ),
        allInsightRecords: insightRecords,
        sourceRecords: store.sources.sources,
      })
    : null;
  const nextDocument = buildReportDocument(
    normalizedInput,
    existingReport?.document,
    reportId,
    resolvedAnalyses,
    resolvedInsights,
    insightRecords,
    store.sources.sources,
  );
  const nextLineage = buildReportLineage({
    analysisRecords: resolvedAnalyses,
    directInsightRecords: resolvedInsights,
    allInsightRecords: insightRecords,
    sourceRecords: store.sources.sources,
  });
  const targetFileName = `${reportId}-${slugifyFileSegment(normalizedInput.title)}.md`;
  const targetPath = await resolveWorkspacePath(
    normalizedInput.projectRoot,
    normalizedInput.slug,
    `reports/${targetFileName}`,
  );

  await mkdir(dirname(targetPath), { recursive: true });
  await writeTextAtomically(targetPath, renderReportArtifact(nextDocument));

  if (existingReport && existingReport.path !== targetPath) {
    await rm(existingReport.path, { force: true });
  }

  await reconcileReportBacklinks({
    projectRoot: normalizedInput.projectRoot,
    slug: normalizedInput.slug,
    reportId,
    previousAnalysisIds: existingReport?.document.frontmatter.derived_from_analysis ?? [],
    nextAnalysisIds: nextDocument.frontmatter.derived_from_analysis,
    previousInsightIds: previousLineage?.effectiveInsightIds ?? [],
    nextInsightIds: nextLineage.effectiveInsightIds,
  });

  store.manifest.inventory.reports = await countReportArtifacts(reportsDirectoryPath);

  if (operation === "created") {
    store.manifest.next_ids.report += 1;
  }

  await persistSourceStore(store);

  return {
    operation,
    reportId,
    path: relativeWorkspacePath(store.manifest, basename(targetPath), "reports"),
    analysisIds: [...nextDocument.frontmatter.derived_from_analysis],
    insightIds: [...nextDocument.frontmatter.derived_from_insights],
  };
}

function normalizeUpsertReportInput(input: UpsertReportInput): NormalizedUpsertReportInput {
  const projectRoot = input.projectRoot.trim();
  const slug = input.slug.trim();
  const title = input.title.trim();
  const audience = input.audience.trim();
  const angle = input.angle.trim();
  const thesis = input.thesis.trim();
  const summary = input.summary.trim();
  const body = input.body.trim();
  const operationTimestamp = (input.now ?? new Date()).toISOString();

  if (projectRoot.length === 0) {
    throw new Error("projectRoot is required");
  }

  if (slug.length === 0) {
    throw new Error("slug is required");
  }

  if (title.length === 0) {
    throw new Error("title is required");
  }

  if (audience.length === 0) {
    throw new Error("audience is required");
  }

  if (angle.length === 0) {
    throw new Error("angle is required");
  }

  if (thesis.length === 0) {
    throw new Error("thesis is required");
  }

  if (summary.length === 0) {
    throw new Error("summary is required");
  }

  if (body.length === 0) {
    throw new Error("body is required");
  }

  const analysisIds = normalizeStringList(input.analysisIds);
  const insightIds = normalizeStringList(input.insightIds);

  if (analysisIds.length === 0 && insightIds.length === 0) {
    throw new Error("Report must reference at least one analysis or one insight");
  }

  return {
    projectRoot,
    slug,
    title,
    reportId: normalizeOptionalText(input.reportId),
    audience,
    angle,
    thesis,
    status: input.status ?? "draft",
    analysisIds,
    insightIds,
    freshAsOf: normalizeFreshAsOf(input.freshAsOf, input.now),
    summary,
    keyPoints: normalizeListSection(input.keyPoints, "keyPoints"),
    body,
    limitations: normalizeListSection(input.limitations, "limitations"),
    operationTimestamp,
  };
}

async function loadExistingReports(directoryPath: string): Promise<ExistingReportRecord[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const reportFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    reportFiles.map(async (fileName) => {
      const path = `${directoryPath}/${fileName}`;

      return {
        path,
        document: parseReportArtifact(await readFile(path, "utf8")),
      };
    }),
  );
}

async function loadAnalysisRecords(
  projectRoot: string,
  slug: string,
): Promise<Array<ArtifactRecord<ParsedAnalysisDocument>>> {
  const analysisDirectoryPath = await resolveWorkspacePath(projectRoot, slug, "analysis");
  return loadArtifactRecords(analysisDirectoryPath, parseAnalysisArtifact);
}

async function loadInsightRecords(
  projectRoot: string,
  slug: string,
): Promise<Array<ArtifactRecord<ParsedInsightDocument>>> {
  const insightsDirectoryPath = await resolveWorkspacePath(projectRoot, slug, "insights");
  return loadArtifactRecords(insightsDirectoryPath, parseInsightArtifact);
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

function createArtifactRecordMap<TDocument extends { frontmatter: { id: string } }>(
  artifactRecords: Array<ArtifactRecord<TDocument>>,
): Map<string, ArtifactRecord<TDocument>> {
  return new Map(
    artifactRecords.map((artifactRecord) => [artifactRecord.document.frontmatter.id, artifactRecord]),
  );
}

function buildReportDocument(
  input: NormalizedUpsertReportInput,
  existingReport: ParsedReportDocument | undefined,
  reportId: string,
  analysisRecords: Array<ArtifactRecord<ParsedAnalysisDocument>>,
  insightRecords: Array<ArtifactRecord<ParsedInsightDocument>>,
  allInsightRecords: Array<ArtifactRecord<ParsedInsightDocument>>,
  sourceRecords: SourceRecord[],
): ParsedReportDocument {
  const lineage = buildReportLineage({
    analysisRecords,
    directInsightRecords: insightRecords,
    allInsightRecords,
    sourceRecords,
  });

  return {
    frontmatter: {
      id: reportId,
      title: input.title,
      audience: input.audience,
      angle: input.angle,
      thesis: input.thesis,
      status: input.status,
      side_states: existingReport?.frontmatter.side_states ?? [],
      derived_from_analysis: input.analysisIds,
      derived_from_insights: input.insightIds,
      fresh_as_of: input.freshAsOf,
      created_at: existingReport?.frontmatter.created_at ?? input.operationTimestamp,
      updated_at: input.operationTimestamp,
    },
    sections: {
      summary: input.summary,
      keyPoints: input.keyPoints,
      body: input.body,
      limitations: input.limitations,
      analysisInputs: lineage.analysisInputs,
      insightReferences: lineage.insightReferences,
      sourceReferences: lineage.sourceReferences,
    },
  };
}

async function countReportArtifacts(directoryPath: string): Promise<number> {
  const entries = await readdir(directoryPath, { withFileTypes: true });

  return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md")).length;
}

function relativeWorkspacePath(
  manifest: ResearchManifest,
  fileName: string,
  directoryName: "reports",
): string {
  return `${manifest.paths[directoryName].replace(`${manifest.paths.root}/`, "")}/${fileName}`;
}

function slugifyFileSegment(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug.length > 0 ? slug : "artifact";
}

function normalizeStringList(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function normalizeOptionalText(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length === 0 ? null : normalizedValue;
}

function normalizeFreshAsOf(value: string | undefined, now: Date | undefined): string {
  if (value) {
    const normalizedValue = value.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
      throw new Error("freshAsOf must use YYYY-MM-DD");
    }

    return normalizedValue;
  }

  return (now ?? new Date()).toISOString().slice(0, 10);
}

function normalizeListSection(values: string[], label: string): string[] {
  const normalizedValues = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (normalizedValues.length === 0) {
    throw new Error(`${label} is required`);
  }

  return normalizedValues;
}

async function writeTextAtomically(targetPath: string, value: string): Promise<void> {
  const temporaryPath = `${targetPath}.${randomUUID()}.tmp`;

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
