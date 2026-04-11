import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { initResearchWorkspace } from "../core/init";
import { upsertInsight } from "../core/insights/upsert";
import { addSource } from "../core/sources/add";

import {
  createTemporaryWorkspace,
  type TemporaryWorkspace,
} from "./test-helpers";

describe("research insight lineage flow", () => {
  let temporaryWorkspace: TemporaryWorkspace;

  beforeEach(async () => {
    temporaryWorkspace = await createTemporaryWorkspace("researcher-insight-lineage-");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-11T00:00:00Z"));

    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Deep Research OS",
      question: "How should source lineage stay synchronized?",
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

  test("reconciles source backlinks when an insight changes its supporting sources", async () => {
    await upsertInsight({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Pricing compression",
      sourceIds: ["SRC-0001"],
      claim: "Margins are tightening across coding-agent products.",
      whyItMatters: "The pricing signal should be reusable across reports.",
      evidence: [
        {
          sourceId: "SRC-0001",
          note: "Public pricing dropped year over year.",
        },
      ],
      caveats: ["None noted yet."],
      reuseNotes: "Use this in pricing and market-map reports.",
      now: new Date("2026-04-11T02:00:00Z"),
    });

    await upsertInsight({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      insightId: "INS-0001",
      title: "Pricing compression",
      sourceIds: ["SRC-0002"],
      claim: "Margins are tightening across coding-agent products.",
      whyItMatters: "The pricing signal should be reusable across reports.",
      evidence: [
        {
          sourceId: "SRC-0002",
          note: "Competitors expanded bundled features without raising price.",
        },
      ],
      caveats: ["None noted yet."],
      reuseNotes: "Use this in pricing and market-map reports.",
      now: new Date("2026-04-11T03:00:00Z"),
    });

    const sources = await readWorkspaceJson<{
      sources: Array<{ id: string; linked_insights: string[] }>;
    }>("sources.json");

    expect(sources.sources).toEqual([
      {
        id: "SRC-0001",
        linked_insights: [],
      },
      {
        id: "SRC-0002",
        linked_insights: ["INS-0001"],
      },
    ]);
  });

  test("fails hard for missing sources and obvious duplicates", async () => {
    await expect(
      upsertInsight({
        projectRoot: temporaryWorkspace.rootDir,
        slug: "deep-research-os",
        title: "Missing source",
        sourceIds: ["SRC-9999"],
        claim: "Margins are tightening across coding-agent products.",
        whyItMatters: "The pricing signal should be reusable across reports.",
        evidence: [
          {
            sourceId: "SRC-9999",
            note: "Does not exist.",
          },
        ],
        caveats: ["None noted yet."],
        reuseNotes: "Use this in pricing and market-map reports.",
      }),
    ).rejects.toThrow("Supporting source not found: SRC-9999");

    await upsertInsight({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Pricing compression",
      sourceIds: ["SRC-0001"],
      claim: "Margins are tightening across coding-agent products.",
      whyItMatters: "The pricing signal should be reusable across reports.",
      evidence: [
        {
          sourceId: "SRC-0001",
          note: "Public pricing dropped year over year.",
        },
      ],
      caveats: ["None noted yet."],
      reuseNotes: "Use this in pricing and market-map reports.",
      now: new Date("2026-04-11T02:00:00Z"),
    });

    await expect(
      upsertInsight({
        projectRoot: temporaryWorkspace.rootDir,
        slug: "deep-research-os",
        title: "Pricing compression",
        sourceIds: ["SRC-0001", "SRC-0002"],
        claim: "Margins are tightening across coding-agent products.",
        whyItMatters: "The pricing signal should be reusable across reports.",
        evidence: [
          {
            sourceId: "SRC-0001",
            note: "Public pricing dropped year over year.",
          },
          {
            sourceId: "SRC-0002",
            note: "Competitors expanded bundled features without raising price.",
          },
        ],
        caveats: ["None noted yet."],
        reuseNotes: "Use this in pricing and market-map reports.",
        now: new Date("2026-04-11T02:30:00Z"),
      }),
    ).rejects.toThrow("Duplicate insight detected: INS-0001");
  });

  async function readWorkspaceJson<T>(fileName: string): Promise<T> {
    const filePath = join(
      temporaryWorkspace.rootDir,
      "researcher",
      "researches",
      "deep-research-os",
      fileName,
    );
    const content = await readFile(filePath, "utf8");
    const parsedContent = JSON.parse(content) as {
      sources?: Array<{ id: string; linked_insights: string[] }>;
    };

    if (parsedContent.sources) {
      return {
        sources: parsedContent.sources.map((source) => ({
          id: source.id,
          linked_insights: source.linked_insights,
        })),
      } as T;
    }

    return parsedContent as T;
  }
});
