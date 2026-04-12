import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, test } from "vitest";

import { installResearcherRuntime, readRuntimeInstallManifest } from "../runtime/install";
import { updateResearcherRuntime } from "../runtime/update";
import { createTemporaryWorkspace } from "./test-helpers";

const execFileAsync = promisify(execFile);
const sourceProjectRoot = process.cwd();

describe("phase 6 runtime install lifecycle", () => {
  const cleanupTasks: Array<() => Promise<void>> = [];

  afterEach(async () => {
    await Promise.all(cleanupTasks.splice(0).map((cleanup) => cleanup()));
  });

  test("installs a self-contained codex runtime and executes inside a clean target", async () => {
    const workspace = await createTemporaryWorkspace("researcher-install-codex-");
    cleanupTasks.push(workspace.cleanup);
    const targetProjectRoot = workspace.rootDir;

    await seedTargetProject(targetProjectRoot, "commonjs");

    const installResult = await installResearcherRuntime({
      sourceProjectRoot,
      targetProjectRoot,
      runtime: "codex",
    });
    const manifest = await readRuntimeInstallManifest(targetProjectRoot);

    expect(installResult.status).toBe("installed");
    expect(manifest.runtime).toBe("codex");
    expect(manifest.commands).toHaveLength(8);
    expect(
      manifest.commands.find((command) => command.id === "research-new")?.payload_keys,
    ).toEqual([
      "core:researcher",
      "schemas:researcher",
      "template:research-brief",
      "wrapper:research-init",
    ]);
    expect(manifest.managed_assets.map((asset) => asset.path)).toContain(
      ".researcher-runtime/researcher/schemas",
    );
    expect(manifest.managed_assets.map((asset) => asset.path)).toContain(
      ".codex/skills/research-new/SKILL.md",
    );

    const inspectOutput = await execInstalledInspect(targetProjectRoot);

    expect(inspectOutput.installed).toBe(true);
    expect(inspectOutput.summary.status).toBe("healthy");
    expect(inspectOutput.runtime).toBe("codex");
  });

  test("installs claude runtime assets plus managed settings state", async () => {
    const workspace = await createTemporaryWorkspace("researcher-install-claude-");
    cleanupTasks.push(workspace.cleanup);
    const targetProjectRoot = workspace.rootDir;

    await seedTargetProject(targetProjectRoot, "commonjs");

    await installResearcherRuntime({
      sourceProjectRoot,
      targetProjectRoot,
      runtime: "claude",
    });

    const manifest = await readRuntimeInstallManifest(targetProjectRoot);
    const settingsDocument = JSON.parse(
      await readFile(join(targetProjectRoot, ".claude", "settings.local.json"), "utf8"),
    ) as { researcher?: { commands?: string[]; runtimeRoot?: string } };

    expect(manifest.runtime).toBe("claude");
    expect(manifest.managed_assets.map((asset) => asset.path)).toContain(
      ".claude/commands/research-report.md",
    );
    expect(settingsDocument.researcher?.runtimeRoot).toBe(".researcher-runtime");
    expect(settingsDocument.researcher?.commands).toContain("research-status");
  });

  test("updates managed assets while preserving unmanaged project files", async () => {
    const workspace = await createTemporaryWorkspace("researcher-update-clean-");
    cleanupTasks.push(workspace.cleanup);
    const targetProjectRoot = workspace.rootDir;

    await seedTargetProject(targetProjectRoot, "commonjs");

    await installResearcherRuntime({
      sourceProjectRoot,
      targetProjectRoot,
      runtime: "codex",
    });

    const unmanagedFilePath = join(targetProjectRoot, "notes.txt");
    await writeFile(unmanagedFilePath, "leave me alone\n", "utf8");

    const updateResult = await updateResearcherRuntime({
      sourceProjectRoot,
      targetProjectRoot,
      runtime: "codex",
    });

    expect(updateResult.status).toBe("updated");
    expect(await readFile(unmanagedFilePath, "utf8")).toBe("leave me alone\n");
    expect(updateResult.driftedAssets).toEqual([]);
    expect(updateResult.missingAssets).toEqual([]);
  });

  test("surfaces drift instead of clobbering edited managed files", async () => {
    const workspace = await createTemporaryWorkspace("researcher-update-drift-");
    cleanupTasks.push(workspace.cleanup);
    const targetProjectRoot = workspace.rootDir;

    await seedTargetProject(targetProjectRoot, "commonjs");

    await installResearcherRuntime({
      sourceProjectRoot,
      targetProjectRoot,
      runtime: "claude",
    });

    const managedFilePath = join(targetProjectRoot, ".claude", "commands", "research-new.md");
    await writeFile(managedFilePath, "user edited\n", "utf8");

    const updateResult = await updateResearcherRuntime({
      sourceProjectRoot,
      targetProjectRoot,
      runtime: "claude",
    });

    expect(updateResult.status).toBe("blocked");
    expect(updateResult.driftedAssets).toContain(".claude/commands/research-new.md");
    expect(await readFile(managedFilePath, "utf8")).toBe("user edited\n");
  });
});

async function seedTargetProject(
  targetProjectRoot: string,
  packageType: "commonjs" | "module",
): Promise<void> {
  await mkdir(targetProjectRoot, { recursive: true });
  await writeFile(
    join(targetProjectRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "fixture-project",
        private: true,
        type: packageType,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function execInstalledInspect(targetProjectRoot: string): Promise<{
  installed: boolean;
  summary: {
    status: string;
  };
  runtime: string | null;
}> {
  const { stdout } = await execFileAsync(process.execPath, [
    join(targetProjectRoot, ".researcher-runtime", "bin", "research-inspect.js"),
    "--target-project-root",
    targetProjectRoot,
  ]);

  return JSON.parse(stdout) as {
    installed: boolean;
    summary: {
      status: string;
    };
    runtime: string | null;
  };
}
