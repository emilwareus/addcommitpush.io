const WORKSPACE_DIRECTORIES = ["insights", "data", "analysis", "reports"] as const;
const WORKSPACE_FILES = ["brief.md", "manifest.json", "sources.json"] as const;

export const RESEARCHER_ROOT_DIRECTORY = "researcher";
export const RESEARCH_WORKSPACES_DIRECTORY = "researches";
export const RESEARCH_WORKSPACE_ROOT = `${RESEARCHER_ROOT_DIRECTORY}/${RESEARCH_WORKSPACES_DIRECTORY}`;

export type WorkspaceDirectoryName = (typeof WORKSPACE_DIRECTORIES)[number];
export type WorkspaceFileName = (typeof WORKSPACE_FILES)[number];

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
