import {
  RESEARCHER_RUNTIME_MANAGED_ROOT,
  type RuntimeCommandId,
} from "../../contracts/runtime";

import {
  RUNTIME_COMMAND_CATALOG,
  validateRuntimeCatalogIntegrity,
  type RuntimeCommandCatalogEntry,
} from "../catalog";
import { RUNTIME_PAYLOAD_CATALOG } from "../payload";
import { renderCodexSkillContent, type RenderedRuntimeAsset } from "../templates";

export interface RenderCodexRuntimeAssetsInput {
  commandCatalog?: readonly RuntimeCommandCatalogEntry[];
  managedRoot?: string;
}

export function renderCodexRuntimeAssets(
  input: RenderCodexRuntimeAssetsInput = {},
): RenderedRuntimeAsset[] {
  const commandCatalog = validateRuntimeCatalogIntegrity(
    input.commandCatalog ?? RUNTIME_COMMAND_CATALOG,
    RUNTIME_PAYLOAD_CATALOG,
  );
  const managedRoot = input.managedRoot ?? RESEARCHER_RUNTIME_MANAGED_ROOT;

  return commandCatalog.map((commandEntry) =>
    createCodexSkillAsset(commandEntry, managedRoot),
  );
}

function createCodexSkillAsset(
  commandEntry: RuntimeCommandCatalogEntry,
  managedRoot: string,
): RenderedRuntimeAsset {
  return {
    path: `.codex/skills/${commandEntry.codexSkillName}/SKILL.md`,
    content: renderCodexSkillContent(commandEntry, managedRoot),
    kind: "codex-skill",
    sourcePath: "internal/tools/researcher/runtime/adapters/codex.ts",
    commandIds: [commandEntry.id satisfies RuntimeCommandId],
  };
}
