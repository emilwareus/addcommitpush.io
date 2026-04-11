import { readFile, readdir, rename, rm, writeFile } from "node:fs/promises";

import { resolveWorkspacePath } from "../../fs/workspace-paths";
import { parseInsightArtifact, renderInsightArtifact } from "../artifacts/markdown";

export interface ReconcileInsightAnalysisBacklinksInput {
  projectRoot: string;
  slug: string;
  analysisId: string;
  previousInsightIds: string[];
  nextInsightIds: string[];
}

export async function reconcileInsightAnalysisBacklinks(
  input: ReconcileInsightAnalysisBacklinksInput,
): Promise<void> {
  const insightsDirectoryPath = await resolveWorkspacePath(
    input.projectRoot,
    input.slug,
    "insights",
  );
  const insightRecords = await loadInsightRecords(insightsDirectoryPath);
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

  const reconciledInsightIds = new Set([...previousInsightIds, ...nextInsightIds]);

  for (const insightId of reconciledInsightIds) {
    const insightRecord = insightRecordsById.get(insightId);

    if (!insightRecord) {
      continue;
    }

    const shouldLink = nextInsightIds.includes(insightId);
    const linkedAnalysis = shouldLink
      ? toSortedUniqueIds([
          ...insightRecord.document.frontmatter.linked_analysis,
          input.analysisId,
        ])
      : insightRecord.document.frontmatter.linked_analysis.filter(
          (linkedAnalysisId) => linkedAnalysisId !== input.analysisId,
        );

    if (
      linkedAnalysis.join("|") ===
      insightRecord.document.frontmatter.linked_analysis.join("|")
    ) {
      continue;
    }

    const updatedInsight = {
      ...insightRecord.document,
      frontmatter: {
        ...insightRecord.document.frontmatter,
        linked_analysis: linkedAnalysis,
      },
    };

    await writeTextAtomically(insightRecord.path, renderInsightArtifact(updatedInsight));
  }
}

interface InsightRecord {
  path: string;
  document: ReturnType<typeof parseInsightArtifact>;
}

async function loadInsightRecords(directoryPath: string): Promise<InsightRecord[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const insightFileNames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    insightFileNames.map(async (fileName) => {
      const path = `${directoryPath}/${fileName}`;
      return {
        path,
        document: parseInsightArtifact(await readFile(path, "utf8")),
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
