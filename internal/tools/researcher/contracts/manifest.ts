import {
  createWorkspaceContractPaths,
  type WorkspaceContractPaths,
} from "./workspace";

export const MANIFEST_CONTRACT_VERSION = "1.0";
export const RESEARCH_ID_PREFIX = "RES";

export const ARTIFACT_ID_PREFIXES = {
  source: "SRC",
  insight: "INS",
  analysis: "ANL",
  report: "RPT",
  task: "TSK",
} as const;

export type ArtifactKind = keyof typeof ARTIFACT_ID_PREFIXES;
export type ArtifactIdPrefix = (typeof ARTIFACT_ID_PREFIXES)[ArtifactKind];
export type ResearchStage =
  | "intake"
  | "harvest"
  | "extract"
  | "synthesize"
  | "package"
  | "refresh";
export type ResearchState = "active" | "paused" | "archived";

export interface NextResearchIds {
  source: number;
  insight: number;
  analysis: number;
  report: number;
  task: number;
}

export interface ManifestVerificationSummary {
  debt: number;
  unsupported_insights: number;
  unsupported_reports: number;
  contradicted_analysis: number;
  unresolved_analysis_questions: number;
}

export interface ResearchManifest {
  contract_version: typeof MANIFEST_CONTRACT_VERSION;
  research: {
    id: string;
    slug: string;
    title: string;
  };
  status: {
    state: ResearchState;
    stage: ResearchStage;
  };
  questions: {
    active: string[];
  };
  freshness: {
    window_days: number;
    last_source_sync_at: string | null;
    debt: number;
  };
  verification: ManifestVerificationSummary;
  inventory: {
    sources: number;
    insights: number;
    analysis: number;
    reports: number;
  };
  paths: WorkspaceContractPaths;
  next_ids: NextResearchIds;
}

export const INITIAL_NEXT_RESEARCH_IDS: Readonly<NextResearchIds> = Object.freeze({
  source: 1,
  insight: 1,
  analysis: 1,
  report: 1,
  task: 1,
});

export function createInitialNextResearchIds(): NextResearchIds {
  return { ...INITIAL_NEXT_RESEARCH_IDS };
}

export function createInitialVerificationSummary(): ManifestVerificationSummary {
  return {
    debt: 0,
    unsupported_insights: 0,
    unsupported_reports: 0,
    contradicted_analysis: 0,
    unresolved_analysis_questions: 0,
  };
}

export function formatArtifactId(kind: ArtifactKind, counter: number): string {
  if (!Number.isInteger(counter) || counter < 1) {
    throw new Error(`Artifact counter must be a positive integer. Received: ${counter}`);
  }

  return `${ARTIFACT_ID_PREFIXES[kind]}-${String(counter).padStart(4, "0")}`;
}

export function createResearchId(slug: string, date: Date): string {
  return `${RESEARCH_ID_PREFIX}-${formatDateForResearchId(date)}-${slug}`;
}

export function createManifestPaths(slug: string): WorkspaceContractPaths {
  return createWorkspaceContractPaths(slug);
}

function formatDateForResearchId(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");
}
