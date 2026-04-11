import { SOURCE_CONFIDENCE_VALUES } from "./sources";

export const INSIGHT_STATUS_VALUES = [
  "draft",
  "validated",
  "disputed",
  "superseded",
] as const;
export const INSIGHT_CONFIDENCE_VALUES = SOURCE_CONFIDENCE_VALUES;

export type InsightStatus = (typeof INSIGHT_STATUS_VALUES)[number];
export type InsightConfidence = (typeof INSIGHT_CONFIDENCE_VALUES)[number];

export interface InsightFrontmatter {
  id: string;
  title: string;
  status: InsightStatus;
  confidence: InsightConfidence;
  derived_from_sources: string[];
  tags: string[];
  linked_analysis: string[];
  linked_reports: string[];
  created_at: string;
  updated_at: string;
}

export interface InsightEvidenceItem {
  sourceId: string;
  note: string;
}

export interface InsightSections {
  claim: string;
  whyItMatters: string;
  evidence: InsightEvidenceItem[];
  caveats: string[];
  reuseNotes: string;
}

export interface ParsedInsightDocument {
  frontmatter: InsightFrontmatter;
  sections: InsightSections;
}
