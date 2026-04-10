import { lstat, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import {
  type ResearchStage,
  type ResearchState,
} from "../contracts/manifest";
import {
  type SourcesEnvelope,
  validateSourcesEnvelope,
} from "../contracts/sources";
import { validateManifest } from "../contracts/validators";
import {
  resolveResearchWorkspacePaths,
  resolveWorkspacePath,
} from "../fs/workspace-paths";

export interface ResumeResearchWorkspaceInput {
  projectRoot: string;
  slug: string;
}

export interface ResumeResearchResult {
  researchId: string;
  slug: string;
  title: string;
  workspacePath: string;
  stage: string;
  state: string;
  openQuestions: string[];
  freshnessDebt: string;
  inventory: {
    sources: number;
    insights: number;
    analysis: number;
    reports: number;
  };
  nextRecommendedAction: string;
}

export async function resumeResearchWorkspace(
  input: ResumeResearchWorkspaceInput,
): Promise<ResumeResearchResult> {
  const normalizedInput = normalizeResumeResearchWorkspaceInput(input);
  const workspacePaths = resolveResearchWorkspacePaths(
    normalizedInput.projectRoot,
    normalizedInput.slug,
  );

  await assertWorkspaceRootIsNotSymlink(workspacePaths.workspaceRoot);

  const [
    briefPath,
    manifestPath,
    sourcesPath,
    insightsPath,
    analysisPath,
    reportsPath,
  ] = await Promise.all([
    resolveWorkspacePath(normalizedInput.projectRoot, normalizedInput.slug, "brief.md"),
    resolveWorkspacePath(normalizedInput.projectRoot, normalizedInput.slug, "manifest.json"),
    resolveWorkspacePath(normalizedInput.projectRoot, normalizedInput.slug, "sources.json"),
    resolveWorkspacePath(normalizedInput.projectRoot, normalizedInput.slug, "insights"),
    resolveWorkspacePath(normalizedInput.projectRoot, normalizedInput.slug, "analysis"),
    resolveWorkspacePath(normalizedInput.projectRoot, normalizedInput.slug, "reports"),
  ]);

  const [briefContent, manifest, sources, insightCount, analysisCount, reportCount] =
    await Promise.all([
      readRequiredMarkdownFile(briefPath, "brief.md"),
      readValidatedManifest(manifestPath),
      readValidatedSourcesEnvelope(sourcesPath),
      countWorkspaceFiles(insightsPath),
      countWorkspaceFiles(analysisPath),
      countWorkspaceFiles(reportsPath),
    ]);

  assertWorkspaceIdentity(manifest.research.slug, normalizedInput.slug, "manifest.json");
  assertWorkspaceIdentity(sources.research_id, manifest.research.id, "sources.json");

  const inventory = {
    sources: sources.sources.length,
    insights: insightCount,
    analysis: analysisCount,
    reports: reportCount,
  };

  return {
    researchId: manifest.research.id,
    slug: manifest.research.slug,
    title: manifest.research.title,
    workspacePath: workspacePaths.workspaceRoot,
    stage: manifest.status.stage,
    state: manifest.status.state,
    openQuestions: [...manifest.questions.active],
    freshnessDebt: formatFreshnessDebt(manifest.freshness.debt),
    inventory,
    nextRecommendedAction: deriveNextRecommendedAction({
      stage: manifest.status.stage,
      state: manifest.status.state,
      freshnessDebt: manifest.freshness.debt,
      openQuestions: manifest.questions.active,
      inventory,
    }),
  };
}

interface NormalizedResumeResearchWorkspaceInput {
  projectRoot: string;
  slug: string;
}

interface ResumeRecommendationInput {
  stage: ResearchStage;
  state: ResearchState;
  freshnessDebt: number;
  openQuestions: string[];
  inventory: ResumeResearchResult["inventory"];
}

function normalizeResumeResearchWorkspaceInput(
  input: ResumeResearchWorkspaceInput,
): NormalizedResumeResearchWorkspaceInput {
  const projectRoot = input.projectRoot.trim();
  const slug = input.slug.trim();

  if (projectRoot.length === 0) {
    throw new Error("projectRoot is required");
  }

  if (slug.length === 0) {
    throw new Error("slug is required");
  }

  return {
    projectRoot,
    slug,
  };
}

async function assertWorkspaceRootIsNotSymlink(workspaceRoot: string): Promise<void> {
  const workspaceStats = await lstat(workspaceRoot);

  if (workspaceStats.isSymbolicLink()) {
    throw new Error("Research workspace root must not be a symbolic link");
  }
}

async function readRequiredMarkdownFile(filePath: string, label: string): Promise<string> {
  const content = await readFile(filePath, "utf8");

  if (content.trim().length === 0) {
    throw new Error(`${label} is required`);
  }

  return content;
}

async function readValidatedManifest(filePath: string) {
  return validateManifest(await readJsonDocument(filePath, "manifest.json"));
}

async function readValidatedSourcesEnvelope(filePath: string): Promise<SourcesEnvelope> {
  return validateSourcesEnvelope(await readJsonDocument(filePath, "sources.json"));
}

async function readJsonDocument(filePath: string, label: string): Promise<unknown> {
  const content = await readFile(filePath, "utf8");

  try {
    return JSON.parse(content) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown JSON parse error";
    throw new Error(`${label} is not valid JSON: ${message}`);
  }
}

function assertWorkspaceIdentity(actual: string, expected: string, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label} does not match the requested workspace identity`);
  }
}

async function countWorkspaceFiles(directoryPath: string): Promise<number> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      throw new Error(
        `Workspace inventory must not traverse symbolic links: ${join(directoryPath, entry.name)}`,
      );
    }

    if (entry.isFile()) {
      count += 1;
      continue;
    }

    if (entry.isDirectory()) {
      count += await countWorkspaceFiles(join(directoryPath, entry.name));
    }
  }

  return count;
}

function formatFreshnessDebt(debt: number): string {
  return debt === 0 ? "clear" : `overdue:${debt}`;
}

function deriveNextRecommendedAction(input: ResumeRecommendationInput): string {
  if (input.state === "paused") {
    return "resume-active-work";
  }

  if (input.state === "archived") {
    return "review-archived-research";
  }

  if (input.openQuestions.length === 0) {
    return "define-open-questions";
  }

  if (input.freshnessDebt > 0 && input.inventory.sources > 0) {
    return "refresh-sources";
  }

  switch (input.stage) {
    case "intake":
    case "harvest":
      return input.inventory.sources === 0 ? "harvest-sources" : "extract-insights";
    case "extract":
      if (input.inventory.sources === 0) {
        return "harvest-sources";
      }

      if (input.inventory.insights === 0) {
        return "extract-insights";
      }

      if (input.inventory.analysis === 0) {
        return "synthesize-analysis";
      }

      return input.inventory.reports === 0 ? "package-report" : "review-existing-reports";
    case "synthesize":
      return input.inventory.analysis === 0 ? "synthesize-analysis" : "package-report";
    case "package":
      return input.inventory.reports === 0 ? "package-report" : "review-existing-reports";
    case "refresh":
      return input.inventory.sources === 0 ? "harvest-sources" : "refresh-sources";
  }
}
