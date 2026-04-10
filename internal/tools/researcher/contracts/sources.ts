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
  if (!isRecord(input)) {
    throw new Error("sources.json must be an object");
  }

  const { research_id, updated_at, sources } = input;

  if (typeof research_id !== "string" || research_id.trim().length === 0) {
    throw new Error("sources.json research_id must be a non-empty string");
  }

  if (updated_at !== null && typeof updated_at !== "string") {
    throw new Error("sources.json updated_at must be a string or null");
  }

  if (!Array.isArray(sources)) {
    throw new Error("sources.json sources must be an array");
  }

  return {
    research_id,
    updated_at,
    sources: sources as SourceRecord[],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
