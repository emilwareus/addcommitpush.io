import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { initResearchWorkspace } from "../core/init";
import { resumeResearchWorkspace } from "../core/resume";
import { upsertAnalysis } from "../core/analysis/upsert";
import { upsertInsight } from "../core/insights/upsert";
import { upsertReport } from "../core/reports/upsert";
import { addSource } from "../core/sources/add";
import { refreshSource } from "../core/sources/refresh";

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
      canonical_url: "https://example.com/research-systems-design",
      origin: {
        type: "manual",
        value: "resume-spec",
      },
      type: "webpage",
      confidence: "high",
      status: "read",
      side_states: ["stale"],
      published_at: null,
      created_at: "2026-04-09T00:00:00.000Z",
      updated_at: "2026-04-09T00:00:00.000Z",
      accessed_at: "2026-04-09T00:00:00.000Z",
      last_checked_at: "2026-04-09T00:00:00.000Z",
      latest_capture_path: "data/snapshots/SRC-0001/20260409T000000Z/source.html",
      captures: [
        {
          kind: "snapshot",
          path: "data/snapshots/SRC-0001/20260409T000000Z/source.html",
          captured_at: "2026-04-09T00:00:00.000Z",
        },
      ],
      tags: ["research-systems"],
      linked_insights: [],
      notes: null,
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
    expect(result.nextRecommendedAction).toBe("refresh-sources");
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

  test("stays resume-compatible after phase 2 source refresh metadata lands", async () => {
    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "refresh-compatible",
      title: "Refresh Compatible",
      question: "How should refresh metadata affect resume?",
    });

    await addSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "refresh-compatible",
      title: "Ajv format validation",
      url: "https://ajv.js.org/guide/formats.html",
      type: "webpage",
      origin: {
        type: "manual",
        value: "resume-spec",
      },
      now: new Date("2026-04-10T00:00:00Z"),
    });
    await refreshSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "refresh-compatible",
      sourceId: "SRC-0001",
      markStale: true,
      now: new Date("2026-05-20T00:00:00Z"),
    });

    const result = await resumeResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "refresh-compatible",
    });

    expect(result.inventory.sources).toBe(1);
    expect(result.freshnessDebt).toBe("overdue:1");
    expect(result.nextRecommendedAction).toBe("refresh-sources");
  });

  test("routes extract-stage research with sources, insights, and analysis to package-report", async () => {
    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "phase-3-package",
      title: "Phase 3 Package",
      question: "How should phase 3 resume with analysis on disk?",
    });

    await addPhaseThreeArtifacts("phase-3-package");
    await updateWorkspaceManifest("phase-3-package", (manifest) => {
      manifest.status.stage = "extract";
      manifest.freshness.debt = 0;
      manifest.freshness.last_source_sync_at = "2026-04-11T02:30:00.000Z";
    });

    const result = await resumeResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "phase-3-package",
    });

    expect(result.inventory).toEqual({
      sources: 2,
      insights: 2,
      analysis: 1,
      reports: 0,
    });
    expect(result.nextRecommendedAction).toBe("package-report");
  });

  test("prioritizes refresh-sources over package-report when stale debt exists after phase 3", async () => {
    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "phase-3-refresh",
      title: "Phase 3 Refresh",
      question: "How should stale debt outrank downstream artifacts?",
    });

    await addPhaseThreeArtifacts("phase-3-refresh");
    await refreshSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "phase-3-refresh",
      sourceId: "SRC-0001",
      markStale: true,
      now: new Date("2026-05-20T00:00:00Z"),
    });
    await updateWorkspaceManifest("phase-3-refresh", (manifest) => {
      manifest.status.stage = "extract";
    });

    const result = await resumeResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "phase-3-refresh",
    });

    expect(result.inventory).toEqual({
      sources: 2,
      insights: 2,
      analysis: 1,
      reports: 0,
    });
    expect(result.freshnessDebt).toBe("overdue:1");
    expect(result.nextRecommendedAction).toBe("refresh-sources");
  });

  test("routes package-stage research with reports on disk to review-existing-reports", async () => {
    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "phase-4-review",
      title: "Phase 4 Review",
      question: "How should resume behave after reports exist?",
    });

    await addPhaseThreeArtifacts("phase-4-review");
    await upsertReport({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "phase-4-review",
      title: "Founder pricing brief",
      audience: "founder",
      angle: "pricing-pressure",
      thesis: "Pricing is compressing while bundle complexity grows.",
      analysisIds: ["ANL-0001"],
      insightIds: [],
      summary: "Margins are tightening while packaging complexity increases.",
      keyPoints: ["Pricing compression is visible in public packaging."],
      body: "The report packages the current pricing analysis.",
      limitations: ["Public pricing pages may lag enterprise negotiation behavior."],
      now: new Date("2026-04-11T03:00:00Z"),
    });
    await updateWorkspaceManifest("phase-4-review", (manifest) => {
      manifest.status.stage = "package";
      manifest.freshness.debt = 0;
      manifest.freshness.last_source_sync_at = "2026-04-11T03:00:00.000Z";
    });

    const result = await resumeResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "phase-4-review",
    });

    expect(result.inventory).toEqual({
      sources: 2,
      insights: 2,
      analysis: 1,
      reports: 1,
    });
    expect(result.nextRecommendedAction).toBe("review-existing-reports");
  });

  async function addPhaseThreeArtifacts(slug: string): Promise<void> {
    await addSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug,
      title: "Pricing report",
      url: "https://example.com/pricing-report",
      type: "webpage",
      origin: {
        type: "manual",
        value: "resume-spec",
      },
      now: new Date("2026-04-11T00:00:00Z"),
    });
    await addSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug,
      title: "Competitive teardown",
      url: "https://example.com/competitive-teardown",
      type: "webpage",
      origin: {
        type: "manual",
        value: "resume-spec",
      },
      now: new Date("2026-04-11T00:01:00Z"),
    });
    await upsertInsight({
      projectRoot: temporaryWorkspace.rootDir,
      slug,
      title: "Pricing compression",
      sourceIds: ["SRC-0001"],
      claim: "Margins are tightening across coding-agent products.",
      whyItMatters: "This signal should be reusable across reports.",
      evidence: [
        {
          sourceId: "SRC-0001",
          note: "Public pricing dropped year over year.",
        },
      ],
      caveats: ["None noted yet."],
      reuseNotes: "Use this in pricing and market-map reports.",
      now: new Date("2026-04-11T01:00:00Z"),
    });
    await upsertInsight({
      projectRoot: temporaryWorkspace.rootDir,
      slug,
      title: "Feature bundling pressure",
      sourceIds: ["SRC-0002"],
      claim: "Vendors are expanding feature bundles without raising list price.",
      whyItMatters: "This reframes pricing pressure as a packaging problem.",
      evidence: [
        {
          sourceId: "SRC-0002",
          note: "Feature bundles grew while prices stayed flat.",
        },
      ],
      caveats: ["None noted yet."],
      reuseNotes: "Use this in competitive analysis.",
      now: new Date("2026-04-11T01:10:00Z"),
    });
    await upsertAnalysis({
      projectRoot: temporaryWorkspace.rootDir,
      slug,
      title: "Pricing landscape",
      insightIds: ["INS-0001", "INS-0002"],
      question: "What does pricing pressure imply for positioning?",
      synthesis:
        "The combined insights suggest margins are tightening while feature bundles expand.",
      contradictions: ["Some vendors hold list price steady and shift packaging instead."],
      caveats: ["Public pricing pages may lag behind enterprise negotiations."],
      openQuestions: ["Which price moves are durable versus promotional?"],
      nextMoves: ["Compare enterprise SKU changes over the last two quarters."],
      now: new Date("2026-04-11T02:00:00Z"),
    });
  }

  async function updateWorkspaceManifest(
    slug: string,
    mutate: (manifest: {
      freshness: { debt: number; last_source_sync_at: string | null; window_days: number };
      inventory: { sources: number; insights: number; analysis: number; reports: number };
      status: { stage: string; state: string };
    }) => void,
  ): Promise<void> {
    const workspacePath = join(
      temporaryWorkspace.rootDir,
      "researcher",
      "researches",
      slug,
    );
    const manifestPath = join(workspacePath, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      freshness: { debt: number; last_source_sync_at: string | null; window_days: number };
      inventory: { sources: number; insights: number; analysis: number; reports: number };
      status: { stage: string; state: string };
    };

    mutate(manifest);
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }
});
