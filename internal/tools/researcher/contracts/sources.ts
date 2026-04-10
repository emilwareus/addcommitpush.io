import { validateSourcesDocument } from "./validators";

export const SOURCE_TYPE_VALUES = [
  "webpage",
  "paper",
  "repo",
  "video",
  "podcast",
  "dataset",
  "book",
  "other",
] as const;
export const SOURCE_CONFIDENCE_VALUES = ["high", "medium", "low", "unknown"] as const;
export const SOURCE_STATUS_VALUES = ["queued", "read", "quoted"] as const;
export const SOURCE_SIDE_STATE_VALUES = ["rejected", "stale", "superseded"] as const;
export const SOURCE_ORIGIN_TYPE_VALUES = [
  "manual",
  "search",
  "import",
  "agent",
  "other",
] as const;
export const SOURCE_CAPTURE_KIND_VALUES = [
  "snapshot",
  "export",
  "transcript",
  "dataset",
] as const;

export type SourceType = (typeof SOURCE_TYPE_VALUES)[number];
export type SourceConfidence = (typeof SOURCE_CONFIDENCE_VALUES)[number];
export type SourceStatus = (typeof SOURCE_STATUS_VALUES)[number];
export type SourceSideState = (typeof SOURCE_SIDE_STATE_VALUES)[number];
export type SourceOriginType = (typeof SOURCE_ORIGIN_TYPE_VALUES)[number];
export type SourceCaptureKind = (typeof SOURCE_CAPTURE_KIND_VALUES)[number];

export interface SourceOrigin {
  type: SourceOriginType;
  value: string;
}

export interface SourceCapture {
  kind: SourceCaptureKind;
  path: string;
  captured_at: string;
}

export interface SourceRecord {
  id: string;
  title: string;
  url: string;
  canonical_url: string;
  origin: SourceOrigin;
  type: SourceType;
  confidence: SourceConfidence;
  status: SourceStatus;
  side_states: SourceSideState[];
  published_at: string | null;
  created_at: string;
  updated_at: string;
  accessed_at: string | null;
  last_checked_at: string | null;
  latest_capture_path: string | null;
  captures: SourceCapture[];
  linked_insights: string[];
  tags: string[];
  notes: string | null;
}

export interface SourcesEnvelope {
  research_id: string;
  updated_at: string | null;
  sources: SourceRecord[];
}

export function createEmptySourcesEnvelope(researchId: string): SourcesEnvelope {
  if (researchId.trim().length === 0) {
    throw new Error("researchId is required to seed sources.json");
  }

  return {
    research_id: researchId,
    updated_at: null,
    sources: [],
  };
}

export function validateSourcesEnvelope(input: unknown): SourcesEnvelope {
  return validateSourcesDocument(input);
}
