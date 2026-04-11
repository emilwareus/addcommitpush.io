import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";

import { formatArtifactId, type ResearchManifest } from "../../contracts/manifest";
import type {
  AnalysisConfidence,
  AnalysisStatus,
  ParsedAnalysisDocument,
} from "../../contracts/analysis";
import { resolveWorkspacePath } from "../../fs/workspace-paths";
import {
  parseAnalysisArtifact,
  parseInsightArtifact,
  renderAnalysisArtifact,
} from "../artifacts/markdown";
import { reconcileInsightAnalysisBacklinks } from "./backlinks";
import { loadSourceStore, persistSourceStore } from "../sources/store";

export interface UpsertAnalysisInput {
  projectRoot: string;
  slug: string;
  title: string;
  analysisId?: string;
  status?: AnalysisStatus;
  confidence?: AnalysisConfidence;
  insightIds: string[];
  tags?: string[];
  transitionalScaffold?: boolean;
  question: string;
  synthesis: string;
  contradictions: string[];
  caveats: string[];
  openQuestions: string[];
  nextMoves: string[];
  now?: Date;
}

export interface UpsertAnalysisResult {
  operation: "created" | "updated";
  analysisId: string;
  path: string;
  insightIds: string[];
}

interface ExistingAnalysisRecord {
  document: ParsedAnalysisDocument;
  path: string;
}

interface NormalizedUpsertAnalysisInput {
  projectRoot: string;
  slug: string;
  title: string;
  analysisId: string | null;
  status: AnalysisStatus;
  confidence: AnalysisConfidence;
  insightIds: string[];
  tags: string[];
  transitionalScaffold: boolean;
  question: string;
  synthesis: string;
  contradictions: string[];
  caveats: string[];
  openQuestions: string[];
  nextMoves: string[];
  operationTimestamp: string;
}

export async function upsertAnalysis(
  input: UpsertAnalysisInput,
): Promise<UpsertAnalysisResult> {
  const normalizedInput = normalizeUpsertAnalysisInput(input);
  const store = await loadSourceStore({
    projectRoot: normalizedInput.projectRoot,
    slug: normalizedInput.slug,
  });
  const analysisDirectoryPath = await resolveWorkspacePath(
    normalizedInput.projectRoot,
    normalizedInput.slug,
    "analysis",
  );
  const existingAnalyses = await loadExistingAnalyses(analysisDirectoryPath);
  const existingAnalysis = normalizedInput.analysisId
    ? existingAnalyses.find(
        (analysis) => analysis.document.frontmatter.id === normalizedInput.analysisId,
      ) ?? null
    : null;

  if (normalizedInput.analysisId && !existingAnalysis) {
    throw new Error(`Analysis not found: ${normalizedInput.analysisId}`);
  }

  await assertReferencedInsightsExist(normalizedInput.projectRoot, normalizedInput.slug, normalizedInput.insightIds);

  const operation = existingAnalysis ? "updated" : "created";
  const analysisId = existingAnalysis
    ? existingAnalysis.document.frontmatter.id
    : formatArtifactId("analysis", store.manifest.next_ids.analysis);
  const nextDocument = buildAnalysisDocument(
    normalizedInput,
    existingAnalysis?.document,
    analysisId,
  );
  const targetFileName = `${analysisId}-${slugifyFileSegment(normalizedInput.title)}.md`;
  const targetPath = await resolveWorkspacePath(
    normalizedInput.projectRoot,
    normalizedInput.slug,
    `analysis/${targetFileName}`,
  );

  await mkdir(dirname(targetPath), { recursive: true });
  await writeTextAtomically(targetPath, renderAnalysisArtifact(nextDocument));

  if (existingAnalysis && existingAnalysis.path !== targetPath) {
    await rm(existingAnalysis.path, { force: true });
  }

  await reconcileInsightAnalysisBacklinks({
    projectRoot: normalizedInput.projectRoot,
    slug: normalizedInput.slug,
    analysisId,
    previousInsightIds: existingAnalysis?.document.frontmatter.derived_from_insights ?? [],
    nextInsightIds: nextDocument.frontmatter.derived_from_insights,
  });

  store.manifest.inventory.analysis = await countAnalysisArtifacts(analysisDirectoryPath);

  if (operation === "created") {
    store.manifest.next_ids.analysis += 1;
  }

  await persistSourceStore(store);

  return {
    operation,
    analysisId,
    path: relativeWorkspacePath(store.manifest, basename(targetPath), "analysis"),
    insightIds: [...nextDocument.frontmatter.derived_from_insights],
  };
}

function normalizeUpsertAnalysisInput(
  input: UpsertAnalysisInput,
): NormalizedUpsertAnalysisInput {
  const projectRoot = input.projectRoot.trim();
  const slug = input.slug.trim();
  const title = input.title.trim();
  const question = input.question.trim();
  const synthesis = input.synthesis.trim();
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

  if (question.length === 0) {
    throw new Error("question is required");
  }

  if (synthesis.length === 0) {
    throw new Error("synthesis is required");
  }

  const insightIds = normalizeStringList(input.insightIds);

  if (insightIds.length === 0) {
    throw new Error("At least one insight is required");
  }

  return {
    projectRoot,
    slug,
    title,
    analysisId: normalizeOptionalText(input.analysisId),
    status: input.status ?? "draft",
    confidence: input.confidence ?? "unknown",
    insightIds,
    tags: normalizeStringList(input.tags ?? []),
    transitionalScaffold: Boolean(input.transitionalScaffold),
    question,
    synthesis,
    contradictions: normalizeListSection(input.contradictions, "contradictions"),
    caveats: normalizeListSection(input.caveats, "caveats"),
    openQuestions: normalizeListSection(input.openQuestions, "openQuestions"),
    nextMoves: normalizeListSection(input.nextMoves, "nextMoves"),
    operationTimestamp,
  };
}

async function loadExistingAnalyses(directoryPath: string): Promise<ExistingAnalysisRecord[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const analysisFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    analysisFiles.map(async (fileName) => {
      const path = `${directoryPath}/${fileName}`;
      return {
        path,
        document: parseAnalysisArtifact(await readFile(path, "utf8")),
      };
    }),
  );
}

async function assertReferencedInsightsExist(
  projectRoot: string,
  slug: string,
  insightIds: string[],
): Promise<void> {
  const insightsDirectoryPath = await resolveWorkspacePath(projectRoot, slug, "insights");
  const entries = await readdir(insightsDirectoryPath, { withFileTypes: true });
  const knownInsightIds = new Set<string>();

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      continue;
    }

    const path = `${insightsDirectoryPath}/${entry.name}`;
    const document = parseInsightArtifact(await readFile(path, "utf8"));
    knownInsightIds.add(document.frontmatter.id);
  }

  for (const insightId of insightIds) {
    if (!knownInsightIds.has(insightId)) {
      throw new Error(`Referenced insight not found: ${insightId}`);
    }
  }
}

function buildAnalysisDocument(
  input: NormalizedUpsertAnalysisInput,
  existingAnalysis: ParsedAnalysisDocument | undefined,
  analysisId: string,
): ParsedAnalysisDocument {
  return {
    frontmatter: {
      id: analysisId,
      title: input.title,
      status: input.status,
      confidence: input.confidence,
      derived_from_insights: input.insightIds,
      tags: input.tags,
      linked_reports: existingAnalysis?.frontmatter.linked_reports ?? [],
      transitional_scaffold: input.transitionalScaffold,
      created_at: existingAnalysis?.frontmatter.created_at ?? input.operationTimestamp,
      updated_at: input.operationTimestamp,
    },
    sections: {
      question: input.question,
      synthesis: input.synthesis,
      contradictions: input.contradictions,
      caveats: input.caveats,
      openQuestions: input.openQuestions,
      nextMoves: input.nextMoves,
    },
  };
}

async function countAnalysisArtifacts(directoryPath: string): Promise<number> {
  const entries = await readdir(directoryPath, { withFileTypes: true });

  return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md")).length;
}

function relativeWorkspacePath(
  manifest: ResearchManifest,
  fileName: string,
  directoryName: "analysis",
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

function normalizeStringList(values: string[] | undefined): string[] {
  return Array.from(
    new Set(
      (values ?? [])
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
