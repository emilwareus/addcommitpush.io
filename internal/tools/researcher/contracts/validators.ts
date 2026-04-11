import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";

import analysisFrontmatterSchema from "../../../../researcher/schemas/analysis-frontmatter.schema.json";
import insightFrontmatterSchema from "../../../../researcher/schemas/insight-frontmatter.schema.json";
import manifestSchema from "../../../../researcher/schemas/manifest.schema.json";
import reportFrontmatterSchema from "../../../../researcher/schemas/report-frontmatter.schema.json";
import sourcesSchema from "../../../../researcher/schemas/sources.schema.json";

import type { AnalysisFrontmatter } from "./analysis";
import type { InsightFrontmatter } from "./insights";
import type { ResearchManifest } from "./manifest";
import type { ReportFrontmatter } from "./reports";
import {
  STATUS_SUMMARY_SCHEMA,
  type StatusSummary,
} from "./status";
import type { SourcesEnvelope } from "./sources";

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
});
addFormats(ajv);

const manifestValidator = ajv.compile<ResearchManifest>(manifestSchema);
const sourcesValidator = ajv.compile<SourcesEnvelope>(sourcesSchema);
const insightFrontmatterValidator = ajv.compile<InsightFrontmatter>(insightFrontmatterSchema);
const analysisFrontmatterValidator = ajv.compile<AnalysisFrontmatter>(
  analysisFrontmatterSchema,
);
const reportFrontmatterValidator = ajv.compile<ReportFrontmatter>(reportFrontmatterSchema);
const statusSummaryValidator = ajv.compile<StatusSummary>(STATUS_SUMMARY_SCHEMA);

export function validateManifest(input: unknown): ResearchManifest {
  return validateDocument(input, manifestValidator, "manifest.json");
}

export function validateSourcesDocument(input: unknown): SourcesEnvelope {
  return validateDocument(input, sourcesValidator, "sources.json");
}

export function validateInsightFrontmatter(input: unknown): InsightFrontmatter {
  return validateDocument(input, insightFrontmatterValidator, "insight frontmatter");
}

export function validateAnalysisFrontmatter(input: unknown): AnalysisFrontmatter {
  return validateDocument(input, analysisFrontmatterValidator, "analysis frontmatter");
}

export function validateReportFrontmatter(input: unknown): ReportFrontmatter {
  return validateDocument(input, reportFrontmatterValidator, "report frontmatter");
}

export function validateStatusSummary(input: unknown): StatusSummary {
  return validateDocument(input, statusSummaryValidator, "status summary");
}

function validateDocument<T>(
  input: unknown,
  validator: ValidateFunction<T>,
  label: string,
): T {
  if (validator(input)) {
    return input;
  }

  throw new Error(`${label} failed schema validation: ${formatAjvErrors(validator.errors)}`);
}

function formatAjvErrors(errors: ErrorObject[] | null | undefined): string {
  if (!errors || errors.length === 0) {
    return "unknown schema error";
  }

  return errors
    .map((error) => {
      const instancePath = error.instancePath || "/";
      return `${instancePath} ${error.message ?? "is invalid"}`.trim();
    })
    .join("; ");
}
