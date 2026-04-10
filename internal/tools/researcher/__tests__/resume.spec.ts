import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { initResearchWorkspace } from "../core/init";
import { resumeResearchWorkspace } from "../core/resume";

import {
  createTemporaryWorkspace,
  type TemporaryWorkspace,
} from "./test-helpers";

describe("research workspace resume flow", () => {
  let temporaryWorkspace: TemporaryWorkspace;

  beforeEach(async () => {
    temporaryWorkspace = await createTemporaryWorkspace("researcher-resume-");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T00:00:00Z"));
  });

  afterEach(async () => {
    vi.useRealTimers();
    await temporaryWorkspace.cleanup();
  });

  test("restores research context from a real init-created workspace", async () => {
    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Deep Research OS",
      question: "How should research artifacts be structured for reuse?",
    });

    const result = await resumeResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
    });

    expect(result).toEqual({
      researchId: "RES-20260410-deep-research-os",
      slug: "deep-research-os",
      title: "Deep Research OS",
      workspacePath: join(
        temporaryWorkspace.rootDir,
        "researcher",
        "researches",
        "deep-research-os",
      ),
      stage: "intake",
      state: "active",
      openQuestions: ["How should research artifacts be structured for reuse?"],
      freshnessDebt: "clear",
      inventory: {
        sources: 0,
        insights: 0,
        analysis: 0,
        reports: 0,
      },
      nextRecommendedAction: "harvest-sources",
    });
  });

  test("scans disk inventory instead of trusting stale manifest counters", async () => {
    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Deep Research OS",
      question: "How should research artifacts be structured for reuse?",
    });

    const workspacePath = join(
      temporaryWorkspace.rootDir,
      "researcher",
      "researches",
      "deep-research-os",
    );
    const manifestPath = join(workspacePath, "manifest.json");
    const sourcesPath = join(workspacePath, "sources.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      freshness: { debt: number; last_source_sync_at: string | null; window_days: number };
      inventory: { sources: number; insights: number; analysis: number; reports: number };
      status: { stage: string; state: string };
    };
    const sources = JSON.parse(await readFile(sourcesPath, "utf8")) as {
      research_id: string;
      updated_at: string | null;
      sources: Array<object>;
    };

    manifest.status.stage = "extract";
    manifest.freshness.debt = 2;
    manifest.freshness.last_source_sync_at = "2026-04-01T00:00:00.000Z";
    manifest.inventory = {
      sources: 99,
      insights: 99,
      analysis: 99,
      reports: 99,
    };
    sources.updated_at = "2026-04-09T00:00:00.000Z";
    sources.sources.push({
      id: "SRC-0001",
      title: "Research systems design",
      url: "https://example.com/research-systems-design",
      type: "webpage",
      credibility: "primary",
      accessed_at: "2026-04-09T00:00:00.000Z",
      status: "read",
      linked_insights: [],
    });

    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    await writeFile(sourcesPath, `${JSON.stringify(sources, null, 2)}\n`, "utf8");
    await writeFile(join(workspacePath, "insights", "INS-0001-claim.md"), "# Insight\n", "utf8");
    await mkdir(join(workspacePath, "analysis", "notebooks"), { recursive: true });
    await writeFile(join(workspacePath, "analysis", "ANL-0001-map.md"), "# Analysis\n", "utf8");
    await writeFile(join(workspacePath, "reports", "RPT-0001-brief.md"), "# Report\n", "utf8");

    const result = await resumeResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
    });

    expect(result.freshnessDebt).toBe("overdue:2");
    expect(result.inventory).toEqual({
      sources: 1,
      insights: 1,
      analysis: 1,
      reports: 1,
    });
    expect(result.nextRecommendedAction).toBe("synthesize-analysis");
  });

  test("fails hard for missing brief, invalid machine state, and traversal slugs", async () => {
    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Deep Research OS",
      question: "How should research artifacts be structured for reuse?",
    });

    const workspacePath = join(
      temporaryWorkspace.rootDir,
      "researcher",
      "researches",
      "deep-research-os",
    );

    await writeFile(join(workspacePath, "brief.md"), "", "utf8");
    await expect(
      resumeResearchWorkspace({
        projectRoot: temporaryWorkspace.rootDir,
        slug: "deep-research-os",
      }),
    ).rejects.toThrow();

    await writeFile(join(workspacePath, "brief.md"), "# Restored brief\n", "utf8");
    await writeFile(join(workspacePath, "manifest.json"), "{\n  \"bad\": true\n}\n", "utf8");
    await expect(
      resumeResearchWorkspace({
        projectRoot: temporaryWorkspace.rootDir,
        slug: "deep-research-os",
      }),
    ).rejects.toThrow("manifest.json failed schema validation");

    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "valid-sources",
      title: "Valid Sources",
      question: "How should source registries be validated?",
    });

    const secondWorkspacePath = join(
      temporaryWorkspace.rootDir,
      "researcher",
      "researches",
      "valid-sources",
    );
    await writeFile(join(secondWorkspacePath, "sources.json"), "{\n  \"bad\": true\n}\n", "utf8");

    await expect(
      resumeResearchWorkspace({
        projectRoot: temporaryWorkspace.rootDir,
        slug: "valid-sources",
      }),
    ).rejects.toThrow("sources.json failed schema validation");

    await expect(
      resumeResearchWorkspace({
        projectRoot: temporaryWorkspace.rootDir,
        slug: "../escape",
      }),
    ).rejects.toThrow("Unsafe research slug");
  });
});
