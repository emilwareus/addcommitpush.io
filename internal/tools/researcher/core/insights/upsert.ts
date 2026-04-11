import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";

import { formatArtifactId, type ResearchManifest } from "../../contracts/manifest";
import type {
  InsightConfidence,
  InsightEvidenceItem,
  InsightStatus,
  ParsedInsightDocument,
} from "../../contracts/insights";
import { resolveWorkspacePath } from "../../fs/workspace-paths";
import { loadSourceStore, persistSourceStore } from "../sources/store";
import { parseInsightArtifact, renderInsightArtifact } from "../artifacts/markdown";

import { reconcileSourceInsightBacklinks } from "./backlinks";
import {
  createInsightFingerprint,
  normalizeComparableText,
  normalizeSourceIds,
} from "./dedupe";

export interface UpsertInsightInput {
  projectRoot: string;
  slug: string;
  title: string;
  status?: InsightStatus;
  confidence?: InsightConfidence;
  tags?: string[];
  insightId?: string;
  sourceIds: string[];
  claim: string;
  whyItMatters: string;
  evidence: InsightEvidenceItem[];
  caveats: string[];
  reuseNotes: string;
  now?: Date;
}

export interface UpsertInsightResult {
  operation: "created" | "updated";
  insightId: string;
  path: string;
  sourceIds: string[];
}

interface ExistingInsightRecord {
  document: ParsedInsightDocument;
  fileName: string;
  path: string;
}

interface NormalizedUpsertInsightInput {
  projectRoot: string;
  slug: string;
  title: string;
  status: InsightStatus;
  confidence: InsightConfidence;
  tags: string[];
  insightId: string | null;
  sourceIds: string[];
  claim: string;
  whyItMatters: string;
  evidence: InsightEvidenceItem[];
  caveats: string[];
  reuseNotes: string;
  operationTimestamp: string;
}

export async function upsertInsight(input: UpsertInsightInput): Promise<UpsertInsightResult> {
  const normalizedInput = normalizeUpsertInsightInput(input);
  const store = await loadSourceStore({
    projectRoot: normalizedInput.projectRoot,
    slug: normalizedInput.slug,
  });
  const insightsDirectoryPath = await resolveWorkspacePath(
    normalizedInput.projectRoot,
    normalizedInput.slug,
    "insights",
  );
  const existingInsights = await loadExistingInsights(insightsDirectoryPath);
  const existingInsight = normalizedInput.insightId
    ? existingInsights.find(
        (insight) => insight.document.frontmatter.id === normalizedInput.insightId,
      ) ?? null
    : null;

  if (normalizedInput.insightId && !existingInsight) {
    throw new Error(`Insight not found: ${normalizedInput.insightId}`);
  }

  assertSupportingSourcesExist(store.sources.sources, normalizedInput.sourceIds);
  assertNoDuplicateInsight(existingInsights, normalizedInput, existingInsight?.document.frontmatter.id);

  const operation = existingInsight ? "updated" : "created";
  const insightId = existingInsight
    ? existingInsight.document.frontmatter.id
    : formatArtifactId("insight", store.manifest.next_ids.insight);
  const nextDocument = buildInsightDocument(normalizedInput, existingInsight?.document, insightId);
  const targetFileName = `${insightId}-${slugifyFileSegment(normalizedInput.title)}.md`;
  const targetPath = await resolveWorkspacePath(
    normalizedInput.projectRoot,
    normalizedInput.slug,
    `insights/${targetFileName}`,
  );

  await mkdir(dirname(targetPath), { recursive: true });
  await writeTextAtomically(targetPath, renderInsightArtifact(nextDocument));

  if (existingInsight && existingInsight.path !== targetPath) {
    await rm(existingInsight.path, { force: true });
  }

  reconcileSourceInsightBacklinks({
    sources: store.sources,
    insightId,
    previousSourceIds: existingInsight?.document.frontmatter.derived_from_sources ?? [],
    nextSourceIds: nextDocument.frontmatter.derived_from_sources,
  });

  store.sources.updated_at = normalizedInput.operationTimestamp;
  store.manifest.inventory.insights = await countInsightArtifacts(insightsDirectoryPath);

  if (operation === "created") {
    store.manifest.next_ids.insight += 1;
  }

  await persistSourceStore(store);

  return {
    operation,
    insightId,
    path: relativeWorkspacePath(store.manifest, basename(targetPath), "insights"),
    sourceIds: [...nextDocument.frontmatter.derived_from_sources],
  };
}

function normalizeUpsertInsightInput(input: UpsertInsightInput): NormalizedUpsertInsightInput {
  const projectRoot = input.projectRoot.trim();
  const slug = input.slug.trim();
  const title = input.title.trim();
  const claim = input.claim.trim();
  const whyItMatters = input.whyItMatters.trim();
  const reuseNotes = input.reuseNotes.trim();
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

  if (claim.length === 0) {
    throw new Error("claim is required");
  }

  if (whyItMatters.length === 0) {
    throw new Error("whyItMatters is required");
  }

  if (reuseNotes.length === 0) {
    throw new Error("reuseNotes is required");
  }

  const sourceIds = normalizeSourceIds(input.sourceIds);

  if (sourceIds.length === 0) {
    throw new Error("At least one supporting source is required");
  }

  const evidence = input.evidence.map((item) => {
    const sourceId = item.sourceId.trim();
    const note = item.note.trim();

    if (!/^SRC-[0-9]{4}$/.test(sourceId)) {
      throw new Error(`Invalid evidence source ID: ${sourceId}`);
    }

    if (note.length === 0) {
      throw new Error(`Evidence note is required for ${sourceId}`);
    }

    return {
      sourceId,
      note,
    };
  });

  const evidenceSourceIds = normalizeSourceIds(evidence.map((item) => item.sourceId));

  if (sourceIds.join("|") !== evidenceSourceIds.join("|")) {
    throw new Error("sourceIds must match the evidence source IDs");
  }

  return {
    projectRoot,
    slug,
    title,
    status: input.status ?? "draft",
    confidence: input.confidence ?? "unknown",
    tags: normalizeStringList(input.tags ?? []),
    insightId: normalizeOptionalText(input.insightId),
    sourceIds,
    claim,
    whyItMatters,
    evidence: evidence.sort((left, right) => left.sourceId.localeCompare(right.sourceId)),
    caveats: normalizeStringList(input.caveats),
    reuseNotes,
    operationTimestamp,
  };
}

async function loadExistingInsights(directoryPath: string): Promise<ExistingInsightRecord[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const insightFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const loadedInsights = await Promise.all(
    insightFiles.map(async (fileName) => {
      const path = `${directoryPath}/${fileName}`;
      const content = await readFile(path, "utf8");

      return {
        fileName,
        path,
        document: parseInsightArtifact(content),
      };
    }),
  );

  return loadedInsights;
}

function assertNoDuplicateInsight(
  existingInsights: ExistingInsightRecord[],
  input: NormalizedUpsertInsightInput,
  currentInsightId?: string,
): void {
  const candidateTitle = normalizeComparableText(input.title);
  const candidateClaim = normalizeComparableText(input.claim);
  const candidateSourceIds = new Set(input.sourceIds);
  const candidateFingerprint = createInsightFingerprint({
    title: input.title,
    claim: input.claim,
    derivedFromSources: input.sourceIds,
  });

  for (const existingInsight of existingInsights) {
    if (existingInsight.document.frontmatter.id === currentInsightId) {
      continue;
    }

    const existingTitle = normalizeComparableText(existingInsight.document.frontmatter.title);
    const existingClaim = normalizeComparableText(existingInsight.document.sections.claim);
    const hasSourceOverlap = existingInsight.document.frontmatter.derived_from_sources.some(
      (sourceId) => candidateSourceIds.has(sourceId),
    );

    if (!hasSourceOverlap) {
      continue;
    }

    if (existingTitle !== candidateTitle || existingClaim !== candidateClaim) {
      continue;
    }

    const existingFingerprint = createInsightFingerprint({
      title: existingInsight.document.frontmatter.title,
      claim: existingInsight.document.sections.claim,
      derivedFromSources: existingInsight.document.frontmatter.derived_from_sources,
    });

    throw new Error(
      `Duplicate insight detected: ${existingInsight.document.frontmatter.id} matches ${candidateFingerprint} and ${existingFingerprint}`,
    );
  }
}

function buildInsightDocument(
  input: NormalizedUpsertInsightInput,
  existingInsight: ParsedInsightDocument | undefined,
  insightId: string,
): ParsedInsightDocument {
  return {
    frontmatter: {
      id: insightId,
      title: input.title,
      status: input.status,
      confidence: input.confidence,
      derived_from_sources: input.sourceIds,
      tags: input.tags,
      linked_analysis: existingInsight?.frontmatter.linked_analysis ?? [],
      linked_reports: existingInsight?.frontmatter.linked_reports ?? [],
      created_at: existingInsight?.frontmatter.created_at ?? input.operationTimestamp,
      updated_at: input.operationTimestamp,
    },
    sections: {
      claim: input.claim,
      whyItMatters: input.whyItMatters,
      evidence: input.evidence,
      caveats: input.caveats.length > 0 ? input.caveats : ["None noted yet."],
      reuseNotes: input.reuseNotes,
    },
  };
}

async function countInsightArtifacts(directoryPath: string): Promise<number> {
  const entries = await readdir(directoryPath, { withFileTypes: true });

  return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md")).length;
}

function assertSupportingSourcesExist(
  sourceRecords: ReadonlyArray<{ id: string }>,
  sourceIds: string[],
): void {
  const knownSourceIds = new Set(sourceRecords.map((sourceRecord) => sourceRecord.id));

  for (const sourceId of sourceIds) {
    if (!knownSourceIds.has(sourceId)) {
      throw new Error(`Supporting source not found: ${sourceId}`);
    }
  }
}

function relativeWorkspacePath(
  manifest: ResearchManifest,
  fileName: string,
  directoryName: "insights",
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
