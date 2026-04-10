const WORKSPACE_DIRECTORIES = ["insights", "data", "analysis", "reports"] as const;
const WORKSPACE_FILES = ["brief.md", "manifest.json", "sources.json"] as const;
const DATA_BUCKET_NAMES = ["snapshots", "exports", "transcripts", "datasets"] as const;

export const RESEARCHER_ROOT_DIRECTORY = "researcher";
export const RESEARCH_WORKSPACES_DIRECTORY = "researches";
export const RESEARCH_WORKSPACE_ROOT = `${RESEARCHER_ROOT_DIRECTORY}/${RESEARCH_WORKSPACES_DIRECTORY}`;
export const DATA_SNAPSHOTS_DIRECTORY = "data/snapshots";
export const DATA_EXPORTS_DIRECTORY = "data/exports";
export const DATA_TRANSCRIPTS_DIRECTORY = "data/transcripts";
export const DATA_DATASETS_DIRECTORY = "data/datasets";

export type WorkspaceDirectoryName = (typeof WORKSPACE_DIRECTORIES)[number];
export type WorkspaceFileName = (typeof WORKSPACE_FILES)[number];
export type WorkspaceDataBucketName = (typeof DATA_BUCKET_NAMES)[number];

export interface WorkspaceContractPaths {
  root: string;
  brief: string;
  manifest: string;
  sources: string;
  insights: string;
  data: string;
  analysis: string;
  reports: string;
}

export const REQUIRED_WORKSPACE_DIRECTORIES: readonly WorkspaceDirectoryName[] =
  WORKSPACE_DIRECTORIES;
export const REQUIRED_WORKSPACE_FILES: readonly WorkspaceFileName[] = WORKSPACE_FILES;
export const REQUIRED_DATA_BUCKET_NAMES: readonly WorkspaceDataBucketName[] = DATA_BUCKET_NAMES;

export function resolveDataBucketRoot(bucket: WorkspaceDataBucketName): string {
  switch (bucket) {
    case "snapshots":
      return DATA_SNAPSHOTS_DIRECTORY;
    case "exports":
      return DATA_EXPORTS_DIRECTORY;
    case "transcripts":
      return DATA_TRANSCRIPTS_DIRECTORY;
    case "datasets":
      return DATA_DATASETS_DIRECTORY;
  }
}

export function buildSourceCaptureDirectory(
  bucket: WorkspaceDataBucketName,
  sourceId: string,
  captureStamp: string,
): string {
  return `${resolveDataBucketRoot(bucket)}/${sourceId}/${captureStamp}`;
}

export function createWorkspaceContractPaths(slug: string): WorkspaceContractPaths {
  const root = `${RESEARCH_WORKSPACE_ROOT}/${slug}`;

  return {
    root,
    brief: `${root}/brief.md`,
    manifest: `${root}/manifest.json`,
    sources: `${root}/sources.json`,
    insights: `${root}/insights`,
    data: `${root}/data`,
    analysis: `${root}/analysis`,
    reports: `${root}/reports`,
  };
}
