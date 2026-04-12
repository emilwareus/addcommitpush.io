export const RUNTIME_INSTALL_CONTRACT_VERSION = "1.0";
export const RESEARCHER_RUNTIME_MANAGED_ROOT = ".researcher-runtime";
export const RUNTIME_INSTALL_MANIFEST_FILE = "install-manifest.json";

export const RUNTIME_TARGET_VALUES = ["codex", "claude"] as const;
export const RUNTIME_COMMAND_ID_VALUES = [
  "research-new",
  "research-harvest",
  "research-refresh",
  "research-insight",
  "research-analyze",
  "research-report",
  "research-status",
  "research-resume",
  "research-update",
  "research-inspect",
] as const;
export const RUNTIME_MANAGED_ASSET_KIND_VALUES = [
  "codex-skill",
  "claude-command",
  "runtime-entry",
  "runtime-core",
  "runtime-schema",
  "runtime-template",
  "runtime-settings",
  "runtime-package",
  "runtime-manifest",
  "runtime-hook",
] as const;

export type RuntimeTarget = (typeof RUNTIME_TARGET_VALUES)[number];
export type RuntimeCommandId = (typeof RUNTIME_COMMAND_ID_VALUES)[number];
export type RuntimeManagedAssetKind = (typeof RUNTIME_MANAGED_ASSET_KIND_VALUES)[number];

export interface RuntimeSourceIdentity {
  version: string;
  source_root: string;
}

export interface RuntimeInstallRequest {
  runtime: RuntimeTarget;
  target_root: string;
  managed_root: string;
  source_identity: RuntimeSourceIdentity;
  include_optional_hooks: boolean;
}

export interface RuntimeInstalledCommandRecord {
  id: RuntimeCommandId;
  installed_path: string;
  wrapper_script_path: string;
  payload_keys: string[];
}

export interface RuntimeManagedAssetRecord {
  runtime: RuntimeTarget;
  kind: RuntimeManagedAssetKind;
  path: string;
  source_path: string;
  generated_by: string;
  content_hash: string;
  command_ids: RuntimeCommandId[];
}

export interface RuntimeSettingsMergeRecord {
  path: string;
  owned_keys: string[];
  updated_at: string;
}

export interface RuntimeInstallManifest {
  contract_version: typeof RUNTIME_INSTALL_CONTRACT_VERSION;
  runtime: RuntimeTarget;
  managed_root: string;
  generated_at: string;
  source_identity: RuntimeSourceIdentity;
  commands: RuntimeInstalledCommandRecord[];
  managed_assets: RuntimeManagedAssetRecord[];
  settings_merges: RuntimeSettingsMergeRecord[];
}

export function buildRuntimeInstallManifestPath(
  managedRoot = RESEARCHER_RUNTIME_MANAGED_ROOT,
): string {
  return `${normalizeRuntimeRelativePath(managedRoot)}/${RUNTIME_INSTALL_MANIFEST_FILE}`;
}

export function normalizeRuntimeRelativePath(relativePath: string): string {
  const normalizedPath = relativePath.trim().replace(/\\/g, "/").replace(/\/+/g, "/");

  if (normalizedPath.length === 0) {
    throw new Error("Runtime relative paths are required");
  }

  if (normalizedPath.startsWith("/")) {
    throw new Error("Runtime relative paths must not be absolute");
  }

  if (normalizedPath.split("/").includes("..")) {
    throw new Error("Runtime relative paths must stay inside the managed root");
  }

  return normalizedPath;
}

export function sortRuntimeCommandIds(commandIds: readonly RuntimeCommandId[]): RuntimeCommandId[] {
  return [...new Set(commandIds)].sort();
}

export function normalizeRuntimeInstalledCommandRecord(
  record: RuntimeInstalledCommandRecord,
): RuntimeInstalledCommandRecord {
  return {
    ...record,
    installed_path: normalizeRuntimeRelativePath(record.installed_path),
    wrapper_script_path: normalizeRuntimeRelativePath(record.wrapper_script_path),
    payload_keys: [...new Set(record.payload_keys)].sort(),
  };
}

export function normalizeRuntimeManagedAssetRecord(
  record: RuntimeManagedAssetRecord,
): RuntimeManagedAssetRecord {
  return {
    ...record,
    path: normalizeRuntimeRelativePath(record.path),
    command_ids: sortRuntimeCommandIds(record.command_ids),
  };
}

export function normalizeRuntimeSettingsMergeRecord(
  record: RuntimeSettingsMergeRecord,
): RuntimeSettingsMergeRecord {
  return {
    ...record,
    path: normalizeRuntimeRelativePath(record.path),
    owned_keys: [...new Set(record.owned_keys)].sort(),
  };
}

export function normalizeRuntimeInstallManifest(
  manifest: RuntimeInstallManifest,
): RuntimeInstallManifest {
  return {
    ...manifest,
    managed_root: normalizeRuntimeRelativePath(manifest.managed_root),
    commands: manifest.commands
      .map(normalizeRuntimeInstalledCommandRecord)
      .sort((left, right) => left.id.localeCompare(right.id)),
    managed_assets: manifest.managed_assets
      .map(normalizeRuntimeManagedAssetRecord)
      .sort((left, right) => left.path.localeCompare(right.path)),
    settings_merges: manifest.settings_merges
      .map(normalizeRuntimeSettingsMergeRecord)
      .sort((left, right) => left.path.localeCompare(right.path)),
  };
}
