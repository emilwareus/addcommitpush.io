import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { upsertAnalysis } from "../core/analysis/upsert";
import { initResearchWorkspace } from "../core/init";
import { upsertInsight } from "../core/insights/upsert";
import { parseInsightArtifact, parseReportArtifact } from "../core/artifacts/markdown";
import { upsertReport } from "../core/reports/upsert";
import { addSource } from "../core/sources/add";
import { refreshSource } from "../core/sources/refresh";
import { summarizeResearchStatus } from "../core/status/summary";

import {
  createTemporaryWorkspace,
  type TemporaryWorkspace,
} from "./test-helpers";

describe("freshness propagation", () => {
  let temporaryWorkspace: TemporaryWorkspace;

  beforeEach(async () => {
    temporaryWorkspace = await createTemporaryWorkspace("researcher-freshness-");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T00:00:00Z"));
  });

  afterEach(async () => {
    vi.useRealTimers();
    await temporaryWorkspace.cleanup();
  });

  test("marking a source stale propagates into dependent insights and reports", async () => {
    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "propagate-stale",
      title: "Propagate Stale",
      question: "How should stale debt flow through the graph?",
    });
    await addPhaseFourArtifacts("propagate-stale", {
      directInsightIds: [],
    });

    await refreshSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "propagate-stale",
      sourceId: "SRC-0001",
      markStale: true,
      now: new Date("2026-05-20T00:00:00Z"),
    });

    const insight = await readInsight("propagate-stale", "INS-0001-pricing-compression.md");
    const report = await readReport("propagate-stale", "RPT-0001-founder-pricing-brief.md");
    const status = await summarizeResearchStatus({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "propagate-stale",
    });

    expect(insight.frontmatter.side_states).toEqual(["stale", "unsupported"]);
    expect(report.frontmatter.side_states).toEqual(["stale", "unsupported"]);
    expect(status.impacted).toEqual({
      insights: ["INS-0001"],
      analysis: ["ANL-0001"],
      reports: ["RPT-0001"],
    });
  });

  test("refreshing a previously stale source clears downstream stale flags when support is healthy", async () => {
    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "propagate-fresh",
      title: "Propagate Fresh",
      question: "How should cleared freshness recompute downstream state?",
    });
    await addPhaseFourArtifacts("propagate-fresh", {
      directInsightIds: [],
    });
    await refreshSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "propagate-fresh",
      sourceId: "SRC-0001",
      markStale: true,
      now: new Date("2026-05-20T00:00:00Z"),
    });

    const capturePath = join(temporaryWorkspace.rootDir, "fresh-source.html");
    await import("node:fs/promises").then(({ writeFile }) =>
      writeFile(capturePath, "<html>fresh</html>\n", "utf8"),
    );
    await refreshSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "propagate-fresh",
      sourceId: "SRC-0001",
      captureKind: "snapshot",
      captureFile: capturePath,
      capturedAt: "2026-05-20T00:00:00.000Z",
      clearStale: true,
      now: new Date("2026-05-20T00:00:00Z"),
    });

    const insight = await readInsight("propagate-fresh", "INS-0001-pricing-compression.md");
    const report = await readReport("propagate-fresh", "RPT-0001-founder-pricing-brief.md");

    expect(insight.frontmatter.side_states).toEqual([]);
    expect(report.frontmatter.side_states).toEqual([]);
  });

  test("dedupes impacted reports when lineage overlaps direct and transitive insight links", async () => {
    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "propagate-overlap",
      title: "Propagate Overlap",
      question: "How should overlap avoid duplicate impact records?",
    });
    await addPhaseFourArtifacts("propagate-overlap", {
      directInsightIds: ["INS-0001"],
    });

    await refreshSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "propagate-overlap",
      sourceId: "SRC-0001",
      markStale: true,
      now: new Date("2026-05-20T00:00:00Z"),
    });

    const status = await summarizeResearchStatus({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "propagate-overlap",
    });

    expect(status.impacted.reports).toEqual(["RPT-0001"]);
  });

  async function addPhaseFourArtifacts(
    slug: string,
    options: {
      directInsightIds: string[];
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
        value: "freshness-spec",
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
        value: "freshness-spec",
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
      contradictions: ["None noted yet."],
      caveats: ["Public pricing pages may lag behind enterprise negotiations."],
      openQuestions: ["None noted yet."],
      nextMoves: ["Compare enterprise SKU changes over the last two quarters."],
      now: new Date("2026-04-11T02:00:00Z"),
    });
    await upsertReport({
      projectRoot: temporaryWorkspace.rootDir,
      slug,
      title: "Founder pricing brief",
      audience: "founder",
      angle: "pricing-pressure",
      thesis: "Pricing is compressing while bundle complexity grows.",
      analysisIds: ["ANL-0001"],
      insightIds: options.directInsightIds,
      summary: "Margins are tightening while packaging complexity increases.",
      keyPoints: ["Pricing compression is visible in public packaging."],
      body: "The report packages the current pricing analysis.",
      limitations: ["Public pricing pages may lag enterprise negotiation behavior."],
      now: new Date("2026-04-11T03:00:00Z"),
    });
  }

  async function readInsight(slug: string, fileName: string) {
    const document = await readFile(
      join(
        temporaryWorkspace.rootDir,
        "researcher",
        "researches",
        slug,
        "insights",
        fileName,
      ),
      "utf8",
    );

    return parseInsightArtifact(document);
  }

  async function readReport(slug: string, fileName: string) {
    const document = await readFile(
      join(
        temporaryWorkspace.rootDir,
        "researcher",
        "researches",
        slug,
        "reports",
        fileName,
      ),
      "utf8",
    );

    return parseReportArtifact(document);
  }
});
