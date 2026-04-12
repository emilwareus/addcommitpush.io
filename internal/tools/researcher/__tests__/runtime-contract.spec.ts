import { describe, expect, test } from "vitest";

import {
  RUNTIME_INSTALL_CONTRACT_VERSION,
  buildRuntimeInstallManifestPath,
  normalizeRuntimeInstallManifest,
  normalizeRuntimeRelativePath,
  type RuntimeInstallManifest,
  type RuntimeInstallRequest,
} from "../contracts/runtime";
import {
  validateRuntimeInstallManifest,
  validateRuntimeInstallRequest,
} from "../contracts/validators";

describe("phase 6 runtime contracts", () => {
  test("accepts valid codex and claude install requests", () => {
    const codexRequest: RuntimeInstallRequest = {
      runtime: "codex",
      target_root: "/tmp/project-codex",
      managed_root: ".researcher-runtime",
      source_identity: {
        version: "0.1.0",
        source_root: "/repo",
      },
      include_optional_hooks: false,
    };
    const claudeRequest: RuntimeInstallRequest = {
      runtime: "claude",
      target_root: "/tmp/project-claude",
      managed_root: ".researcher-runtime",
      source_identity: {
        version: "0.1.0",
        source_root: "/repo",
      },
      include_optional_hooks: true,
    };

    expect(validateRuntimeInstallRequest(codexRequest)).toEqual(codexRequest);
    expect(validateRuntimeInstallRequest(claudeRequest)).toEqual(claudeRequest);
  });

  test("accepts deterministic install manifests and managed asset ownership data", () => {
    const manifest: RuntimeInstallManifest = {
      contract_version: RUNTIME_INSTALL_CONTRACT_VERSION,
      runtime: "codex",
      managed_root: ".researcher-runtime",
      generated_at: "2026-04-12T00:00:00.000Z",
      source_identity: {
        version: "0.1.0",
        source_root: "/repo",
      },
      commands: [
        {
          id: "research-new",
          installed_path: ".codex/skills/research-new/SKILL.md",
          wrapper_script_path: ".researcher-runtime/scripts/research-init.js",
          payload_keys: ["core:researcher", "schemas:researcher", "template:research-brief"],
        },
      ],
      managed_assets: [
        {
          runtime: "codex",
          kind: "codex-skill",
          path: ".codex/skills/research-new/SKILL.md",
          source_path: "internal/tools/researcher/runtime/adapters/codex.ts",
          generated_by: "research-install",
          content_hash: "sha256:skill",
          command_ids: ["research-new"],
        },
        {
          runtime: "codex",
          kind: "runtime-manifest",
          path: buildRuntimeInstallManifestPath(),
          source_path: "internal/tools/researcher/runtime/manifest.ts",
          generated_by: "research-install",
          content_hash: "sha256:manifest",
          command_ids: [],
        },
      ],
      settings_merges: [
        {
          path: ".claude/settings.local.json",
          owned_keys: ["researcher.commands", "researcher.runtimeRoot"],
          updated_at: "2026-04-12T00:00:00.000Z",
        },
      ],
    };

    expect(validateRuntimeInstallManifest(manifest)).toEqual(manifest);
    expect(normalizeRuntimeInstallManifest(manifest)).toMatchObject({
      commands: [
        {
          payload_keys: ["core:researcher", "schemas:researcher", "template:research-brief"],
        },
      ],
    });
  });

  test("rejects unsupported runtimes, malformed paths, and incomplete ownership fields", () => {
    expect(() =>
      validateRuntimeInstallRequest({
        runtime: "copilot",
        target_root: "/tmp/project",
        managed_root: ".researcher-runtime",
        source_identity: {
          version: "0.1.0",
          source_root: "/repo",
        },
        include_optional_hooks: false,
      }),
    ).toThrow("runtime install request failed schema validation");

    expect(() =>
      validateRuntimeInstallManifest({
        contract_version: RUNTIME_INSTALL_CONTRACT_VERSION,
        runtime: "codex",
        managed_root: ".researcher-runtime",
        generated_at: "2026-04-12T00:00:00.000Z",
        source_identity: {
          version: "0.1.0",
          source_root: "/repo",
        },
        commands: [
          {
            id: "research-new",
            installed_path: ".codex/skills/research-new/SKILL.md",
            wrapper_script_path: "",
            payload_keys: ["core:researcher"],
          },
        ],
        managed_assets: [
          {
            runtime: "codex",
            kind: "runtime-entry",
            path: "../outside.js",
            source_path: "scripts/research-init.ts",
            generated_by: "research-install",
            content_hash: "sha256:bad",
            command_ids: ["research-new"],
          },
        ],
        settings_merges: [],
      }),
    ).toThrow("runtime install manifest failed schema validation");
  });

  test("rejects command records with missing wrapper targets or payload references", () => {
    expect(() =>
      validateRuntimeInstallManifest({
        contract_version: RUNTIME_INSTALL_CONTRACT_VERSION,
        runtime: "claude",
        managed_root: ".researcher-runtime",
        generated_at: "2026-04-12T00:00:00.000Z",
        source_identity: {
          version: "0.1.0",
          source_root: "/repo",
        },
        commands: [
          {
            id: "research-report",
            installed_path: ".claude/commands/research-report.md",
            wrapper_script_path: ".researcher-runtime/scripts/research-report.js",
            payload_keys: [],
          },
        ],
        managed_assets: [],
        settings_merges: [],
      }),
    ).toThrow("runtime install manifest failed schema validation");
  });

  test("keeps settings and hook intent explicit instead of hidden flags", () => {
    const manifest = validateRuntimeInstallManifest({
      contract_version: RUNTIME_INSTALL_CONTRACT_VERSION,
      runtime: "claude",
      managed_root: ".researcher-runtime",
      generated_at: "2026-04-12T00:00:00.000Z",
      source_identity: {
        version: "0.1.0",
        source_root: "/repo",
      },
      commands: [],
      managed_assets: [],
      settings_merges: [
        {
          path: ".claude/settings.local.json",
          owned_keys: ["researcher.runtimeRoot"],
          updated_at: "2026-04-12T00:00:00.000Z",
        },
      ],
    });

    expect(manifest.settings_merges[0]?.owned_keys).toEqual(["researcher.runtimeRoot"]);
    expect(normalizeRuntimeRelativePath(".claude/settings.local.json")).toBe(
      ".claude/settings.local.json",
    );
  });
});
