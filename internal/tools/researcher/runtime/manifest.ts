import {
  RUNTIME_INSTALL_CONTRACT_VERSION,
  normalizeRuntimeInstallManifest,
  type RuntimeInstallManifest,
  type RuntimeInstalledCommandRecord,
  type RuntimeManagedAssetRecord,
  type RuntimeSettingsMergeRecord,
  type RuntimeTarget,
} from "../contracts/runtime";
import { validateRuntimeInstallManifest } from "../contracts/validators";

export interface CreateRuntimeInstallManifestInput {
  runtime: RuntimeTarget;
  managedRoot: string;
  generatedAt: string;
  sourceIdentity: RuntimeInstallManifest["source_identity"];
  commands: RuntimeInstalledCommandRecord[];
  managedAssets: RuntimeManagedAssetRecord[];
  settingsMerges?: RuntimeSettingsMergeRecord[];
}

export function createRuntimeInstallManifest(
  input: CreateRuntimeInstallManifestInput,
): RuntimeInstallManifest {
  return validateRuntimeInstallManifest(
    normalizeRuntimeInstallManifest({
      contract_version: RUNTIME_INSTALL_CONTRACT_VERSION,
      runtime: input.runtime,
      managed_root: input.managedRoot,
      generated_at: input.generatedAt,
      source_identity: input.sourceIdentity,
      commands: input.commands,
      managed_assets: input.managedAssets,
      settings_merges: input.settingsMerges ?? [],
    }),
  );
}

export function listManagedAssetPaths(manifest: RuntimeInstallManifest): string[] {
  return manifest.managed_assets.map((asset) => asset.path);
}

export function findInstalledCommand(
  manifest: RuntimeInstallManifest,
  commandId: RuntimeInstalledCommandRecord["id"],
): RuntimeInstalledCommandRecord | undefined {
  return manifest.commands.find((command) => command.id === commandId);
}
