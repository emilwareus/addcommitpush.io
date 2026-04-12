export const RUNTIME_SOURCE_WRAPPER_PATHS = [
  "scripts/research-init.ts",
  "scripts/research-source-add.ts",
  "scripts/research-source-refresh.ts",
  "scripts/research-insight.ts",
  "scripts/research-analysis.ts",
  "scripts/research-report.ts",
  "scripts/research-status.ts",
  "scripts/research-resume.ts",
  "scripts/research-update.ts",
  "scripts/research-inspect.ts",
] as const;

export type RuntimePayloadCatalogKey =
  | "core:researcher"
  | "schemas:researcher"
  | "template:research-brief"
  | "wrapper:research-init"
  | "wrapper:research-source-add"
  | "wrapper:research-source-refresh"
  | "wrapper:research-insight"
  | "wrapper:research-analysis"
  | "wrapper:research-report"
  | "wrapper:research-status"
  | "wrapper:research-resume"
  | "wrapper:research-update"
  | "wrapper:research-inspect";

export type RuntimePayloadCatalogKind =
  | "source-tree"
  | "schema-directory"
  | "template-file"
  | "script-source";

export interface RuntimePayloadCatalogEntry {
  key: RuntimePayloadCatalogKey;
  kind: RuntimePayloadCatalogKind;
  sourcePath: string;
  description: string;
}

export const RUNTIME_PAYLOAD_CATALOG: readonly RuntimePayloadCatalogEntry[] = [
  {
    key: "core:researcher",
    kind: "source-tree",
    sourcePath: "internal/tools/researcher",
    description: "Shared deterministic Researcher core and filesystem services.",
  },
  {
    key: "schemas:researcher",
    kind: "schema-directory",
    sourcePath: "researcher/schemas",
    description: "Runtime-loaded JSON schemas used by validator entrypoints.",
  },
  {
    key: "template:research-brief",
    kind: "template-file",
    sourcePath: "researcher/templates/RESEARCH.md",
    description: "Seed brief template required by research initialization.",
  },
  {
    key: "wrapper:research-init",
    kind: "script-source",
    sourcePath: "scripts/research-init.ts",
    description: "Thin runtime wrapper for creating a new research workspace.",
  },
  {
    key: "wrapper:research-source-add",
    kind: "script-source",
    sourcePath: "scripts/research-source-add.ts",
    description: "Thin runtime wrapper for adding sources to a research.",
  },
  {
    key: "wrapper:research-source-refresh",
    kind: "script-source",
    sourcePath: "scripts/research-source-refresh.ts",
    description: "Thin runtime wrapper for refreshing tracked sources.",
  },
  {
    key: "wrapper:research-insight",
    kind: "script-source",
    sourcePath: "scripts/research-insight.ts",
    description: "Thin runtime wrapper for promoting insights.",
  },
  {
    key: "wrapper:research-analysis",
    kind: "script-source",
    sourcePath: "scripts/research-analysis.ts",
    description: "Thin runtime wrapper for analysis generation.",
  },
  {
    key: "wrapper:research-report",
    kind: "script-source",
    sourcePath: "scripts/research-report.ts",
    description: "Thin runtime wrapper for report generation.",
  },
  {
    key: "wrapper:research-status",
    kind: "script-source",
    sourcePath: "scripts/research-status.ts",
    description: "Thin runtime wrapper for status routing and inspection.",
  },
  {
    key: "wrapper:research-resume",
    kind: "script-source",
    sourcePath: "scripts/research-resume.ts",
    description: "Thin runtime wrapper for disk-only resume flows.",
  },
  {
    key: "wrapper:research-update",
    kind: "script-source",
    sourcePath: "scripts/research-update.ts",
    description: "Thin runtime wrapper for updating an installed runtime payload.",
  },
  {
    key: "wrapper:research-inspect",
    kind: "script-source",
    sourcePath: "scripts/research-inspect.ts",
    description: "Thin runtime wrapper for inspecting installed runtime state.",
  },
] as const;

export function getRuntimePayloadCatalogEntry(
  key: RuntimePayloadCatalogKey,
): RuntimePayloadCatalogEntry {
  const payloadEntry = RUNTIME_PAYLOAD_CATALOG.find((entry) => entry.key === key);

  if (!payloadEntry) {
    throw new Error(`Unknown runtime payload key: ${key}`);
  }

  return payloadEntry;
}

export function resolveRuntimePayloadEntries(
  keys: readonly RuntimePayloadCatalogKey[],
): RuntimePayloadCatalogEntry[] {
  return [...new Set(keys)]
    .sort()
    .map((key) => getRuntimePayloadCatalogEntry(key));
}
