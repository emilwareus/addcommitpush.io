import { ANALYSIS_STATUS_VALUES } from "./analysis";

export const REPORT_STATUS_VALUES = ANALYSIS_STATUS_VALUES;

export type ReportStatus = (typeof REPORT_STATUS_VALUES)[number];

export interface ReportFrontmatter {
  id: string;
  title: string;
  audience: string;
  angle: string;
  thesis: string;
  status: ReportStatus;
  derived_from_analysis: string[];
  derived_from_insights: string[];
  fresh_as_of: string;
  created_at: string;
  updated_at: string;
}

export interface ReportSections {
  summary: string;
  keyPoints: string[];
  body: string;
  limitations: string[];
  analysisInputs: string[];
  insightReferences: string[];
  sourceReferences: string[];
}

export interface ParsedReportDocument {
  frontmatter: ReportFrontmatter;
  sections: ReportSections;
}
