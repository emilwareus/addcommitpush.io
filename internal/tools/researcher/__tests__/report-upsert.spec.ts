import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

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

const execFileAsync = promisify(execFile);
const REPORT_SCRIPT_PATH = fileURLToPath(
  new URL("../../../../scripts/research-report.ts", import.meta.url),
);

describe("research report upsert flow", () => {
  let temporaryWorkspace: TemporaryWorkspace;

  beforeEach(async () => {
    temporaryWorkspace = await createTemporaryWorkspace("researcher-report-upsert-");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-11T00:00:00Z"));

    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Deep Research OS",
      question: "How should reports be generated from research artifacts?",
    });
    await addPhaseThreeArtifacts();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await temporaryWorkspace.cleanup();
  });

  test("creates a new report, allocates the next ID, and syncs direct backlinks", async () => {
    const result = await upsertReport({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Founder pricing brief",
      audience: "founder",
      angle: "pricing-pressure",
      thesis: "Pricing is compressing while bundle complexity grows.",
      analysisIds: ["ANL-0001"],
      insightIds: ["INS-0002"],
      summary: "Margins are tightening while packaging complexity increases.",
      keyPoints: [
        "Pricing compression is now visible in public packaging.",
        "Feature bundles are absorbing some of the apparent discounting.",
      ],
      body: "The current evidence points to a packaging-led pricing reset.",
      limitations: ["Public pricing pages may lag enterprise negotiation behavior."],
      now: new Date("2026-04-11T03:00:00Z"),
    });

    expect(result).toEqual({
      operation: "created",
      reportId: "RPT-0001",
      path: "reports/RPT-0001-founder-pricing-brief.md",
      analysisIds: ["ANL-0001"],
      insightIds: ["INS-0002"],
    });

    const manifest = await readWorkspaceJson<{
      inventory: { reports: number };
      next_ids: { report: number };
    }>("manifest.json");
    const reportFiles = await readdir(workspaceReportsPath());

    expect(manifest.inventory.reports).toBe(1);
    expect(manifest.next_ids.report).toBe(2);
    expect(reportFiles).toEqual(["RPT-0001-founder-pricing-brief.md"]);

    const analysis = await readWorkspaceText("analysis/ANL-0001-pricing-landscape.md");
    const secondInsight = await readWorkspaceText(
      "insights/INS-0002-feature-bundling-pressure.md",
    );

    expect(analysis).toContain('linked_reports:\n  - "RPT-0001"');
    expect(secondInsight).toContain('linked_reports:\n  - "RPT-0001"');
  });

  test("updates a report in place and reconciles removed direct backlinks", async () => {
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
      body: "The current evidence points to a packaging-led pricing reset.",
      limitations: ["Public pricing pages may lag enterprise negotiation behavior."],
      now: new Date("2026-04-11T03:00:00Z"),
    });

    const result = await upsertReport({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      reportId: "RPT-0001",
      title: "Founder pricing brief revised",
      audience: "founder",
      angle: "enterprise-packaging",
      thesis: "Enterprise packaging explains more of the variance than list price alone.",
      analysisIds: [],
      insightIds: ["INS-0001"],
      summary: "Enterprise packaging now explains more of the signal.",
      keyPoints: ["List price and enterprise packaging have diverged."],
      body: "The report now leans on the direct pricing insight instead of the analysis.",
      limitations: ["Enterprise packaging is harder to observe than public list price."],
      now: new Date("2026-04-11T04:00:00Z"),
    });

    expect(result).toEqual({
      operation: "updated",
      reportId: "RPT-0001",
      path: "reports/RPT-0001-founder-pricing-brief-revised.md",
      analysisIds: [],
      insightIds: ["INS-0001"],
    });

    const analysis = await readWorkspaceText("analysis/ANL-0001-pricing-landscape.md");
    const firstInsight = await readWorkspaceText("insights/INS-0001-pricing-compression.md");
    const secondInsight = await readWorkspaceText(
      "insights/INS-0002-feature-bundling-pressure.md",
    );

    expect(analysis).toContain("linked_reports: []");
    expect(firstInsight).toContain('linked_reports:\n  - "RPT-0001"');
    expect(secondInsight).toContain("linked_reports: []");
  });

  test("exposes a thin CLI that prints deterministic JSON", async () => {
    const { stdout } = await execFileAsync(
      "pnpm",
      [
        "exec",
        "tsx",
        REPORT_SCRIPT_PATH,
        "--project-root",
        temporaryWorkspace.rootDir,
        "--slug",
        "deep-research-os",
        "--title",
        "Founder pricing brief",
        "--audience",
        "founder",
        "--angle",
        "pricing-pressure",
        "--thesis",
        "Pricing is compressing while bundle complexity grows.",
        "--insight-id",
        "INS-0001",
        "--summary",
        "Margins are tightening while packaging complexity increases.",
        "--key-point",
        "Pricing compression is now visible in public packaging.",
        "--body",
        "The current evidence points to a packaging-led pricing reset.",
        "--limitation",
        "Public pricing pages may lag enterprise negotiation behavior.",
      ],
      {
        cwd: process.cwd(),
      },
    );

    expect(JSON.parse(stdout)).toEqual({
      operation: "created",
      reportId: "RPT-0001",
      path: "reports/RPT-0001-founder-pricing-brief.md",
      analysisIds: [],
      insightIds: ["INS-0001"],
    });
  });

  async function addPhaseThreeArtifacts(): Promise<void> {
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
  }

  function workspaceReportsPath(): string {
    return join(
      temporaryWorkspace.rootDir,
      "researcher",
      "researches",
      "deep-research-os",
      "reports",
    );
  }

  async function readWorkspaceJson<T>(fileName: string): Promise<T> {
    const filePath = join(
      temporaryWorkspace.rootDir,
      "researcher",
      "researches",
      "deep-research-os",
      fileName,
    );
    const content = await readFile(filePath, "utf8");

    return JSON.parse(content) as T;
  }

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
