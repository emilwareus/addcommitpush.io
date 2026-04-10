import { readFile } from "node:fs/promises";

import { type ResearchManifest, formatArtifactId } from "../../contracts/manifest";
import {
  type SourceSideState,
  type SourcesEnvelope,
  validateSourcesEnvelope,
} from "../../contracts/sources";
import { validateManifest } from "../../contracts/validators";
import { resolveResearchWorkspacePaths } from "../../fs/workspace-paths";
import { writeJsonAtomically } from "../../fs/write-json-atomically";

export interface SourceStoreState {
  workspaceRoot: string;
  manifestPath: string;
  sourcesPath: string;
  manifest: ResearchManifest;
  sources: SourcesEnvelope;
}

export interface LoadSourceStoreInput {
  projectRoot: string;
  slug: string;
}

export async function loadSourceStore(input: LoadSourceStoreInput): Promise<SourceStoreState> {
  const workspacePaths = resolveResearchWorkspacePaths(input.projectRoot, input.slug);
  const [manifestDocument, sourcesDocument] = await Promise.all([
    readJsonDocument(workspacePaths.manifestPath, "manifest.json"),
    readJsonDocument(workspacePaths.sourcesPath, "sources.json"),
  ]);
  const manifest = validateManifest(manifestDocument);
  const sources = validateSourcesEnvelope(sourcesDocument);

  if (manifest.research.slug !== input.slug) {
    throw new Error("manifest.json does not match the requested workspace identity");
  }

  if (manifest.research.id !== sources.research_id) {
    throw new Error("sources.json does not match manifest.json research identity");
  }

  return {
    workspaceRoot: workspacePaths.workspaceRoot,
    manifestPath: workspacePaths.manifestPath,
    sourcesPath: workspacePaths.sourcesPath,
    manifest,
    sources,
  };
}

export async function persistSourceStore(state: SourceStoreState): Promise<void> {
  validateManifest(state.manifest);
  validateSourcesEnvelope(state.sources);

  await writeJsonAtomically(state.sourcesPath, state.sources);
  await writeJsonAtomically(state.manifestPath, state.manifest);
}

export function allocateSourceId(manifest: ResearchManifest): string {
  return formatArtifactId("source", manifest.next_ids.source);
}

export function syncSourceManifestState(
  manifest: ResearchManifest,
  sources: SourcesEnvelope,
  operationTimestamp: string,
): void {
  manifest.inventory.sources = sources.sources.length;
  manifest.freshness.last_source_sync_at = operationTimestamp;
  manifest.freshness.debt = countSourcesWithSideState(sources, "stale");
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

function countSourcesWithSideState(
  sources: SourcesEnvelope,
  sideState: SourceSideState,
): number {
  return sources.sources.filter((source) => source.side_states.includes(sideState)).length;
}
