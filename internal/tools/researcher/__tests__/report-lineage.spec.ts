import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { upsertAnalysis } from "../core/analysis/upsert";
import { initResearchWorkspace } from "../core/init";
import { upsertInsight } from "../core/insights/upsert";
import { upsertReport } from "../core/reports/upsert";
import { addSource } from "../core/sources/add";

import {
  createTemporaryWorkspace,
  type TemporaryWorkspace,
} from "./test-helpers";

describe("research report lineage flow", () => {
  let temporaryWorkspace: TemporaryWorkspace;

  beforeEach(async () => {
    temporaryWorkspace = await createTemporaryWorkspace("researcher-report-lineage-");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-11T00:00:00Z"));

    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Deep Research OS",
      question: "How should report lineage stay synchronized?",
    });
    await addSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Pricing report",
      url: "https://example.com/pricing-report",
      type: "webpage",
      origin: {
        type: "manual",
        value: "phase-4-spec",
      },
      now: new Date("2026-04-11T00:00:00Z"),
    });
    await addSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Competitive teardown",
      url: "https://example.com/competitive-teardown",
      type: "webpage",
      origin: {
        type: "manual",
        value: "phase-4-spec",
      },
      now: new Date("2026-04-11T00:01:00Z"),
    });
    await upsertInsight({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
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
      slug: "deep-research-os",
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
      slug: "deep-research-os",
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
  });

  afterEach(async () => {
    vi.useRealTimers();
    await temporaryWorkspace.cleanup();
  });

  test("renders transitive insight and source lineage from referenced analysis", async () => {
    await upsertReport({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Founder pricing brief",
      audience: "founder",
      angle: "pricing-pressure",
      thesis: "Pricing is compressing while bundle complexity grows.",
      analysisIds: ["ANL-0001"],
      insightIds: ["INS-0002"],
      summary: "Margins are tightening while packaging complexity increases.",
      keyPoints: ["Pricing compression is visible in public packaging."],
      body: "The report packages both the analysis and direct insight into one narrative.",
      limitations: ["Public pricing pages may lag enterprise negotiation behavior."],
      now: new Date("2026-04-11T03:00:00Z"),
    });

    const report = await readWorkspaceText("reports/RPT-0001-founder-pricing-brief.md");
    const firstInsight = await readWorkspaceText("insights/INS-0001-pricing-compression.md");
    const secondInsight = await readWorkspaceText(
      "insights/INS-0002-feature-bundling-pressure.md",
    );

    expect(report).toContain("## Analysis Inputs");
    expect(report).toContain("`ANL-0001` Pricing landscape");
    expect(report).toContain(
      "`INS-0001` Pricing compression (sources: `SRC-0001`)",
    );
    expect(report).toContain(
      "`INS-0002` Feature bundling pressure (sources: `SRC-0002`)",
    );
    expect(report).toContain(
      "`SRC-0001` Pricing report - https://example.com/pricing-report",
    );
    expect(report).toContain(
      "`SRC-0002` Competitive teardown - https://example.com/competitive-teardown",
    );
    expect(firstInsight).toContain('linked_reports:\n  - "RPT-0001"');
    expect(secondInsight).toContain('linked_reports:\n  - "RPT-0001"');
  });

  test("dedupes overlapping source references and keeps URLs in source references only", async () => {
    await upsertInsight({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Packaging masks discounting",
      sourceIds: ["SRC-0001", "SRC-0002"],
      claim: "Packaging complexity can hide discounting pressure.",
      whyItMatters: "This connects the pricing and bundling signals.",
      evidence: [
        {
          sourceId: "SRC-0001",
          note: "Pricing changes are visible in public packaging.",
        },
        {
          sourceId: "SRC-0002",
          note: "Bundle growth obscures straightforward price comparisons.",
        },
      ],
      caveats: ["None noted yet."],
      reuseNotes: "Use this in pricing and GTM reports.",
      now: new Date("2026-04-11T02:30:00Z"),
    });

    await upsertReport({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Market map brief",
      audience: "internal",
      angle: "market-map",
      thesis: "Packaging complexity is now part of market positioning.",
      analysisIds: [],
      insightIds: ["INS-0001", "INS-0003"],
      summary: "Packaging complexity is now part of pricing interpretation.",
      keyPoints: ["The same sources can support multiple insight angles."],
      body: "The report packages the reusable insight graph directly.",
      limitations: ["Source overlap does not remove interpretation risk."],
      now: new Date("2026-04-11T03:30:00Z"),
    });

    const report = await readWorkspaceText("reports/RPT-0001-market-map-brief.md");
    const sourceReferenceLines = report
      .split("\n")
      .filter((line) => line.startsWith("- `SRC-"));
    const insightReferenceLines = report
      .split("\n")
      .filter((line) => line.startsWith("- `INS-"));

    expect(sourceReferenceLines).toEqual([
      "- `SRC-0001` Pricing report - https://example.com/pricing-report",
      "- `SRC-0002` Competitive teardown - https://example.com/competitive-teardown",
    ]);
    expect(insightReferenceLines.some((line) => line.includes("https://"))).toBe(false);
  });

  async function readWorkspaceText(relativePath: string): Promise<string> {
    return readFile(
      join(
        temporaryWorkspace.rootDir,
        "researcher",
        "researches",
        "deep-research-os",
        relativePath,
      ),
      "utf8",
    );
  }
});
