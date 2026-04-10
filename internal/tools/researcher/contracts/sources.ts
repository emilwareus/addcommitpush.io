import { validateSourcesDocument } from "./validators";

export interface SourceRecord {
  id: string;
  title: string;
  url: string;
  type: "webpage" | "paper" | "repo" | "video" | "podcast" | "dataset" | "book" | "other";
  credibility: "primary" | "secondary" | "tertiary" | "unknown";
  published_at?: string | null;
  accessed_at: string;
  status: "queued" | "read" | "quoted" | "rejected" | "stale" | "superseded";
  tags?: string[];
  snapshot_path?: string | null;
  linked_insights: string[];
  notes?: string | null;
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
