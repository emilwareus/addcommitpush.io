import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { initResearchWorkspace } from "../core/init";
import { upsertInsight } from "../core/insights/upsert";
import { addSource } from "../core/sources/add";

import {
  createTemporaryWorkspace,
  type TemporaryWorkspace,
} from "./test-helpers";

const execFileAsync = promisify(execFile);
const INSIGHT_SCRIPT_PATH = fileURLToPath(
  new URL("../../../../scripts/research-insight.ts", import.meta.url),
);

describe("research insight upsert flow", () => {
  let temporaryWorkspace: TemporaryWorkspace;

  beforeEach(async () => {
    temporaryWorkspace = await createTemporaryWorkspace("researcher-insight-upsert-");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-11T00:00:00Z"));

    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Deep Research OS",
      question: "How should findings become reusable insights?",
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
  });

  afterEach(async () => {
    vi.useRealTimers();
    await temporaryWorkspace.cleanup();
  });

  test("creates a new insight, allocates the next ID, and syncs manifest counters", async () => {
    const result = await upsertInsight({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Pricing compression",
      sourceIds: ["SRC-0002", "SRC-0001"],
      claim: "Margins are tightening across coding-agent products.",
      whyItMatters: "The pricing signal should be reusable across reports.",
      evidence: [
        {
          sourceId: "SRC-0002",
          note: "Competitors expanded bundled features without raising price.",
        },
        {
          sourceId: "SRC-0001",
          note: "Public pricing dropped year over year.",
        },
      ],
      caveats: ["Enterprise discounts may differ from published pricing."],
      reuseNotes: "Use this in pricing and market-map reports.",
      now: new Date("2026-04-11T02:00:00Z"),
    });

    expect(result).toEqual({
      operation: "created",
      insightId: "INS-0001",
      path: "insights/INS-0001-pricing-compression.md",
      sourceIds: ["SRC-0001", "SRC-0002"],
    });

    const manifest = await readWorkspaceJson<{
      inventory: { insights: number };
      next_ids: { insight: number };
    }>("manifest.json");
    const files = await readdir(workspaceInsightsPath());

    expect(manifest.inventory.insights).toBe(1);
    expect(manifest.next_ids.insight).toBe(2);
    expect(files).toContain("INS-0001-pricing-compression.md");

    const content = await readWorkspaceText("insights/INS-0001-pricing-compression.md");
    expect(content).toContain('id: "INS-0001"');
    expect(content).toContain("## Evidence");
  });

  test("updates an existing insight in place, preserves the stable ID, and keeps deterministic output", async () => {
    await upsertInsight({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Pricing compression",
      sourceIds: ["SRC-0001"],
      claim: "Margins are tightening across coding-agent products.",
      whyItMatters: "Initial why-it-matters copy.",
      evidence: [
        {
          sourceId: "SRC-0001",
          note: "Public pricing dropped year over year.",
        },
      ],
      caveats: ["None noted yet."],
      reuseNotes: "Initial notes.",
      now: new Date("2026-04-11T02:00:00Z"),
    });

    const result = await upsertInsight({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      insightId: "INS-0001",
      title: "Pricing compression updated",
      sourceIds: ["SRC-0001", "SRC-0002"],
      claim: "Margins are tightening across coding-agent products.",
      whyItMatters: "Updated why-it-matters copy.",
      evidence: [
        {
          sourceId: "SRC-0001",
          note: "Public pricing dropped year over year.",
        },
        {
          sourceId: "SRC-0002",
          note: "Feature bundling increased at the same price point.",
        },
      ],
      caveats: ["Enterprise pricing can differ."],
      reuseNotes: "Updated notes.",
      now: new Date("2026-04-11T03:00:00Z"),
    });

    expect(result).toEqual({
      operation: "updated",
      insightId: "INS-0001",
      path: "insights/INS-0001-pricing-compression-updated.md",
      sourceIds: ["SRC-0001", "SRC-0002"],
    });

    const manifest = await readWorkspaceJson<{
      inventory: { insights: number };
      next_ids: { insight: number };
    }>("manifest.json");
    const files = await readdir(workspaceInsightsPath());

    expect(manifest.inventory.insights).toBe(1);
    expect(manifest.next_ids.insight).toBe(2);
    expect(files).toEqual(["INS-0001-pricing-compression-updated.md"]);
  });

  test("exposes a thin CLI that prints deterministic JSON", async () => {
    const { stdout } = await execFileAsync(
      "pnpm",
      [
        "exec",
        "tsx",
        INSIGHT_SCRIPT_PATH,
        "--project-root",
        temporaryWorkspace.rootDir,
        "--slug",
        "deep-research-os",
        "--title",
        "Pricing compression",
        "--source-id",
        "SRC-0001",
        "--claim",
        "Margins are tightening across coding-agent products.",
        "--why-it-matters",
        "The pricing signal should be reusable across reports.",
        "--evidence",
        "SRC-0001::Public pricing dropped year over year.",
        "--caveat",
        "None noted yet.",
        "--reuse-notes",
        "Use this in pricing and market-map reports.",
      ],
      {
        cwd: process.cwd(),
      },
    );

    expect(JSON.parse(stdout)).toEqual({
      operation: "created",
      insightId: "INS-0001",
      path: "insights/INS-0001-pricing-compression.md",
      sourceIds: ["SRC-0001"],
    });
  });

  function workspaceInsightsPath(): string {
    return join(
      temporaryWorkspace.rootDir,
      "researcher",
      "researches",
      "deep-research-os",
      "insights",
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
