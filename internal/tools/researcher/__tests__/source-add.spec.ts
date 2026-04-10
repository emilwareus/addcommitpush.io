import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { addSource } from "../core/sources/add";
import { initResearchWorkspace } from "../core/init";

import {
  createTemporaryWorkspace,
  type TemporaryWorkspace,
} from "./test-helpers";

const execFileAsync = promisify(execFile);
const SOURCE_ADD_SCRIPT_PATH = fileURLToPath(
  new URL("../../../../scripts/research-source-add.ts", import.meta.url),
);

describe("research source add flow", () => {
  let temporaryWorkspace: TemporaryWorkspace;

  beforeEach(async () => {
    temporaryWorkspace = await createTemporaryWorkspace("researcher-source-add-");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-11T00:00:00Z"));

    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Deep Research OS",
      question: "How should source registries stay deduplicated?",
    });
  });

  afterEach(async () => {
    vi.useRealTimers();
    await temporaryWorkspace.cleanup();
  });

  test("adds a new source, allocates the next ID, and syncs manifest counters", async () => {
    const result = await addSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Ajv format validation",
      url: "https://ajv.js.org/guide/formats.html",
      type: "webpage",
      origin: {
        type: "manual",
        value: "phase-2-research",
      },
      confidence: "high",
      status: "read",
      tags: ["ajv", "validation"],
      notes: "Primary schema source",
      now: new Date("2026-04-11T00:00:00Z"),
    });

    expect(result).toEqual({
      operation: "created",
      sourceId: "SRC-0001",
      canonicalUrl: "https://ajv.js.org/guide/formats.html",
    });

    const manifest = await readWorkspaceJson<{
      freshness: { debt: number; last_source_sync_at: string | null };
      inventory: { sources: number };
      next_ids: { source: number };
    }>("manifest.json");
    const sources = await readWorkspaceJson<{
      updated_at: string | null;
      sources: Array<{
        id: string;
        canonical_url: string;
        status: string;
        side_states: string[];
        latest_capture_path: string | null;
        captures: Array<unknown>;
        linked_insights: string[];
        tags: string[];
      }>;
    }>("sources.json");

    expect(manifest.inventory.sources).toBe(1);
    expect(manifest.next_ids.source).toBe(2);
    expect(manifest.freshness.last_source_sync_at).toBe("2026-04-11T00:00:00.000Z");
    expect(manifest.freshness.debt).toBe(0);
    expect(sources.updated_at).toBe("2026-04-11T00:00:00.000Z");
    expect(sources.sources).toHaveLength(1);
    expect(sources.sources[0]).toMatchObject({
      id: "SRC-0001",
      canonical_url: "https://ajv.js.org/guide/formats.html",
      status: "read",
      side_states: [],
      latest_capture_path: null,
      linked_insights: [],
      tags: ["ajv", "validation"],
    });
    expect(sources.sources[0]?.captures).toEqual([]);
  });

  test("dedupes by canonical URL and updates the existing record in place", async () => {
    await addSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Ajv format validation",
      url: "https://ajv.js.org/guide/formats.html",
      type: "webpage",
      origin: {
        type: "manual",
        value: "phase-2-research",
      },
      now: new Date("2026-04-11T00:00:00Z"),
    });

    const result = await addSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Ajv formats guide",
      url: "https://ajv.js.org/guide/formats.html#ignored-fragment",
      type: "webpage",
      origin: {
        type: "search",
        value: "web",
      },
      confidence: "medium",
      notes: "Updated title via duplicate add",
      now: new Date("2026-04-11T00:30:00Z"),
    });

    expect(result).toEqual({
      operation: "updated",
      sourceId: "SRC-0001",
      canonicalUrl: "https://ajv.js.org/guide/formats.html",
    });

    const manifest = await readWorkspaceJson<{
      inventory: { sources: number };
      next_ids: { source: number };
      freshness: { last_source_sync_at: string | null };
    }>("manifest.json");
    const sources = await readWorkspaceJson<{
      sources: Array<{
        id: string;
        title: string;
        canonical_url: string;
        origin: { type: string; value: string };
        confidence: string;
        notes: string | null;
      }>;
    }>("sources.json");

    expect(manifest.inventory.sources).toBe(1);
    expect(manifest.next_ids.source).toBe(2);
    expect(manifest.freshness.last_source_sync_at).toBe("2026-04-11T00:30:00.000Z");
    expect(sources.sources).toHaveLength(1);
    expect(sources.sources[0]).toMatchObject({
      id: "SRC-0001",
      title: "Ajv formats guide",
      canonical_url: "https://ajv.js.org/guide/formats.html",
      origin: {
        type: "search",
        value: "web",
      },
      confidence: "medium",
      notes: "Updated title via duplicate add",
    });
  });

  test("fails hard for invalid URLs and mismatched research identities", async () => {
    await expect(
      addSource({
        projectRoot: temporaryWorkspace.rootDir,
        slug: "deep-research-os",
        title: "Broken URL",
        url: "notaurl",
        type: "webpage",
        origin: {
          type: "manual",
          value: "phase-2-research",
        },
      }),
    ).rejects.toThrow("Invalid URL");

    const sources = await readWorkspaceJson<{
      research_id: string;
      updated_at: string | null;
      sources: Array<unknown>;
    }>("sources.json");

    sources.research_id = "RES-20260411-other-project";
    await writeWorkspaceJson("sources.json", sources);

    await expect(
      addSource({
        projectRoot: temporaryWorkspace.rootDir,
        slug: "deep-research-os",
        title: "Ajv format validation",
        url: "https://ajv.js.org/guide/formats.html",
        type: "webpage",
        origin: {
          type: "manual",
          value: "phase-2-research",
        },
      }),
    ).rejects.toThrow("sources.json does not match manifest.json research identity");
  });

  test("exposes a thin CLI that prints deterministic JSON", async () => {
    const { stdout } = await execFileAsync(
      "pnpm",
      [
        "exec",
        "tsx",
        SOURCE_ADD_SCRIPT_PATH,
        "--project-root",
        temporaryWorkspace.rootDir,
        "--slug",
        "deep-research-os",
        "--title",
        "Ajv format validation",
        "--url",
        "https://ajv.js.org/guide/formats.html",
        "--type",
        "webpage",
        "--origin-type",
        "manual",
        "--origin-value",
        "phase-2-research",
        "--tag",
        "ajv",
      ],
      {
        cwd: process.cwd(),
      },
    );

    expect(JSON.parse(stdout)).toEqual({
      operation: "created",
      sourceId: "SRC-0001",
      canonicalUrl: "https://ajv.js.org/guide/formats.html",
    });
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

    return JSON.parse(content) as T;
  }

  async function writeWorkspaceJson(fileName: string, value: unknown): Promise<void> {
    const filePath = join(
      temporaryWorkspace.rootDir,
      "researcher",
      "researches",
      "deep-research-os",
      fileName,
    );

    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  }
});
