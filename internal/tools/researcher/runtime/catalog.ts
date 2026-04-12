import type { RuntimeCommandId } from "../contracts/runtime";

import {
  RUNTIME_SOURCE_WRAPPER_PATHS,
  type RuntimePayloadCatalogEntry,
  type RuntimePayloadCatalogKey,
} from "./payload";

export interface RuntimeCommandCatalogEntry {
  id: RuntimeCommandId;
  title: string;
  description: string;
  codexSkillName: string;
  claudeCommandName: string;
  wrapperScriptSource: (typeof RUNTIME_SOURCE_WRAPPER_PATHS)[number];
  payloadKeys: RuntimePayloadCatalogKey[];
}

export const RUNTIME_COMMAND_CATALOG: readonly RuntimeCommandCatalogEntry[] = [
  {
    id: "research-new",
    title: "Research New",
    description: "Initialize a bounded Researcher workspace.",
    codexSkillName: "research-new",
    claudeCommandName: "research-new",
    wrapperScriptSource: "scripts/research-init.ts",
    payloadKeys: [
      "core:researcher",
      "schemas:researcher",
      "template:research-brief",
      "wrapper:research-init",
    ],
  },
  {
    id: "research-harvest",
    title: "Research Harvest",
    description: "Add external sources to a research and persist provenance.",
    codexSkillName: "research-harvest",
    claudeCommandName: "research-harvest",
    wrapperScriptSource: "scripts/research-source-add.ts",
    payloadKeys: [
      "core:researcher",
      "schemas:researcher",
      "wrapper:research-source-add",
    ],
  },
  {
    id: "research-refresh",
    title: "Research Refresh",
    description: "Refresh tracked sources and propagate freshness impact.",
    codexSkillName: "research-refresh",
    claudeCommandName: "research-refresh",
    wrapperScriptSource: "scripts/research-source-refresh.ts",
    payloadKeys: [
      "core:researcher",
      "schemas:researcher",
      "wrapper:research-source-refresh",
    ],
  },
  {
    id: "research-insight",
    title: "Research Insight",
    description: "Promote sourced evidence into reusable insight artifacts.",
    codexSkillName: "research-insight",
    claudeCommandName: "research-insight",
    wrapperScriptSource: "scripts/research-insight.ts",
    payloadKeys: ["core:researcher", "schemas:researcher", "wrapper:research-insight"],
  },
  {
    id: "research-analyze",
    title: "Research Analyze",
    description: "Build analysis artifacts from an insight subset.",
    codexSkillName: "research-analyze",
    claudeCommandName: "research-analyze",
    wrapperScriptSource: "scripts/research-analysis.ts",
    payloadKeys: ["core:researcher", "schemas:researcher", "wrapper:research-analysis"],
  },
  {
    id: "research-report",
    title: "Research Report",
    description: "Compile a report from existing analysis and insights.",
    codexSkillName: "research-report",
    claudeCommandName: "research-report",
    wrapperScriptSource: "scripts/research-report.ts",
    payloadKeys: ["core:researcher", "schemas:researcher", "wrapper:research-report"],
  },
  {
    id: "research-status",
    title: "Research Status",
    description: "Inspect debt, freshness, and the next recommended action.",
    codexSkillName: "research-status",
    claudeCommandName: "research-status",
    wrapperScriptSource: "scripts/research-status.ts",
    payloadKeys: ["core:researcher", "schemas:researcher", "wrapper:research-status"],
  },
  {
    id: "research-resume",
    title: "Research Resume",
    description: "Recover a research session from durable on-disk state.",
    codexSkillName: "research-resume",
    claudeCommandName: "research-resume",
    wrapperScriptSource: "scripts/research-resume.ts",
    payloadKeys: ["core:researcher", "schemas:researcher", "wrapper:research-resume"],
  },
] as const;

export function validateRuntimeCatalogIntegrity(
  commandCatalog: readonly RuntimeCommandCatalogEntry[],
  payloadCatalog: readonly RuntimePayloadCatalogEntry[],
): readonly RuntimeCommandCatalogEntry[] {
  const payloadKeys = new Set(payloadCatalog.map((entry) => entry.key));
  const knownWrappers = new Set<string>(RUNTIME_SOURCE_WRAPPER_PATHS);
  const commandIds = new Set<string>();

  for (const commandEntry of commandCatalog) {
    if (commandIds.has(commandEntry.id)) {
      throw new Error(`Duplicate runtime command id: ${commandEntry.id}`);
    }

    commandIds.add(commandEntry.id);

    if (!knownWrappers.has(commandEntry.wrapperScriptSource)) {
      throw new Error(
        `Runtime command ${commandEntry.id} references an unknown wrapper: ${commandEntry.wrapperScriptSource}`,
      );
    }

    if (commandEntry.payloadKeys.length === 0) {
      throw new Error(`Runtime command ${commandEntry.id} must declare at least one payload key`);
    }

    for (const payloadKey of commandEntry.payloadKeys) {
      if (!payloadKeys.has(payloadKey)) {
        throw new Error(
          `Runtime command ${commandEntry.id} references an unknown payload key: ${payloadKey}`,
        );
      }
    }
  }

  return commandCatalog;
}
