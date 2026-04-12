import { describe, expect, test } from "vitest";

import { renderClaudeRuntimeAssets } from "../runtime/adapters/claude";
import { renderCodexRuntimeAssets } from "../runtime/adapters/codex";
import { RUNTIME_COMMAND_CATALOG } from "../runtime/catalog";
import {
  createClaudeSettingsMergeRecord,
  createOptionalClaudeHookRecords,
  mergeClaudeSettingsDocument,
} from "../runtime/settings";
import { buildInstalledRuntimeEntrypointPath } from "../runtime/templates";

describe("phase 6 runtime adapters", () => {
  test("renders deterministic codex skills from the shared command catalog", () => {
    const assets = renderCodexRuntimeAssets();

    expect(assets).toHaveLength(RUNTIME_COMMAND_CATALOG.length);
    expect(assets[0]).toMatchObject({
      path: `.codex/skills/${RUNTIME_COMMAND_CATALOG[0]?.codexSkillName}/SKILL.md`,
      kind: "codex-skill",
    });
    expect(assets[0]?.content).toContain(
      `node ${buildInstalledRuntimeEntrypointPath(RUNTIME_COMMAND_CATALOG[0]!.id)} {{ARGS}}`,
    );
  });

  test("renders deterministic claude commands from the shared command catalog", () => {
    const assets = renderClaudeRuntimeAssets();

    expect(assets).toHaveLength(RUNTIME_COMMAND_CATALOG.length);
    expect(assets[0]).toMatchObject({
      path: `.claude/commands/${RUNTIME_COMMAND_CATALOG[0]?.claudeCommandName}.md`,
      kind: "claude-command",
    });
    expect(assets[0]?.content).toContain(
      `node ${buildInstalledRuntimeEntrypointPath(RUNTIME_COMMAND_CATALOG[0]!.id)} "$ARGUMENTS"`,
    );
  });

  test("keeps codex and claude command inventories in parity", () => {
    const codexAssets = renderCodexRuntimeAssets();
    const claudeAssets = renderClaudeRuntimeAssets();

    expect(codexAssets.map((asset) => asset.commandIds[0])).toEqual(
      claudeAssets.map((asset) => asset.commandIds[0]),
    );
  });

  test("merges claude settings non-destructively and leaves hooks opt-in", () => {
    const existingDocument = JSON.stringify(
      {
        permissions: {
          allow: ["Edit", "Bash(node:*)"],
        },
        telemetry: {
          enabled: false,
        },
      },
      null,
      2,
    );
    const mergeResult = mergeClaudeSettingsDocument(existingDocument);

    expect(JSON.parse(mergeResult.content)).toEqual({
      permissions: {
        allow: ["Edit", "Bash(node:*)"],
      },
      telemetry: {
        enabled: false,
      },
      researcher: {
        runtimeRoot: ".researcher-runtime",
        commands: [...RUNTIME_COMMAND_CATALOG.map((entry) => entry.id)].sort(),
      },
    });
    expect(mergeResult.ownedKeys).toEqual([
      "researcher.runtimeRoot",
      "researcher.commands",
    ]);
    expect(createOptionalClaudeHookRecords()).toEqual([]);
    expect(createClaudeSettingsMergeRecord("2026-04-12T00:00:00.000Z")).toEqual({
      path: ".claude/settings.local.json",
      owned_keys: ["researcher.runtimeRoot", "researcher.commands"],
      updated_at: "2026-04-12T00:00:00.000Z",
    });
  });
});
