import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  MANIFEST_CONTRACT_VERSION,
  createInitialNextResearchIds,
  createManifestPaths,
  type ResearchManifest,
} from "../contracts/manifest";
import { createEmptySourcesEnvelope, type SourcesEnvelope } from "../contracts/sources";
import { REQUIRED_WORKSPACE_DIRECTORIES } from "../contracts/workspace";
import type { ResearchWorkspacePaths } from "../fs/workspace-paths";
import { writeJsonAtomically } from "../fs/write-json-atomically";

export const INITIAL_FRESHNESS_WINDOW_DAYS = 30;

interface CreateInitialManifestInput {
  researchId: string;
  slug: string;
  title: string;
  question: string;
}

export interface SeedResearchWorkspaceInput {
  workspacePaths: ResearchWorkspacePaths;
  briefContent: string;
  manifest: ResearchManifest;
  sourcesEnvelope: SourcesEnvelope;
}

export function createInitialResearchManifest(
  input: CreateInitialManifestInput,
): ResearchManifest {
  return {
    contract_version: MANIFEST_CONTRACT_VERSION,
    research: {
      id: input.researchId,
      slug: input.slug,
      title: input.title,
    },
    status: {
      state: "active",
      stage: "intake",
    },
    questions: {
      active: [input.question],
    },
    freshness: {
      window_days: INITIAL_FRESHNESS_WINDOW_DAYS,
      last_source_sync_at: null,
      debt: 0,
    },
    inventory: {
      sources: 0,
      insights: 0,
      analysis: 0,
      reports: 0,
    },
    paths: createManifestPaths(input.slug),
    next_ids: createInitialNextResearchIds(),
  };
}

export function createInitialSourcesDocument(researchId: string): SourcesEnvelope {
  return createEmptySourcesEnvelope(researchId);
}

export async function seedResearchWorkspace(
  input: SeedResearchWorkspaceInput,
): Promise<void> {
  await mkdir(input.workspacePaths.workspaceRoot, { recursive: true });

  for (const directoryName of REQUIRED_WORKSPACE_DIRECTORIES) {
    await mkdir(join(input.workspacePaths.workspaceRoot, directoryName), { recursive: true });
  }

  await writeFile(
    input.workspacePaths.briefPath,
    ensureTrailingNewline(input.briefContent),
    "utf8",
  );
  await writeJsonAtomically(input.workspacePaths.manifestPath, input.manifest);
  await writeJsonAtomically(input.workspacePaths.sourcesPath, input.sourcesEnvelope);
}

function ensureTrailingNewline(content: string): string {
  return content.endsWith("\n") ? content : `${content}\n`;
}
