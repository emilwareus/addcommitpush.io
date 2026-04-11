import { SOURCE_CONFIDENCE_VALUES } from "./sources";

export const ANALYSIS_STATUS_VALUES = [
  "draft",
  "validated",
  "disputed",
  "superseded",
] as const;
export const ANALYSIS_CONFIDENCE_VALUES = SOURCE_CONFIDENCE_VALUES;

export type AnalysisStatus = (typeof ANALYSIS_STATUS_VALUES)[number];
export type AnalysisConfidence = (typeof ANALYSIS_CONFIDENCE_VALUES)[number];

export interface AnalysisFrontmatter {
  id: string;
  title: string;
  status: AnalysisStatus;
  confidence: AnalysisConfidence;
  derived_from_insights: string[];
  tags: string[];
  linked_reports: string[];
  transitional_scaffold: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnalysisSections {
  question: string;
  synthesis: string;
  contradictions: string[];
  caveats: string[];
  openQuestions: string[];
  nextMoves: string[];
}

export interface ParsedAnalysisDocument {
  frontmatter: AnalysisFrontmatter;
  sections: AnalysisSections;
}
