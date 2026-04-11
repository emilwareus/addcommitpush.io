import { readdir, readFile } from "node:fs/promises";

import type { StatusSummary } from "../../contracts/status";
import { validateStatusSummary } from "../../contracts/validators";
import { resolveWorkspacePath } from "../../fs/workspace-paths";
import {
  parseAnalysisArtifact,
  parseInsightArtifact,
  parseReportArtifact,
} from "../artifacts/markdown";
import {
  loadSourceStore,
  persistSourceStore,
} from "../sources/store";

import {
  evaluateResearchDebt,
  type StatusArtifactRecord,
} from "./debt";

export interface SummarizeResearchStatusInput {
  projectRoot: string;
  slug: string;
}

export async function summarizeResearchStatus(
  input: SummarizeResearchStatusInput,
): Promise<StatusSummary> {
  const normalizedInput = normalizeSummaryInput(input);
  const store = await loadSourceStore(normalizedInput);
  const [insightRecords, analysisRecords, reportRecords] = await Promise.all([
    loadArtifactRecords(
      normalizedInput.projectRoot,
      normalizedInput.slug,
      "insights",
      parseInsightArtifact,
    ),
    loadArtifactRecords(
      normalizedInput.projectRoot,
      normalizedInput.slug,
      "analysis",
      parseAnalysisArtifact,
    ),
    loadArtifactRecords(
      normalizedInput.projectRoot,
      normalizedInput.slug,
      "reports",
      parseReportArtifact,
    ),
  ]);
  const inventory = {
    sources: store.sources.sources.length,
    insights: insightRecords.length,
    analysis: analysisRecords.length,
    reports: reportRecords.length,
  };
  const debt = evaluateResearchDebt({
    manifest: store.manifest,
    sources: store.sources.sources,
    insightRecords,
    analysisRecords,
    reportRecords,
  });

  syncManifestAggregates(store, inventory, debt);
  await persistSourceStore(store);

  return validateStatusSummary({
    research: {
      id: store.manifest.research.id,
      slug: store.manifest.research.slug,
      title: store.manifest.research.title,
    },
    status: {
      stage: store.manifest.status.stage,
      state: store.manifest.status.state,
    },
    openQuestions: [...store.manifest.questions.active],
    inventory,
    freshnessDebt: {
      count: debt.freshnessDebt.count,
      windowDays: store.manifest.freshness.window_days,
      lastSourceSyncAt: store.manifest.freshness.last_source_sync_at,
      staleSources: debt.freshnessDebt.staleSources,
    },
    verificationDebt: debt.verificationDebt,
    impacted: debt.impacted,
    nextRecommendedAction: deriveNextRecommendedAction({
      state: store.manifest.status.state,
      stage: store.manifest.status.stage,
      openQuestions: store.manifest.questions.active,
      inventory,
      freshnessDebt: debt.freshnessDebt.count,
      verificationDebt: debt.verificationDebt.count,
      impacted: debt.impacted,
    }),
  });
}

interface LoadedInventory {
  sources: number;
  insights: number;
  analysis: number;
  reports: number;
}

interface NextActionInput {
  state: StatusSummary["status"]["state"];
  stage: StatusSummary["status"]["stage"];
  openQuestions: string[];
  inventory: LoadedInventory;
  freshnessDebt: number;
  verificationDebt: number;
  impacted: StatusSummary["impacted"];
}

interface NormalizedSummaryInput {
  projectRoot: string;
  slug: string;
}

function normalizeSummaryInput(
  input: SummarizeResearchStatusInput,
): NormalizedSummaryInput {
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

async function loadArtifactRecords<TDocument>(
  projectRoot: string,
  slug: string,
  directoryName: "insights" | "analysis" | "reports",
  parseArtifact: (document: string) => TDocument,
): Promise<Array<StatusArtifactRecord<TDocument>>> {
  const directoryPath = await resolveWorkspacePath(projectRoot, slug, directoryName);
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const markdownFileNames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    markdownFileNames.map(async (fileName) => {
      const path = `${directoryPath}/${fileName}`;

      return {
        path,
        document: parseArtifact(await readFile(path, "utf8")),
      };
    }),
  );
}

function syncManifestAggregates(
  store: Awaited<ReturnType<typeof loadSourceStore>>,
  inventory: LoadedInventory,
  debt: ReturnType<typeof evaluateResearchDebt>,
): void {
  store.manifest.inventory = inventory;
  store.manifest.freshness.debt = debt.freshnessDebt.count;
  store.manifest.verification = debt.manifestVerification;
}

function deriveNextRecommendedAction(input: NextActionInput): string {
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

  if (input.verificationDebt > 0) {
    return "resolve-verification-debt";
  }

  if (
    input.impacted.insights.length > 0 ||
    input.impacted.analysis.length > 0 ||
    input.impacted.reports.length > 0
  ) {
    return "regenerate-impacted-artifacts";
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
