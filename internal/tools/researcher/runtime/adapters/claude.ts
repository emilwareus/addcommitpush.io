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
import { renderClaudeCommandContent, type RenderedRuntimeAsset } from "../templates";

export interface RenderClaudeRuntimeAssetsInput {
  commandCatalog?: readonly RuntimeCommandCatalogEntry[];
  managedRoot?: string;
}

export function renderClaudeRuntimeAssets(
  input: RenderClaudeRuntimeAssetsInput = {},
): RenderedRuntimeAsset[] {
  const commandCatalog = validateRuntimeCatalogIntegrity(
    input.commandCatalog ?? RUNTIME_COMMAND_CATALOG,
    RUNTIME_PAYLOAD_CATALOG,
  );
  const managedRoot = input.managedRoot ?? RESEARCHER_RUNTIME_MANAGED_ROOT;

  return commandCatalog.map((commandEntry) =>
    createClaudeCommandAsset(commandEntry, managedRoot),
  );
}

function createClaudeCommandAsset(
  commandEntry: RuntimeCommandCatalogEntry,
  managedRoot: string,
): RenderedRuntimeAsset {
  return {
    path: `.claude/commands/${commandEntry.claudeCommandName}.md`,
    content: renderClaudeCommandContent(commandEntry, managedRoot),
    kind: "claude-command",
    sourcePath: "internal/tools/researcher/runtime/adapters/claude.ts",
    commandIds: [commandEntry.id satisfies RuntimeCommandId],
  };
}
