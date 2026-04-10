import { access, mkdir, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { validateManifest } from "../contracts/validators";
import { validateSourcesEnvelope } from "../contracts/sources";
import { initResearchWorkspace } from "../core/init";

import {
  createTemporaryWorkspace,
  type TemporaryWorkspace,
} from "./test-helpers";

describe("research workspace init flow", () => {
  let temporaryWorkspace: TemporaryWorkspace;

  beforeEach(async () => {
    temporaryWorkspace = await createTemporaryWorkspace("researcher-init-");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T00:00:00Z"));
  });

  afterEach(async () => {
    vi.useRealTimers();
    await temporaryWorkspace.cleanup();
  });

  test("creates the fixed workspace contract under researcher/researches/<slug>/", async () => {
    const result = await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Deep Research OS",
      question: "How should research artifacts be structured for reuse?",
      audience: "internal",
      tags: ["research", "workspaces"],
    });

    const workspacePath = join(
      temporaryWorkspace.rootDir,
      "researcher",
      "researches",
      "deep-research-os",
    );

    expect(result).toEqual({
      researchId: "RES-20260410-deep-research-os",
      workspacePath,
    });
    expect(await readdir(workspacePath)).toEqual([
      "analysis",
      "brief.md",
      "data",
      "insights",
      "manifest.json",
      "reports",
      "sources.json",
    ]);
  });

  test("seeds the manifest with stable IDs, intake stage, freshness defaults, and zeroed inventory", async () => {
    const question = "How should research artifacts be structured for reuse?";

    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Deep Research OS",
      question,
    });

    const manifestPath = join(
      temporaryWorkspace.rootDir,
      "researcher",
      "researches",
      "deep-research-os",
      "manifest.json",
    );
    const manifest = validateManifest(
      JSON.parse(await readFile(manifestPath, "utf8")) as unknown,
    );

    expect(manifest.research.id).toBe("RES-20260410-deep-research-os");
    expect(manifest.status).toEqual({
      state: "active",
      stage: "intake",
    });
    expect(manifest.questions.active).toEqual([question]);
    expect(manifest.freshness).toEqual({
      window_days: 30,
      last_source_sync_at: null,
      debt: 0,
    });
    expect(manifest.next_ids).toEqual({
      source: 1,
      insight: 1,
      analysis: 1,
      report: 1,
      task: 1,
    });
    expect(manifest.inventory).toEqual({
      sources: 0,
      insights: 0,
      analysis: 0,
      reports: 0,
    });
  });

  test("creates a schema-valid empty sources.json envelope", async () => {
    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Deep Research OS",
      question: "How should research artifacts be structured for reuse?",
    });

    const sourcesPath = join(
      temporaryWorkspace.rootDir,
      "researcher",
      "researches",
      "deep-research-os",
      "sources.json",
    );
    const sourcesEnvelope = validateSourcesEnvelope(
      JSON.parse(await readFile(sourcesPath, "utf8")) as unknown,
    );

    expect(sourcesEnvelope).toEqual({
      research_id: "RES-20260410-deep-research-os",
      updated_at: null,
      sources: [],
    });
  });

  test("rejects existing workspaces and traversal slugs before any write occurs", async () => {
    const workspacePath = join(
      temporaryWorkspace.rootDir,
      "researcher",
      "researches",
      "deep-research-os",
    );

    await mkdir(workspacePath, { recursive: true });

    await expect(
      initResearchWorkspace({
        projectRoot: temporaryWorkspace.rootDir,
        slug: "deep-research-os",
        title: "Deep Research OS",
        question: "How should research artifacts be structured for reuse?",
      }),
    ).rejects.toThrow("Research workspace already exists");
    await expect(
      initResearchWorkspace({
        projectRoot: temporaryWorkspace.rootDir,
        slug: "../escape",
        title: "Escape",
        question: "Should not write outside the research root.",
      }),
    ).rejects.toThrow("Unsafe research slug");
    await expect(access(join(temporaryWorkspace.rootDir, "escape"))).rejects.toThrow();
  });
});
