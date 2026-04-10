import { mkdtemp, mkdir, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import {
  ARTIFACT_ID_PREFIXES,
  MANIFEST_CONTRACT_VERSION,
  createInitialNextResearchIds,
  createManifestPaths,
  createResearchId,
  formatArtifactId,
  type ResearchManifest,
} from "../contracts/manifest";
import { createEmptySourcesEnvelope, validateSourcesEnvelope } from "../contracts/sources";
import { validateManifest } from "../contracts/validators";
import {
  resolveWorkspacePath,
  resolveWorkspaceRoot,
} from "../fs/workspace-paths";

describe("research workspace contract", () => {
  test("validates manifest payloads and freezes the phase 1 ID strategy", () => {
    const slug = "deep-research-os";
    const researchId = createResearchId(slug, new Date("2026-04-10T00:00:00Z"));
    const manifest: ResearchManifest = {
      contract_version: MANIFEST_CONTRACT_VERSION,
      research: {
        id: researchId,
        slug,
        title: "Deep Research OS",
      },
      status: {
        state: "active",
        stage: "intake",
      },
      questions: {
        active: ["How should the workspace contract stay bounded?"],
      },
      freshness: {
        window_days: 30,
        last_source_sync_at: null,
        debt: 0,
      },
      inventory: {
        sources: 0,
        insights: 0,
        analysis: 0,
        reports: 0,
      },
      paths: createManifestPaths(slug),
      next_ids: createInitialNextResearchIds(),
    };

    expect(validateManifest(manifest)).toEqual(manifest);
    expect(manifest.next_ids).toEqual({
      source: 1,
      insight: 1,
      analysis: 1,
      report: 1,
      task: 1,
    });
    expect(formatArtifactId("source", 1)).toBe(`${ARTIFACT_ID_PREFIXES.source}-0001`);
    expect(formatArtifactId("insight", 1)).toBe(`${ARTIFACT_ID_PREFIXES.insight}-0001`);
    expect(formatArtifactId("analysis", 1)).toBe(`${ARTIFACT_ID_PREFIXES.analysis}-0001`);
    expect(formatArtifactId("report", 1)).toBe(`${ARTIFACT_ID_PREFIXES.report}-0001`);
    expect(formatArtifactId("task", 1)).toBe(`${ARTIFACT_ID_PREFIXES.task}-0001`);
  });

  test("creates and validates the shared phase 1 sources envelope", () => {
    const sourcesEnvelope = createEmptySourcesEnvelope("RES-20260410-deep-research-os");

    expect(sourcesEnvelope).toEqual({
      research_id: "RES-20260410-deep-research-os",
      updated_at: null,
      sources: [],
    });
    expect(validateSourcesEnvelope(sourcesEnvelope)).toEqual(sourcesEnvelope);
  });

  test("rejects absolute paths, traversal, and symlink escapes", async () => {
    await expect(
      resolveWorkspacePath("/repo", "deep-research-os", "/tmp/manifest.json"),
    ).rejects.toThrow("Workspace paths must be relative");
    await expect(
      resolveWorkspacePath("/repo", "deep-research-os", "../manifest.json"),
    ).rejects.toThrow("Workspace paths must stay inside the research root");

    const repoRoot = await mkdtemp(join(tmpdir(), "researcher-contracts-"));
    const workspaceRoot = join(repoRoot, "researcher", "researches", "deep-research-os");
    const outsideRoot = join(repoRoot, "outside");

    await mkdir(join(workspaceRoot, "reports"), { recursive: true });
    await mkdir(outsideRoot, { recursive: true });
    await symlink(outsideRoot, join(workspaceRoot, "reports", "escape"));

    await expect(
      resolveWorkspacePath(repoRoot, "deep-research-os", "reports/escape/file.txt"),
    ).rejects.toThrow("Workspace paths must not traverse symlinks");
  });

  test("resolves every safe slug to researcher/researches/<slug>/", () => {
    expect(resolveWorkspaceRoot("deep-research-os")).toBe(
      "researcher/researches/deep-research-os",
    );
  });
});
