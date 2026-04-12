import {
  RESEARCHER_RUNTIME_MANAGED_ROOT,
  normalizeRuntimeRelativePath,
  type RuntimeCommandId,
  type RuntimeManagedAssetKind,
} from "../contracts/runtime";

import type { RuntimeCommandCatalogEntry } from "./catalog";

export interface RenderedRuntimeAsset {
  path: string;
  content: string;
  kind: RuntimeManagedAssetKind;
  sourcePath: string;
  commandIds: RuntimeCommandId[];
}

export function buildInstalledRuntimeEntrypointPath(
  commandId: RuntimeCommandId,
  managedRoot = RESEARCHER_RUNTIME_MANAGED_ROOT,
): string {
  return `${normalizeRuntimeRelativePath(managedRoot)}/bin/${commandId}.js`;
}

export function renderCodexSkillContent(
  commandEntry: RuntimeCommandCatalogEntry,
  managedRoot = RESEARCHER_RUNTIME_MANAGED_ROOT,
): string {
  const entrypointPath = buildInstalledRuntimeEntrypointPath(commandEntry.id, managedRoot);

  return `---
name: "${commandEntry.codexSkillName}"
description: "${commandEntry.description}"
metadata:
  short-description: "${commandEntry.description}"
---

<objective>
Run the installed Researcher command \`${commandEntry.id}\` from this project.
</objective>

<usage>
Execute:
\`node ${entrypointPath} {{ARGS}}\`
</usage>

<notes>
- This skill is generated from the shared Researcher runtime catalog.
- The installed runtime lives under \`${normalizeRuntimeRelativePath(managedRoot)}\`.
</notes>
`;
}

export function renderClaudeCommandContent(
  commandEntry: RuntimeCommandCatalogEntry,
  managedRoot = RESEARCHER_RUNTIME_MANAGED_ROOT,
): string {
  const entrypointPath = buildInstalledRuntimeEntrypointPath(commandEntry.id, managedRoot);

  return `# ${commandEntry.title}

Run the installed Researcher command \`${commandEntry.id}\` from this project.

Execute:

\`\`\`bash
node ${entrypointPath} "$ARGUMENTS"
\`\`\`

This command file is generated from the shared Researcher runtime catalog.
`;
}
