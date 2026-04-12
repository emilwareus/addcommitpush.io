import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  RESEARCHER_RUNTIME_MANAGED_ROOT,
  buildRuntimeInstallManifestPath,
  type RuntimeInstallManifest,
  type RuntimeManagedAssetRecord,
  type RuntimeSettingsMergeRecord,
  type RuntimeTarget,
} from "../contracts/runtime";

import {
  computeRuntimePathDigest,
  pathExists,
  readRuntimeInstallManifest,
} from "./install";
import { createClaudeSettingsPatch } from "./settings";

export type RuntimeManagedAssetStatus = "healthy" | "missing" | "drifted";
export type RuntimeSettingsMergeStatus = "healthy" | "missing" | "drifted";

export interface InspectResearcherRuntimeInput {
  targetProjectRoot: string;
  managedRoot?: string;
}

export interface RuntimeManagedAssetInspection {
  path: string;
  kind: RuntimeManagedAssetRecord["kind"];
  commandIds: RuntimeManagedAssetRecord["command_ids"];
  expectedHash: string;
  actualHash: string | null;
  status: RuntimeManagedAssetStatus;
}

export interface RuntimeSettingsMergeInspection {
  path: string;
  ownedKeys: string[];
  updatedAt: string;
  status: RuntimeSettingsMergeStatus;
  missingKeys: string[];
  driftedKeys: string[];
}

export interface InspectResearcherRuntimeResult {
  installed: boolean;
  runtime: RuntimeTarget | null;
  managedRoot: string;
  manifestPath: string;
  manifest: RuntimeInstallManifest | null;
  managedAssets: RuntimeManagedAssetInspection[];
  settingsMerges: RuntimeSettingsMergeInspection[];
  missingAssets: string[];
  driftedAssets: string[];
  driftedSettings: string[];
  summary: {
    status: "not-installed" | "healthy" | "drifted";
    managedAssetCount: number;
    healthyAssetCount: number;
    missingAssetCount: number;
    driftedAssetCount: number;
    settingsMergeCount: number;
    driftedSettingsCount: number;
  };
  nextAction: "research-install" | "research-update" | "none";
}

export async function inspectResearcherRuntimeInstallation(
  input: InspectResearcherRuntimeInput,
): Promise<InspectResearcherRuntimeResult> {
  const targetProjectRoot = resolve(input.targetProjectRoot);
  const managedRoot = input.managedRoot ?? RESEARCHER_RUNTIME_MANAGED_ROOT;
  const manifestPath = join(targetProjectRoot, buildRuntimeInstallManifestPath(managedRoot));

  if (!(await pathExists(manifestPath))) {
    return {
      installed: false,
      runtime: null,
      managedRoot,
      manifestPath,
      manifest: null,
      managedAssets: [],
      settingsMerges: [],
      missingAssets: [],
      driftedAssets: [],
      driftedSettings: [],
      summary: {
        status: "not-installed",
        managedAssetCount: 0,
        healthyAssetCount: 0,
        missingAssetCount: 0,
        driftedAssetCount: 0,
        settingsMergeCount: 0,
        driftedSettingsCount: 0,
      },
      nextAction: "research-install",
    };
  }

  const manifest = await readRuntimeInstallManifest(targetProjectRoot, managedRoot);
  const managedAssets = await inspectManagedAssets(targetProjectRoot, manifest.managed_assets);
  const settingsMerges = await inspectSettingsMerges(
    targetProjectRoot,
    managedRoot,
    manifest.settings_merges,
  );
  const missingAssets = managedAssets
    .filter((asset) => asset.status === "missing")
    .map((asset) => asset.path);
  const driftedAssets = managedAssets
    .filter((asset) => asset.status === "drifted")
    .map((asset) => asset.path);
  const driftedSettings = settingsMerges
    .filter((record) => record.status !== "healthy")
    .map((record) => record.path);
  const hasDrift = missingAssets.length > 0 || driftedAssets.length > 0 || driftedSettings.length > 0;

  return {
    installed: true,
    runtime: manifest.runtime,
    managedRoot,
    manifestPath,
    manifest,
    managedAssets,
    settingsMerges,
    missingAssets,
    driftedAssets,
    driftedSettings,
    summary: {
      status: hasDrift ? "drifted" : "healthy",
      managedAssetCount: managedAssets.length,
      healthyAssetCount: managedAssets.filter((asset) => asset.status === "healthy").length,
      missingAssetCount: missingAssets.length,
      driftedAssetCount: driftedAssets.length,
      settingsMergeCount: settingsMerges.length,
      driftedSettingsCount: driftedSettings.length,
    },
    nextAction: hasDrift ? "research-update" : "none",
  };
}

async function inspectManagedAssets(
  targetProjectRoot: string,
  managedAssets: readonly RuntimeManagedAssetRecord[],
): Promise<RuntimeManagedAssetInspection[]> {
  const inspections: RuntimeManagedAssetInspection[] = [];

  for (const managedAsset of managedAssets) {
    const absolutePath = join(targetProjectRoot, managedAsset.path);

    if (!(await pathExists(absolutePath))) {
      inspections.push({
        path: managedAsset.path,
        kind: managedAsset.kind,
        commandIds: managedAsset.command_ids,
        expectedHash: managedAsset.content_hash,
        actualHash: null,
        status: "missing",
      });
      continue;
    }

    const actualHash = await computeRuntimePathDigest(absolutePath);

    inspections.push({
      path: managedAsset.path,
      kind: managedAsset.kind,
      commandIds: managedAsset.command_ids,
      expectedHash: managedAsset.content_hash,
      actualHash,
      status: actualHash === managedAsset.content_hash ? "healthy" : "drifted",
    });
  }

  return inspections.sort((left, right) => left.path.localeCompare(right.path));
}

async function inspectSettingsMerges(
  targetProjectRoot: string,
  managedRoot: string,
  settingsMerges: readonly RuntimeSettingsMergeRecord[],
): Promise<RuntimeSettingsMergeInspection[]> {
  const inspections: RuntimeSettingsMergeInspection[] = [];

  for (const settingsMerge of settingsMerges) {
    const absolutePath = join(targetProjectRoot, settingsMerge.path);

    if (!(await pathExists(absolutePath))) {
      inspections.push({
        path: settingsMerge.path,
        ownedKeys: settingsMerge.owned_keys,
        updatedAt: settingsMerge.updated_at,
        status: "missing",
        missingKeys: [...settingsMerge.owned_keys],
        driftedKeys: [],
      });
      continue;
    }

    let document: unknown;

    try {
      document = JSON.parse(await readFile(absolutePath, "utf8")) as unknown;
    } catch {
      inspections.push({
        path: settingsMerge.path,
        ownedKeys: settingsMerge.owned_keys,
        updatedAt: settingsMerge.updated_at,
        status: "drifted",
        missingKeys: [],
        driftedKeys: [...settingsMerge.owned_keys],
      });
      continue;
    }

    if (!isJsonObject(document)) {
      inspections.push({
        path: settingsMerge.path,
        ownedKeys: settingsMerge.owned_keys,
        updatedAt: settingsMerge.updated_at,
        status: "drifted",
        missingKeys: [],
        driftedKeys: [...settingsMerge.owned_keys],
      });
      continue;
    }

    const expectedValues =
      settingsMerge.path === ".claude/settings.local.json"
        ? {
            "researcher.runtimeRoot": createClaudeSettingsPatch(managedRoot).researcher.runtimeRoot,
            "researcher.commands": createClaudeSettingsPatch(managedRoot).researcher.commands,
          }
        : {};
    const missingKeys: string[] = [];
    const driftedKeys: string[] = [];

    for (const ownedKey of settingsMerge.owned_keys) {
      const currentValue = readJsonValue(document, ownedKey);

      if (currentValue === undefined) {
        missingKeys.push(ownedKey);
        continue;
      }

      if (ownedKey in expectedValues) {
        const expectedValue =
          expectedValues[ownedKey as keyof typeof expectedValues];

        if (JSON.stringify(currentValue) !== JSON.stringify(expectedValue)) {
          driftedKeys.push(ownedKey);
        }
      }
    }

    inspections.push({
      path: settingsMerge.path,
      ownedKeys: settingsMerge.owned_keys,
      updatedAt: settingsMerge.updated_at,
      status:
        missingKeys.length === 0 && driftedKeys.length === 0 ? "healthy" : "drifted",
      missingKeys,
      driftedKeys,
    });
  }

  return inspections.sort((left, right) => left.path.localeCompare(right.path));
}

function readJsonValue(input: Record<string, unknown>, dottedPath: string): unknown {
  const pathSegments = dottedPath.split(".");
  let cursor: unknown = input;

  for (const pathSegment of pathSegments) {
    if (!isJsonObject(cursor) || !(pathSegment in cursor)) {
      return undefined;
    }

    cursor = cursor[pathSegment];
  }

  return cursor;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
