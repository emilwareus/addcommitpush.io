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
import {
  DATA_DATASETS_DIRECTORY,
  DATA_EXPORTS_DIRECTORY,
  DATA_SNAPSHOTS_DIRECTORY,
  DATA_TRANSCRIPTS_DIRECTORY,
} from "../contracts/workspace";
import { createEmptySourcesEnvelope, validateSourcesEnvelope } from "../contracts/sources";
import { validateManifest } from "../contracts/validators";
import {
  normalizeDataCaptureRef,
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

  test("rejects malformed source URLs, timestamps, and invalid capture refs", () => {
    const invalidEnvelope = {
      research_id: "RES-20260410-deep-research-os",
      updated_at: "not-a-date",
      sources: [
        {
          id: "SRC-0001",
          title: "Broken source",
          url: "notaurl",
          canonical_url: "still-not-a-url",
          origin: {
            type: "manual",
            value: "phase-2-research",
          },
          type: "webpage",
          confidence: "high",
          status: "quoted",
          side_states: ["stale"],
          published_at: null,
          created_at: "2026-04-10T00:00:00.000Z",
          updated_at: "2026-04-10T00:00:00.000Z",
          accessed_at: "not-a-date",
          last_checked_at: null,
          latest_capture_path: "/tmp/source.html",
          captures: [
            {
              kind: "snapshot",
              path: "../outside.txt",
              captured_at: "2026-04-10T00:00:00.000Z",
            },
          ],
          linked_insights: [],
          tags: [],
          notes: null,
        },
      ],
    };

    expect(() => validateSourcesEnvelope(invalidEnvelope)).toThrow(
      "sources.json failed schema validation",
    );
    expect(() => normalizeDataCaptureRef("/tmp/file.html")).toThrow(
      "Workspace paths must be relative",
    );
    expect(() => normalizeDataCaptureRef("../outside.txt")).toThrow(
      "Workspace paths must stay inside the research root",
    );
    expect(() => normalizeDataCaptureRef("reports/file.md")).toThrow(
      "Capture refs must stay under data/",
    );
  });

  test("accepts the phase 2 source contract and frozen data buckets", () => {
    const validEnvelope = {
      research_id: "RES-20260410-deep-research-os",
      updated_at: "2026-04-10T01:00:00.000Z",
      sources: [
        {
          id: "SRC-0001",
          title: "Ajv format validation",
          url: "https://ajv.js.org/guide/formats.html",
          canonical_url: "https://ajv.js.org/guide/formats.html",
          origin: {
            type: "manual",
            value: "phase-2-research",
          },
          type: "webpage",
          confidence: "high",
          status: "quoted",
          side_states: [],
          published_at: null,
          created_at: "2026-04-10T00:00:00.000Z",
          updated_at: "2026-04-10T01:00:00.000Z",
          accessed_at: "2026-04-10T01:00:00.000Z",
          last_checked_at: "2026-04-10T01:00:00.000Z",
          latest_capture_path: "data/snapshots/SRC-0001/20260410T010000Z/source.html",
          captures: [
            {
              kind: "snapshot",
              path: "data/snapshots/SRC-0001/20260410T010000Z/source.html",
              captured_at: "2026-04-10T01:00:00.000Z",
            },
          ],
          linked_insights: ["INS-0001"],
          tags: ["ajv", "json-schema"],
          notes: null,
        },
      ],
    };

    expect(validateSourcesEnvelope(validEnvelope)).toEqual(validEnvelope);
    expect(normalizeDataCaptureRef(validEnvelope.sources[0].latest_capture_path)).toBe(
      "data/snapshots/SRC-0001/20260410T010000Z/source.html",
    );
    expect(DATA_SNAPSHOTS_DIRECTORY).toBe("data/snapshots");
    expect(DATA_EXPORTS_DIRECTORY).toBe("data/exports");
    expect(DATA_TRANSCRIPTS_DIRECTORY).toBe("data/transcripts");
    expect(DATA_DATASETS_DIRECTORY).toBe("data/datasets");
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
