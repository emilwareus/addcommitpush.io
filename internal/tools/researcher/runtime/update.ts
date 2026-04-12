import { RESEARCHER_RUNTIME_MANAGED_ROOT } from "../contracts/runtime";

import {
  materializeRuntimeInstallation,
  type InstallResearcherRuntimeInput,
  type InstallResearcherRuntimeResult,
} from "./install";
import { inspectResearcherRuntimeInstallation } from "./inspect";

export interface UpdateResearcherRuntimeResult {
  status: "updated" | "blocked";
  runtime: InstallResearcherRuntimeResult["runtime"];
  managedRoot: string;
  manifestPath: string;
  sourceIdentity: InstallResearcherRuntimeResult["sourceIdentity"] | null;
  commands: InstallResearcherRuntimeResult["commands"];
  managedAssets: InstallResearcherRuntimeResult["managedAssets"];
  settingsMerges: InstallResearcherRuntimeResult["settingsMerges"];
  driftedAssets: string[];
  missingAssets: string[];
  driftedSettings: string[];
}

export async function updateResearcherRuntime(
  input: InstallResearcherRuntimeInput,
): Promise<UpdateResearcherRuntimeResult> {
  const managedRoot = input.managedRoot ?? RESEARCHER_RUNTIME_MANAGED_ROOT;
  const inspection = await inspectResearcherRuntimeInstallation({
    targetProjectRoot: input.targetProjectRoot,
    managedRoot,
  });

  if (!inspection.installed || !inspection.manifest) {
    throw new Error(`Researcher runtime is not installed at ${managedRoot}`);
  }

  if (inspection.runtime !== input.runtime) {
    throw new Error(
      `Installed runtime is ${inspection.runtime}; update requested ${input.runtime}`,
    );
  }

  if (
    inspection.driftedAssets.length > 0 ||
    inspection.missingAssets.length > 0 ||
    inspection.driftedSettings.length > 0
  ) {
    return {
      status: "blocked",
      runtime: inspection.manifest.runtime,
      managedRoot,
      manifestPath: inspection.manifestPath,
      sourceIdentity: inspection.manifest.source_identity,
      commands: inspection.manifest.commands,
      managedAssets: inspection.manifest.managed_assets,
      settingsMerges: inspection.manifest.settings_merges,
      driftedAssets: inspection.driftedAssets,
      missingAssets: inspection.missingAssets,
      driftedSettings: inspection.driftedSettings,
    };
  }

  const installResult = await materializeRuntimeInstallation({
    ...input,
    mode: "update",
  });

  return {
    status: "updated",
    runtime: installResult.runtime,
    managedRoot: installResult.managedRoot,
    manifestPath: installResult.manifestPath,
    sourceIdentity: installResult.sourceIdentity,
    commands: installResult.commands,
    managedAssets: installResult.managedAssets,
    settingsMerges: installResult.settingsMerges,
    driftedAssets: [],
    missingAssets: [],
    driftedSettings: [],
  };
}
