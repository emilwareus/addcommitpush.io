import { describe, test } from "vitest";

describe("research workspace resume flow", () => {
  test.todo(
    "restores research context from disk-only artifacts and rejects any dependency on prior chat history",
  );
  test.todo(
    "loads brief.md, manifest.json, and sources.json, then scans workspace inventory to summarize stage, freshness debt, and report coverage",
  );
  test.todo(
    "derives nextRecommendedAction from validated on-disk state rather than prompt-specific control flow",
  );
  test.todo(
    "keeps resume logic runtime-neutral so Codex and Claude Code adapters can stay thin wrappers around shared core behavior",
  );
});
