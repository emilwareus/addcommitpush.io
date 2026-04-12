import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { installResearcherRuntime } from "../runtime/install";
import { inspectResearcherRuntimeInstallation } from "../runtime/inspect";
import { createTemporaryWorkspace } from "./test-helpers";

const sourceProjectRoot = process.cwd();

describe("phase 6 runtime inspect", () => {
  const cleanupTasks: Array<() => Promise<void>> = [];

  afterEach(async () => {
    await Promise.all(cleanupTasks.splice(0).map((cleanup) => cleanup()));
  });

  test("reports healthy installed inventory from the persisted manifest", async () => {
    const workspace = await createTemporaryWorkspace("researcher-inspect-healthy-");
    cleanupTasks.push(workspace.cleanup);
    const targetProjectRoot = workspace.rootDir;

    await writeFile(join(targetProjectRoot, "package.json"), '{ "name": "fixture" }\n', "utf8");
    await installResearcherRuntime({
      sourceProjectRoot,
      targetProjectRoot,
      runtime: "codex",
    });

    const inspection = await inspectResearcherRuntimeInstallation({
      targetProjectRoot,
    });

    expect(inspection.installed).toBe(true);
    expect(inspection.summary.status).toBe("healthy");
    expect(
      inspection.managedAssets.some((asset) => asset.path.endsWith("/researcher/schemas")),
    ).toBe(true);
    expect(
      inspection.managedAssets.some(
        (asset) => asset.path === ".codex/skills/research-status/SKILL.md",
      ),
    ).toBe(true);
  });

  test("reports missing assets and drifted settings from the manifest inventory", async () => {
    const workspace = await createTemporaryWorkspace("researcher-inspect-drift-");
    cleanupTasks.push(workspace.cleanup);
    const targetProjectRoot = workspace.rootDir;

    await writeFile(join(targetProjectRoot, "package.json"), '{ "name": "fixture" }\n', "utf8");
    await installResearcherRuntime({
      sourceProjectRoot,
      targetProjectRoot,
      runtime: "claude",
    });

    await rm(join(targetProjectRoot, ".researcher-runtime", "researcher", "templates"), {
      recursive: true,
      force: true,
    });
    await writeFile(
      join(targetProjectRoot, ".claude", "settings.local.json"),
      JSON.stringify(
        {
          researcher: {
            runtimeRoot: "wrong-root",
            commands: ["research-new"],
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const inspection = await inspectResearcherRuntimeInstallation({
      targetProjectRoot,
    });

    expect(inspection.summary.status).toBe("drifted");
    expect(inspection.missingAssets).toContain(".researcher-runtime/researcher/templates");
    expect(inspection.driftedSettings).toContain(".claude/settings.local.json");
    expect(inspection.settingsMerges[0]?.status).toBe("drifted");
  });

  test("returns a deterministic not-installed summary when no manifest exists", async () => {
    const workspace = await createTemporaryWorkspace("researcher-inspect-empty-");
    cleanupTasks.push(workspace.cleanup);

    const inspection = await inspectResearcherRuntimeInstallation({
      targetProjectRoot: workspace.rootDir,
    });

    expect(inspection.installed).toBe(false);
    expect(inspection.summary.status).toBe("not-installed");
    expect(inspection.nextAction).toBe("research-install");
    expect(inspection.managedAssets).toEqual([]);
  });
});
