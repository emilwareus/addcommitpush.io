import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import {
  RESEARCHER_RUNTIME_MANAGED_ROOT,
  buildRuntimeInstallManifestPath,
  type RuntimeInstallManifest,
  type RuntimeInstallRequest,
  type RuntimeInstalledCommandRecord,
  type RuntimeManagedAssetRecord,
  type RuntimeSettingsMergeRecord,
  type RuntimeTarget,
} from "../contracts/runtime";
import {
  validateRuntimeInstallManifest,
  validateRuntimeInstallRequest,
} from "../contracts/validators";
import { writeJsonAtomically } from "../fs/write-json-atomically";

import { renderClaudeRuntimeAssets } from "./adapters/claude";
import { renderCodexRuntimeAssets } from "./adapters/codex";
import { buildResearcherRuntime, type BuiltRuntimeAssetDefinition } from "./build";
import { RUNTIME_COMMAND_CATALOG } from "./catalog";
import { createRuntimeInstallManifest } from "./manifest";
import {
  createClaudeSettingsMergeRecord,
  createClaudeSettingsPatch,
  mergeClaudeSettingsDocument,
} from "./settings";
import type { RenderedRuntimeAsset } from "./templates";
import { buildInstalledRuntimeEntrypointPath } from "./templates";

export interface InstallResearcherRuntimeInput {
  sourceProjectRoot: string;
  targetProjectRoot: string;
  runtime: RuntimeTarget;
  managedRoot?: string;
  includeOptionalHooks?: boolean;
}

export interface InstallResearcherRuntimeResult {
  status: "installed";
  runtime: RuntimeTarget;
  managedRoot: string;
  manifestPath: string;
  sourceIdentity: RuntimeInstallManifest["source_identity"];
  commands: RuntimeInstalledCommandRecord[];
  managedAssets: RuntimeManagedAssetRecord[];
  settingsMerges: RuntimeSettingsMergeRecord[];
}

export async function installResearcherRuntime(
  input: InstallResearcherRuntimeInput,
): Promise<InstallResearcherRuntimeResult> {
  return materializeRuntimeInstallation({
    ...input,
    mode: "install",
  });
}

export async function readRuntimeInstallManifest(
  targetProjectRoot: string,
  managedRoot = RESEARCHER_RUNTIME_MANAGED_ROOT,
): Promise<RuntimeInstallManifest> {
  const manifestPath = resolve(targetProjectRoot, buildRuntimeInstallManifestPath(managedRoot));
  const manifestDocument = JSON.parse(await readFile(manifestPath, "utf8")) as unknown;

  return validateRuntimeInstallManifest(manifestDocument);
}

export async function computeRuntimePathDigest(targetPath: string): Promise<string> {
  const targetStats = await stat(targetPath);

  if (targetStats.isDirectory()) {
    return computeDirectoryDigest(targetPath);
  }

  const content = await readFile(targetPath);
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function materializeRuntimeInstallation(
  input: InstallResearcherRuntimeInput & {
    mode: "install" | "update";
  },
): Promise<InstallResearcherRuntimeResult> {
  const request: RuntimeInstallRequest = validateRuntimeInstallRequest({
    runtime: input.runtime,
    target_root: resolve(input.targetProjectRoot),
    managed_root: input.managedRoot ?? RESEARCHER_RUNTIME_MANAGED_ROOT,
    source_identity: {
      version: "pending-build",
      source_root: resolve(input.sourceProjectRoot),
    },
    include_optional_hooks: input.includeOptionalHooks ?? false,
  });
  const buildResult = await buildResearcherRuntime({
    sourceProjectRoot: input.sourceProjectRoot,
  });
  const targetManagedRoot = join(request.target_root, request.managed_root);
  const existingManagedRoot = await pathExists(targetManagedRoot);

  if (input.mode === "install" && existingManagedRoot) {
    throw new Error(`Researcher runtime already exists at ${request.managed_root}`);
  }

  if (input.mode === "update" && !existingManagedRoot) {
    throw new Error(`Researcher runtime is not installed at ${request.managed_root}`);
  }

  await mkdir(request.target_root, { recursive: true });
  await applyBuiltRuntimeAssets(
    buildResult.builtAssets,
    buildResult.outputRoot,
    request.target_root,
    request.managed_root,
  );

  const renderedRuntimeAssets =
    request.runtime === "codex"
      ? renderCodexRuntimeAssets({ managedRoot: request.managed_root })
      : renderClaudeRuntimeAssets({ managedRoot: request.managed_root });
  const generatedBy = input.mode === "install" ? "research-install" : "research-update";
  const writtenRuntimeAssets = await writeRenderedRuntimeAssets(
    request.target_root,
    renderedRuntimeAssets,
    generatedBy,
  );
  const settingsMerges =
    request.runtime === "claude"
      ? await writeClaudeSettingsMerge(request.target_root, request.managed_root)
      : [];
  const builtManagedAssets = await createManagedAssetRecordsFromBuild(
    buildResult.builtAssets,
    request.target_root,
    request.managed_root,
    request.runtime,
    generatedBy,
  );
  const managedAssets = [...builtManagedAssets, ...writtenRuntimeAssets];
  const commands = createInstalledCommandRecords(renderedRuntimeAssets, request.managed_root);
  const manifest = createRuntimeInstallManifest({
    runtime: request.runtime,
    managedRoot: request.managed_root,
    generatedAt: new Date().toISOString(),
    sourceIdentity: buildResult.sourceIdentity,
    commands,
    managedAssets,
    settingsMerges,
  });
  const manifestPath = join(request.target_root, buildRuntimeInstallManifestPath(request.managed_root));

  await mkdir(dirname(manifestPath), { recursive: true });
  await writeJsonAtomically(manifestPath, manifest);

  return {
    status: "installed",
    runtime: request.runtime,
    managedRoot: request.managed_root,
    manifestPath,
    sourceIdentity: buildResult.sourceIdentity,
    commands,
    managedAssets,
    settingsMerges,
  };
}

async function applyBuiltRuntimeAssets(
  builtAssets: readonly BuiltRuntimeAssetDefinition[],
  buildOutputRoot: string,
  targetProjectRoot: string,
  managedRoot: string,
): Promise<void> {
  for (const builtAsset of builtAssets) {
    const sourcePath = join(buildOutputRoot, builtAsset.relativePath);
    const targetPath = join(targetProjectRoot, managedRoot, builtAsset.relativePath);

    await replaceRuntimePath(sourcePath, targetPath);
  }
}

async function createManagedAssetRecordsFromBuild(
  builtAssets: readonly BuiltRuntimeAssetDefinition[],
  targetProjectRoot: string,
  managedRoot: string,
  runtime: RuntimeTarget,
  generatedBy: string,
): Promise<RuntimeManagedAssetRecord[]> {
  const managedAssets: RuntimeManagedAssetRecord[] = [];

  for (const assetDefinition of builtAssets) {
    const relativePath = `${managedRoot}/${assetDefinition.relativePath}`.replace(/\\/g, "/");
    const absolutePath = join(targetProjectRoot, relativePath);

    managedAssets.push({
      runtime,
      kind: assetDefinition.kind,
      path: relativePath,
      source_path: assetDefinition.sourcePath,
      generated_by: generatedBy,
      content_hash: await computeRuntimePathDigest(absolutePath),
      command_ids: assetDefinition.commandIds,
    });
  }

  return managedAssets.sort((left, right) => left.path.localeCompare(right.path));
}

async function writeRenderedRuntimeAssets(
  targetProjectRoot: string,
  renderedAssets: readonly RenderedRuntimeAsset[],
  generatedBy: string,
): Promise<RuntimeManagedAssetRecord[]> {
  const managedAssets: RuntimeManagedAssetRecord[] = [];

  for (const renderedAsset of renderedAssets) {
    const targetPath = join(targetProjectRoot, renderedAsset.path);

    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, renderedAsset.content, "utf8");

    managedAssets.push({
      runtime: renderedAsset.kind === "claude-command" ? "claude" : "codex",
      kind: renderedAsset.kind,
      path: renderedAsset.path,
      source_path: renderedAsset.sourcePath,
      generated_by: generatedBy,
      content_hash: await computeRuntimePathDigest(targetPath),
      command_ids: renderedAsset.commandIds,
    });
  }

  return managedAssets.sort((left, right) => left.path.localeCompare(right.path));
}

function createInstalledCommandRecords(
  renderedAssets: readonly RenderedRuntimeAsset[],
  managedRoot: string,
): RuntimeInstalledCommandRecord[] {
  return renderedAssets
    .map((renderedAsset) => {
      const commandId = renderedAsset.commandIds[0];

      if (!commandId) {
        throw new Error(`Rendered runtime asset ${renderedAsset.path} has no command id`);
      }

      const commandCatalogEntry = RUNTIME_COMMAND_CATALOG.find((entry) => entry.id === commandId);

      if (!commandCatalogEntry) {
        throw new Error(`Rendered runtime asset ${renderedAsset.path} has an unknown command id`);
      }

      return {
        id: commandId,
        installed_path: renderedAsset.path,
        wrapper_script_path: buildInstalledRuntimeEntrypointPath(commandId, managedRoot),
        payload_keys: [...commandCatalogEntry.payloadKeys],
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

async function writeClaudeSettingsMerge(
  targetProjectRoot: string,
  managedRoot: string,
): Promise<RuntimeSettingsMergeRecord[]> {
  const settingsPath = join(targetProjectRoot, ".claude", "settings.local.json");
  const existingDocument = (await pathExists(settingsPath))
    ? await readFile(settingsPath, "utf8")
    : "{}\n";
  const mergeResult = mergeClaudeSettingsDocument(
    existingDocument,
    createClaudeSettingsPatch(managedRoot),
  );

  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, mergeResult.content, "utf8");

  return [createClaudeSettingsMergeRecord(new Date().toISOString())];
}

async function replaceRuntimePath(sourcePath: string, targetPath: string): Promise<void> {
  await rm(targetPath, { force: true, recursive: true });
  await mkdir(dirname(targetPath), { recursive: true });

  const sourceStats = await stat(sourcePath);

  if (sourceStats.isDirectory()) {
    await cp(sourcePath, targetPath, {
      recursive: true,
      force: true,
      dereference: true,
    });
    return;
  }

  await cp(sourcePath, targetPath, {
    force: true,
    dereference: true,
  });
}

async function computeDirectoryDigest(directoryPath: string): Promise<string> {
  const files: string[] = [];
  const stack = [directoryPath];

  while (stack.length > 0) {
    const currentPath = stack.pop();

    if (!currentPath) {
      continue;
    }

    const currentStats = await stat(currentPath);

    if (currentStats.isDirectory()) {
      const directoryEntries = await readdir(currentPath, { withFileTypes: true });

      for (const directoryEntry of directoryEntries) {
        stack.push(join(currentPath, directoryEntry.name));
      }
    } else {
      files.push(currentPath);
    }
  }

  files.sort();

  const hash = createHash("sha256");

  for (const filePath of files) {
    hash.update(relative(directoryPath, filePath).replace(/\\/g, "/"));
    hash.update(await readFile(filePath));
  }

  return `sha256:${hash.digest("hex")}`;
}
