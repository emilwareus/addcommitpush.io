import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { upsertAnalysis } from "../core/analysis/upsert";
import { initResearchWorkspace } from "../core/init";
import { upsertInsight } from "../core/insights/upsert";
import { addSource } from "../core/sources/add";

import {
  createTemporaryWorkspace,
  type TemporaryWorkspace,
} from "./test-helpers";

const execFileAsync = promisify(execFile);
const ANALYSIS_SCRIPT_PATH = fileURLToPath(
  new URL("../../../../scripts/research-analysis.ts", import.meta.url),
);

describe("research analysis upsert flow", () => {
  let temporaryWorkspace: TemporaryWorkspace;

  beforeEach(async () => {
    temporaryWorkspace = await createTemporaryWorkspace("researcher-analysis-upsert-");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-11T00:00:00Z"));

    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Deep Research OS",
      question: "How should multiple insights become analysis artifacts?",
    });
    await addSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Pricing report",
      url: "https://example.com/pricing-report",
      type: "webpage",
      origin: {
        type: "manual",
        value: "phase-3-spec",
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
        value: "phase-3-spec",
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
  });

  afterEach(async () => {
    vi.useRealTimers();
    await temporaryWorkspace.cleanup();
  });

  test("creates a new analysis, allocates the next ID, and syncs insight backlinks", async () => {
    const result = await upsertAnalysis({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Pricing landscape",
      insightIds: ["INS-0002", "INS-0001"],
      question: "What does pricing pressure imply for positioning?",
      synthesis:
        "The combined insights suggest margins are tightening while feature bundles expand.",
      contradictions: ["Some vendors hold list price steady and shift packaging instead."],
      caveats: ["Public pricing pages may lag behind enterprise negotiations."],
      openQuestions: ["Which price moves are durable versus promotional?"],
      nextMoves: ["Compare enterprise SKU changes over the last two quarters."],
      now: new Date("2026-04-11T02:00:00Z"),
    });

    expect(result).toEqual({
      operation: "created",
      analysisId: "ANL-0001",
      path: "analysis/ANL-0001-pricing-landscape.md",
      insightIds: ["INS-0001", "INS-0002"],
    });

    const manifest = await readWorkspaceJson<{
      inventory: { analysis: number };
      next_ids: { analysis: number };
    }>("manifest.json");
    const analysisFiles = await readdir(workspaceAnalysisPath());

    expect(manifest.inventory.analysis).toBe(1);
    expect(manifest.next_ids.analysis).toBe(2);
    expect(analysisFiles).toEqual(["ANL-0001-pricing-landscape.md"]);

    const firstInsight = await readWorkspaceText("insights/INS-0001-pricing-compression.md");
    const secondInsight = await readWorkspaceText(
      "insights/INS-0002-feature-bundling-pressure.md",
    );

    expect(firstInsight).toContain('linked_analysis:\n  - "ANL-0001"');
    expect(secondInsight).toContain('linked_analysis:\n  - "ANL-0001"');
  });

  test("updates an analysis in place and reconciles removed and added insight backlinks", async () => {
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

    await addSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Enterprise packaging",
      url: "https://example.com/enterprise-packaging",
      type: "webpage",
      origin: {
        type: "manual",
        value: "phase-3-spec",
      },
      now: new Date("2026-04-11T02:05:00Z"),
    });
    await upsertInsight({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Enterprise packaging complexity",
      sourceIds: ["SRC-0003"],
      claim: "Enterprise packaging complexity obscures direct price comparisons.",
      whyItMatters: "This explains conflicting list-price signals.",
      evidence: [
        {
          sourceId: "SRC-0003",
          note: "Enterprise packaging shifted while list pricing stayed flat.",
        },
      ],
      caveats: ["None noted yet."],
      reuseNotes: "Use this in pricing and enterprise GTM reports.",
      now: new Date("2026-04-11T02:06:00Z"),
    });

    const result = await upsertAnalysis({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      analysisId: "ANL-0001",
      title: "Pricing landscape revised",
      insightIds: ["INS-0002", "INS-0003"],
      question: "How should positioning shift as pricing compresses?",
      synthesis:
        "Feature bundling and enterprise packaging now explain more of the variance.",
      contradictions: ["List-price stability still conflicts with some discounting signals."],
      caveats: ["Enterprise packaging is harder to observe than public list price."],
      openQuestions: ["Which packaging moves affect win rate the most?"],
      nextMoves: ["Compare packaging changes against reported deal outcomes."],
      now: new Date("2026-04-11T03:00:00Z"),
    });

    expect(result).toEqual({
      operation: "updated",
      analysisId: "ANL-0001",
      path: "analysis/ANL-0001-pricing-landscape-revised.md",
      insightIds: ["INS-0002", "INS-0003"],
    });

    const firstInsight = await readWorkspaceText("insights/INS-0001-pricing-compression.md");
    const secondInsight = await readWorkspaceText(
      "insights/INS-0002-feature-bundling-pressure.md",
    );
    const thirdInsight = await readWorkspaceText(
      "insights/INS-0003-enterprise-packaging-complexity.md",
    );

    expect(firstInsight).toContain("linked_analysis: []");
    expect(secondInsight).toContain('linked_analysis:\n  - "ANL-0001"');
    expect(thirdInsight).toContain('linked_analysis:\n  - "ANL-0001"');
  });

  test("exposes a thin CLI that prints deterministic JSON", async () => {
    const { stdout } = await execFileAsync(
      "pnpm",
      [
        "exec",
        "tsx",
        ANALYSIS_SCRIPT_PATH,
        "--project-root",
        temporaryWorkspace.rootDir,
        "--slug",
        "deep-research-os",
        "--title",
        "Pricing landscape",
        "--insight-id",
        "INS-0001",
        "--insight-id",
        "INS-0002",
        "--question",
        "What does pricing pressure imply for positioning?",
        "--synthesis",
        "The combined insights suggest margins are tightening while feature bundles expand.",
        "--contradiction",
        "Some vendors hold list price steady and shift packaging instead.",
        "--caveat",
        "Public pricing pages may lag behind enterprise negotiations.",
        "--open-question",
        "Which price moves are durable versus promotional?",
        "--next-move",
        "Compare enterprise SKU changes over the last two quarters.",
      ],
      {
        cwd: process.cwd(),
      },
    );

    expect(JSON.parse(stdout)).toEqual({
      operation: "created",
      analysisId: "ANL-0001",
      path: "analysis/ANL-0001-pricing-landscape.md",
      insightIds: ["INS-0001", "INS-0002"],
    });
  });

  function workspaceAnalysisPath(): string {
    return join(
      temporaryWorkspace.rootDir,
      "researcher",
      "researches",
      "deep-research-os",
      "analysis",
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
