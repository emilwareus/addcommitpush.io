import { randomUUID } from "node:crypto";
import { readFile, readdir, rename, rm, writeFile } from "node:fs/promises";

import type {
  ArtifactSideState,
} from "../../contracts/insights";
import type { SourceRecord } from "../../contracts/sources";
import { resolveWorkspacePath } from "../../fs/workspace-paths";
import {
  parseAnalysisArtifact,
  parseInsightArtifact,
  parseReportArtifact,
  renderInsightArtifact,
  renderReportArtifact,
} from "../artifacts/markdown";

export interface PropagateFreshnessInput {
  projectRoot: string;
  slug: string;
  sources: SourceRecord[];
}

export interface PropagateFreshnessResult {
  insights: string[];
  analysis: string[];
  reports: string[];
}

interface ArtifactRecord<TDocument> {
  path: string;
  document: TDocument;
}

export async function propagateFreshness(
  input: PropagateFreshnessInput,
): Promise<PropagateFreshnessResult> {
  const [insightRecords, analysisRecords, reportRecords] = await Promise.all([
    loadArtifactRecords(input.projectRoot, input.slug, "insights", parseInsightArtifact),
    loadArtifactRecords(input.projectRoot, input.slug, "analysis", parseAnalysisArtifact),
    loadArtifactRecords(input.projectRoot, input.slug, "reports", parseReportArtifact),
  ]);
  const sourcesById = new Map(input.sources.map((source) => [source.id, source] as const));

  for (const insightRecord of insightRecords) {
    const nextSideStates = reconcileArtifactSideStates(
      insightRecord.document.frontmatter.side_states,
      {
        stale: insightRecord.document.frontmatter.derived_from_sources.some((sourceId) =>
          sourcesById.get(sourceId)?.side_states.includes("stale"),
        ),
        unsupported: !insightRecord.document.frontmatter.derived_from_sources.some((sourceId) => {
          const source = sourcesById.get(sourceId);
          return source ? isValidSupportingSource(source) : false;
        }),
      },
    );

    if (nextSideStates.join("|") === insightRecord.document.frontmatter.side_states.join("|")) {
      continue;
    }

    insightRecord.document = {
      ...insightRecord.document,
      frontmatter: {
        ...insightRecord.document.frontmatter,
        side_states: nextSideStates,
      },
    };
    await writeTextAtomically(insightRecord.path, renderInsightArtifact(insightRecord.document));
  }

  const insightsById = new Map(
    insightRecords.map((insightRecord) => [insightRecord.document.frontmatter.id, insightRecord] as const),
  );
  const analysisById = new Map(
    analysisRecords.map((analysisRecord) => [analysisRecord.document.frontmatter.id, analysisRecord] as const),
  );

  for (const reportRecord of reportRecords) {
    const effectiveInsights = new Set<string>();
    let stale = false;
    let unsupported =
      reportRecord.document.frontmatter.status === "disputed" ||
      reportRecord.document.frontmatter.status === "superseded";

    for (const analysisId of reportRecord.document.frontmatter.derived_from_analysis) {
      const analysisRecord = analysisById.get(analysisId);

      if (!analysisRecord) {
        unsupported = true;
        continue;
      }

      for (const insightId of analysisRecord.document.frontmatter.derived_from_insights) {
        effectiveInsights.add(insightId);
      }
    }

    for (const insightId of reportRecord.document.frontmatter.derived_from_insights) {
      effectiveInsights.add(insightId);
    }

    for (const insightId of effectiveInsights) {
      const insightRecord = insightsById.get(insightId);

      if (!insightRecord) {
        unsupported = true;
        continue;
      }

      if (insightRecord.document.frontmatter.side_states.includes("stale")) {
        stale = true;
      }

      if (
        insightRecord.document.frontmatter.side_states.includes("unsupported") ||
        insightRecord.document.frontmatter.status === "disputed" ||
        insightRecord.document.frontmatter.status === "superseded"
      ) {
        unsupported = true;
      }
    }

    const nextSideStates = reconcileArtifactSideStates(
      reportRecord.document.frontmatter.side_states,
      {
        stale,
        unsupported,
      },
    );

    if (nextSideStates.join("|") === reportRecord.document.frontmatter.side_states.join("|")) {
      continue;
    }

    reportRecord.document = {
      ...reportRecord.document,
      frontmatter: {
        ...reportRecord.document.frontmatter,
        side_states: nextSideStates,
      },
    };
    await writeTextAtomically(reportRecord.path, renderReportArtifact(reportRecord.document));
  }

  const impactedInsights = sortUniqueIds(
    insightRecords
      .filter((insightRecord) => insightRecord.document.frontmatter.side_states.includes("stale"))
      .map((insightRecord) => insightRecord.document.frontmatter.id),
  );

  return {
    insights: impactedInsights,
    analysis: sortUniqueIds(
      impactedInsights.flatMap((insightId) => {
        const insightRecord = insightsById.get(insightId);
        return insightRecord?.document.frontmatter.linked_analysis ?? [];
      }),
    ),
    reports: sortUniqueIds(
      impactedInsights.flatMap((insightId) => {
        const insightRecord = insightsById.get(insightId);
        return insightRecord?.document.frontmatter.linked_reports ?? [];
      }),
    ),
  };
}

async function loadArtifactRecords<TDocument>(
  projectRoot: string,
  slug: string,
  directoryName: "insights" | "analysis" | "reports",
  parseArtifact: (document: string) => TDocument,
): Promise<Array<ArtifactRecord<TDocument>>> {
  const directoryPath = await resolveWorkspacePath(projectRoot, slug, directoryName);
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

function isValidSupportingSource(source: SourceRecord): boolean {
  return !source.side_states.some((sideState) =>
    sideState === "rejected" || sideState === "stale" || sideState === "superseded",
  );
}

function reconcileArtifactSideStates(
  current: ArtifactSideState[],
  computed: {
    stale: boolean;
    unsupported: boolean;
  },
): ArtifactSideState[] {
  const next = new Set<ArtifactSideState>(
    current.filter((sideState) => sideState === "superseded"),
  );

  if (computed.stale) {
    next.add("stale");
  }

  if (computed.unsupported) {
    next.add("unsupported");
  }

  return Array.from(next).sort((left, right) => left.localeCompare(right));
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
