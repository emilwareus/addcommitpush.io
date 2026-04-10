import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { addSource } from "../core/sources/add";
import { refreshSource } from "../core/sources/refresh";
import { initResearchWorkspace } from "../core/init";
import { resumeResearchWorkspace } from "../core/resume";

import {
  createTemporaryWorkspace,
  type TemporaryWorkspace,
} from "./test-helpers";

const execFileAsync = promisify(execFile);
const SOURCE_REFRESH_SCRIPT_PATH = fileURLToPath(
  new URL("../../../../scripts/research-source-refresh.ts", import.meta.url),
);

describe("research source refresh flow", () => {
  let temporaryWorkspace: TemporaryWorkspace;

  beforeEach(async () => {
    temporaryWorkspace = await createTemporaryWorkspace("researcher-source-refresh-");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-11T00:00:00Z"));

    await initResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      title: "Deep Research OS",
      question: "How should evidence stay refreshable?",
    });
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
  });

  afterEach(async () => {
    vi.useRealTimers();
    await temporaryWorkspace.cleanup();
  });

  test("stores append-only captures under data/snapshots and preserves prior evidence", async () => {
    const firstCaptureFile = await createCaptureFile("source.html", "<html>first</html>");
    const secondCaptureFile = await createCaptureFile("source-v2.html", "<html>second</html>");

    const firstResult = await refreshSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      sourceId: "SRC-0001",
      captureKind: "snapshot",
      captureFile: firstCaptureFile,
      capturedAt: "2026-04-11T01:00:00.000Z",
      now: new Date("2026-04-11T01:00:00Z"),
    });
    const secondResult = await refreshSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      sourceId: "SRC-0001",
      captureKind: "snapshot",
      captureFile: secondCaptureFile,
      capturedAt: "2026-04-12T01:00:00.000Z",
      now: new Date("2026-04-12T01:00:00Z"),
    });

    expect(firstResult.latestCapturePath).toBe(
      "data/snapshots/SRC-0001/20260411T010000Z/source.html",
    );
    expect(secondResult.latestCapturePath).toBe(
      "data/snapshots/SRC-0001/20260412T010000Z/source-v2.html",
    );

    const sources = await readWorkspaceJson<{
      sources: Array<{
        latest_capture_path: string | null;
        captures: Array<{ path: string }>;
      }>;
    }>("sources.json");

    expect(sources.sources[0]?.latest_capture_path).toBe(
      "data/snapshots/SRC-0001/20260412T010000Z/source-v2.html",
    );
    expect(sources.sources[0]?.captures).toMatchObject([
      {
        kind: "snapshot",
        path: "data/snapshots/SRC-0001/20260411T010000Z/source.html",
        captured_at: "2026-04-11T01:00:00.000Z",
      },
      {
        kind: "snapshot",
        path: "data/snapshots/SRC-0001/20260412T010000Z/source-v2.html",
        captured_at: "2026-04-12T01:00:00.000Z",
      },
    ]);
    expect(
      await readWorkspaceText("data/snapshots/SRC-0001/20260411T010000Z/source.html"),
    ).toBe("<html>first</html>");
    expect(
      await readWorkspaceText("data/snapshots/SRC-0001/20260412T010000Z/source-v2.html"),
    ).toBe("<html>second</html>");
  });

  test("derives stale state from manifest freshness and clears it after a fresh capture", async () => {
    const staleResult = await refreshSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      sourceId: "SRC-0001",
      now: new Date("2026-05-20T00:00:00Z"),
    });

    expect(staleResult.sideStates).toContain("stale");

    const freshCaptureFile = await createCaptureFile("source-fresh.html", "<html>fresh</html>");
    const freshResult = await refreshSource({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
      sourceId: "SRC-0001",
      captureKind: "snapshot",
      captureFile: freshCaptureFile,
      capturedAt: "2026-05-20T00:00:00.000Z",
      markRejected: true,
      now: new Date("2026-05-20T00:00:00Z"),
    });

    expect(freshResult.sideStates).not.toContain("stale");
    expect(freshResult.sideStates).toContain("rejected");

    const manifest = await readWorkspaceJson<{
      freshness: { debt: number; last_source_sync_at: string | null };
    }>("manifest.json");
    const resumed = await resumeResearchWorkspace({
      projectRoot: temporaryWorkspace.rootDir,
      slug: "deep-research-os",
    });

    expect(manifest.freshness.debt).toBe(0);
    expect(manifest.freshness.last_source_sync_at).toBe("2026-05-20T00:00:00.000Z");
    expect(resumed.inventory.sources).toBe(1);
    expect(resumed.nextRecommendedAction).toBe("extract-insights");
  });

  test("supports manual side-state overrides and the thin refresh CLI", async () => {
    const captureFile = await createCaptureFile("cli-source.html", "<html>cli</html>");

    const { stdout } = await execFileAsync(
      "pnpm",
      [
        "exec",
        "tsx",
        SOURCE_REFRESH_SCRIPT_PATH,
        "--project-root",
        temporaryWorkspace.rootDir,
        "--slug",
        "deep-research-os",
        "--canonical-url",
        "https://ajv.js.org/guide/formats.html",
        "--capture-kind",
        "snapshot",
        "--capture-file",
        captureFile,
        "--captured-at",
        "2026-04-11T02:00:00.000Z",
        "--mark-superseded",
        "--mark-rejected",
      ],
      {
        cwd: process.cwd(),
      },
    );

    expect(JSON.parse(stdout)).toMatchObject({
      sourceId: "SRC-0001",
      canonicalUrl: "https://ajv.js.org/guide/formats.html",
      latestCapturePath: "data/snapshots/SRC-0001/20260411T020000Z/cli-source.html",
      sideStates: ["superseded", "rejected"],
    });
  });

  async function createCaptureFile(fileName: string, content: string): Promise<string> {
    const captureFilePath = join(temporaryWorkspace.rootDir, fileName);
    await writeFile(captureFilePath, content, "utf8");
    return captureFilePath;
  }

  async function readWorkspaceJson<T>(relativePath: string): Promise<T> {
    const filePath = join(
      temporaryWorkspace.rootDir,
      "researcher",
      "researches",
      "deep-research-os",
      relativePath,
    );
    const content = await readFile(filePath, "utf8");

    return JSON.parse(content) as T;
  }

  async function readWorkspaceText(relativePath: string): Promise<string> {
    const filePath = join(
      temporaryWorkspace.rootDir,
      "researcher",
      "researches",
      "deep-research-os",
      relativePath,
    );

    return readFile(filePath, "utf8");
  }
});
