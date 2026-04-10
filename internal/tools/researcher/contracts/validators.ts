import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020";

import manifestSchema from "../../../../researcher/schemas/manifest.schema.json";
import sourcesSchema from "../../../../researcher/schemas/sources.schema.json";

import type { ResearchManifest } from "./manifest";
import type { SourcesEnvelope } from "./sources";

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  validateFormats: false,
});

const manifestValidator = ajv.compile<ResearchManifest>(manifestSchema);
const sourcesValidator = ajv.compile<SourcesEnvelope>(sourcesSchema);

export function validateManifest(input: unknown): ResearchManifest {
  return validateDocument(input, manifestValidator, "manifest.json");
}

export function validateSourcesDocument(input: unknown): SourcesEnvelope {
  return validateDocument(input, sourcesValidator, "sources.json");
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
