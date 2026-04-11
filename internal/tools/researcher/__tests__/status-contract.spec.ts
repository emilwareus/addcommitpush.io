import { describe, expect, test } from "vitest";

import {
  createInitialNextResearchIds,
  createInitialVerificationSummary,
  createManifestPaths,
  type ResearchManifest,
} from "../contracts/manifest";
import {
  validateInsightFrontmatter,
  validateManifest,
  validateReportFrontmatter,
  validateStatusSummary,
} from "../contracts/validators";
import { parseInsightArtifact, renderInsightArtifact } from "../core/artifacts/markdown";

describe("phase 5 status contracts", () => {
  test("accepts compact verification counts in the manifest and rejects malformed shapes", () => {
    const manifest: ResearchManifest = {
      contract_version: "1.0",
      research: {
        id: "RES-20260410-deep-research-os",
        slug: "deep-research-os",
        title: "Deep Research OS",
      },
      status: {
        state: "active",
        stage: "extract",
      },
      questions: {
        active: ["Which insights need refresh?"],
      },
      freshness: {
        window_days: 30,
        last_source_sync_at: "2026-04-11T00:00:00.000Z",
        debt: 1,
      },
      verification: {
        debt: 3,
        unsupported_insights: 1,
        unsupported_reports: 1,
        contradicted_analysis: 1,
        unresolved_analysis_questions: 0,
      },
      inventory: {
        sources: 2,
        insights: 1,
        analysis: 1,
        reports: 1,
      },
      paths: createManifestPaths("deep-research-os"),
      next_ids: createInitialNextResearchIds(),
    };

    expect(validateManifest(manifest)).toEqual(manifest);

    expect(() =>
      validateManifest({
        ...manifest,
        verification: {
          ...createInitialVerificationSummary(),
          unsupported_reports: -1,
        },
      }),
    ).toThrow("manifest.json failed schema validation");

    expect(() =>
      validateManifest({
        ...manifest,
        verification: {
          debt: 1,
        },
      }),
    ).toThrow("manifest.json failed schema validation");
  });

  test("accepts known artifact side states and rejects unknown values", () => {
    const insightFrontmatter = {
      id: "INS-0001",
      title: "Pricing compression",
      status: "draft",
      confidence: "medium",
      side_states: ["stale", "unsupported"],
      derived_from_sources: ["SRC-0001"],
      tags: ["pricing"],
      linked_analysis: [],
      linked_reports: [],
      created_at: "2026-04-11T00:00:00.000Z",
      updated_at: "2026-04-11T01:00:00.000Z",
    };

    expect(validateInsightFrontmatter(insightFrontmatter)).toEqual(insightFrontmatter);
    expect(
      validateReportFrontmatter({
        id: "RPT-0001",
        title: "Pricing brief",
        audience: "founder",
        angle: "pricing",
        thesis: "Pricing is compressing.",
        status: "draft",
        side_states: ["stale"],
        derived_from_analysis: ["ANL-0001"],
        derived_from_insights: ["INS-0001"],
        fresh_as_of: "2026-04-11",
        created_at: "2026-04-11T00:00:00.000Z",
        updated_at: "2026-04-11T01:00:00.000Z",
      }),
    ).toMatchObject({
      side_states: ["stale"],
    });

    expect(() =>
      validateInsightFrontmatter({
        ...insightFrontmatter,
        side_states: ["stale", "rejected"],
      }),
    ).toThrow("insight frontmatter failed schema validation");

    expect(() =>
      validateReportFrontmatter({
        id: "RPT-0001",
        title: "Pricing brief",
        audience: "founder",
        angle: "pricing",
        thesis: "Pricing is compressing.",
        status: "draft",
        side_states: ["unsupported", "invalid"],
        derived_from_analysis: ["ANL-0001"],
        derived_from_insights: ["INS-0001"],
        fresh_as_of: "2026-04-11",
        created_at: "2026-04-11T00:00:00.000Z",
        updated_at: "2026-04-11T01:00:00.000Z",
      }),
    ).toThrow("report frontmatter failed schema validation");
  });

  test("parses and renders persisted side states deterministically", () => {
    const document = parseInsightArtifact(`---
id: INS-0001
title: Pricing compression
status: draft
confidence: medium
side_states:
  - unsupported
  - stale
derived_from_sources:
  - SRC-0001
tags:
  - pricing
linked_analysis: []
linked_reports: []
created_at: 2026-04-11T00:00:00.000Z
updated_at: 2026-04-11T01:00:00.000Z
---

# Insight

## Claim

Pricing is compressing.

## Why It Matters

The change affects packaging and positioning.

## Evidence

- \`SRC-0001\`: Public pricing dropped year over year.

## Caveats

- None noted yet.

## Reuse Notes

Use this in pricing reports.
`);

    expect(document.frontmatter.side_states).toEqual(["stale", "unsupported"]);

    const rendered = renderInsightArtifact(document);

    expect(rendered).toContain('side_states:\n  - "stale"\n  - "unsupported"');
  });

  test("requires the full status summary routing boundary", () => {
    const summary = {
      research: {
        id: "RES-20260410-deep-research-os",
        slug: "deep-research-os",
        title: "Deep Research OS",
      },
      status: {
        stage: "extract",
        state: "active",
      },
      openQuestions: [],
      inventory: {
        sources: 2,
        insights: 1,
        analysis: 1,
        reports: 1,
      },
      freshnessDebt: {
        count: 1,
        windowDays: 30,
        lastSourceSyncAt: "2026-04-11T00:00:00.000Z",
        staleSources: ["SRC-0001"],
      },
      verificationDebt: {
        count: 2,
        unsupportedInsights: ["INS-0001"],
        unsupportedReports: ["RPT-0001"],
        contradictedAnalysis: ["ANL-0001"],
        analysisWithOpenQuestions: [],
        blockedReports: ["RPT-0001"],
      },
      impacted: {
        insights: ["INS-0001"],
        analysis: ["ANL-0001"],
        reports: ["RPT-0001"],
      },
      nextRecommendedAction: "refresh-sources",
    };

    expect(validateStatusSummary(summary)).toEqual(summary);

    expect(() =>
      validateStatusSummary({
        ...summary,
        impacted: {
          insights: ["INS-0001"],
          reports: ["RPT-0001"],
        },
      }),
    ).toThrow("status summary failed schema validation");

    expect(() =>
      validateStatusSummary({
        ...summary,
        nextRecommendedAction: "",
      }),
    ).toThrow("status summary failed schema validation");
  });
});
