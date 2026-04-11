import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { upsertAnalysis } from "../core/analysis/upsert";
import { initResearchWorkspace } from "../core/init";
import { upsertInsight } from "../core/insights/upsert";
import { upsertReport } from "../core/reports/upsert";
import { refreshSource } from "../core/sources/refresh";
import { addSource } from "../core/sources/add";
import { summarizeResearchStatus } from "../core/status/summary";

import {
  createTemporaryWorkspace,
  type TemporaryWorkspace,
} from "./test-helpers";

import { runResearchStatusCli } from "../../../../scripts/research-status";

describe("research status summary", () => {
  let temporaryWorkspace: TemporaryWorkspace;

  beforeEach(async () => {
    temporaryWorkspace = await createTemporaryWorkspace("researcher-status-");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T00:00:00Z"));
  });

  afterEach(async () => {
    vi.useRealTimers();
    await temporaryWorkspace.cleanup();
  });

  test("returns a healthy status summary and exposes it through the thin CLI", async () => {
    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "healthy-status",
      title: "Healthy Status",
      question: "What should a healthy research route to next?",
    });
    await addPhaseThreeArtifacts("healthy-status", {
      contradictions: ["None noted yet."],
      openQuestions: ["None noted yet."],
    });
    await updateWorkspaceManifest("healthy-status", (manifest) => {
      manifest.status.stage = "extract";
    });

    const summary = await summarizeResearchStatus({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "healthy-status",
    });

    expect(summary.freshnessDebt).toEqual({
      count: 0,
      windowDays: 30,
      lastSourceSyncAt: "2026-04-11T00:01:00.000Z",
      staleSources: [],
    });
    expect(summary.verificationDebt.count).toBe(0);
    expect(summary.nextRecommendedAction).toBe("package-report");
    expect(summary.impacted).toEqual({
      insights: [],
      analysis: [],
      reports: [],
    });

    const cliSummary = await runResearchStatusCli([
      "--project-root",
      temporaryWorkspace.rootDir,
      "--slug",
      "healthy-status",
    ]);

    expect(cliSummary).toEqual(summary);
    expect(
      JSON.parse(JSON.stringify(cliSummary)) as unknown,
    ).toEqual(summary);
  });

  test("prioritizes stale source refresh and groups impacted downstream artifacts", async () => {
    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "stale-status",
      title: "Stale Status",
      question: "How should stale debt route downstream work?",
    });
    await addPhaseFourArtifacts("stale-status", {
      contradictions: ["None noted yet."],
      openQuestions: ["None noted yet."],
    });
    await refreshSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "stale-status",
      sourceId: "SRC-0001",
      markStale: true,
      now: new Date("2026-05-20T00:00:00Z"),
    });

    const summary = await summarizeResearchStatus({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "stale-status",
    });

    expect(summary.freshnessDebt.count).toBe(1);
    expect(summary.freshnessDebt.staleSources).toEqual(["SRC-0001"]);
    expect(summary.impacted).toEqual({
      insights: ["INS-0001"],
      analysis: ["ANL-0001"],
      reports: ["RPT-0001"],
    });
    expect(summary.nextRecommendedAction).toBe("refresh-sources");
  });

  test("surfaces verification debt and syncs aggregate manifest counts", async () => {
    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "verification-status",
      title: "Verification Status",
      question: "How should verification debt route status?",
    });
    await addPhaseFourArtifacts("verification-status", {
      contradictions: ["Packaging claims are not fully reconciled."],
      openQuestions: ["Which pricing move is durable versus promotional?"],
    });
    await refreshSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "verification-status",
      sourceId: "SRC-0001",
      markRejected: true,
      clearStale: true,
      now: new Date("2026-04-12T00:00:00Z"),
    });

    const summary = await summarizeResearchStatus({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "verification-status",
    });

    expect(summary.freshnessDebt.count).toBe(0);
    expect(summary.verificationDebt).toEqual({
      count: 4,
      unsupportedInsights: ["INS-0001"],
      unsupportedReports: ["RPT-0001"],
      contradictedAnalysis: ["ANL-0001"],
      analysisWithOpenQuestions: ["ANL-0001"],
      blockedReports: ["RPT-0001"],
    });
    expect(summary.impacted).toEqual({
      insights: ["INS-0001"],
      analysis: ["ANL-0001"],
      reports: ["RPT-0001"],
    });
    expect(summary.nextRecommendedAction).toBe("resolve-verification-debt");

    const manifestPath = join(
      temporaryWorkspace.rootDir,
      "researcher",
      "researches",
      "verification-status",
      "manifest.json",
    );
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      verification: {
        debt: number;
        unsupported_insights: number;
        unsupported_reports: number;
        contradicted_analysis: number;
        unresolved_analysis_questions: number;
      };
    };

    expect(manifest.verification).toEqual({
      debt: 4,
      unsupported_insights: 1,
      unsupported_reports: 1,
      contradicted_analysis: 1,
      unresolved_analysis_questions: 1,
    });

    await expect(
      runResearchStatusCli([
        "--project-root",
        temporaryWorkspace.rootDir,
      ]),
    ).rejects.toThrow("Missing required argument --slug");
  });

  async function addPhaseFourArtifacts(
    slug: string,
    options: {
      contradictions: string[];
      openQuestions: string[];
    },
  ): Promise<void> {
    await addPhaseThreeArtifacts(slug, options);
    await upsertReport({
      projectRoot: temporaryWorkspace.rootDir,
      slug,
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
  }

  async function addPhaseThreeArtifacts(
    slug: string,
    options: {
      contradictions: string[];
      openQuestions: string[];
    },
  ): Promise<void> {
    await addSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug,
      title: "Pricing report",
      url: "https://example.com/pricing-report",
      type: "webpage",
      origin: {
        type: "manual",
        value: "status-spec",
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
        value: "status-spec",
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
      contradictions: options.contradictions,
      caveats: ["Public pricing pages may lag behind enterprise negotiations."],
      openQuestions: options.openQuestions,
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
      verification: {
        debt: number;
        unsupported_insights: number;
        unsupported_reports: number;
        contradicted_analysis: number;
        unresolved_analysis_questions: number;
      };
    }) => void,
  ): Promise<void> {
    const manifestPath = join(
      temporaryWorkspace.rootDir,
      "researcher",
      "researches",
      slug,
      "manifest.json",
    );
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      freshness: { debt: number; last_source_sync_at: string | null; window_days: number };
      inventory: { sources: number; insights: number; analysis: number; reports: number };
      status: { stage: string; state: string };
      verification: {
        debt: number;
        unsupported_insights: number;
        unsupported_reports: number;
        contradicted_analysis: number;
        unresolved_analysis_questions: number;
      };
    };

    mutate(manifest);
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }
});
