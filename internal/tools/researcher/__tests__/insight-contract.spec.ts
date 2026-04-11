import { describe, expect, test } from "vitest";

import { parseInsightArtifact, renderInsightArtifact } from "../core/artifacts/markdown";
import { createInsightFingerprint } from "../core/insights/dedupe";

describe("insight artifact contract", () => {
  test("parses a valid insight document and normalizes lineage fields", () => {
    const document = parseInsightArtifact(`---
id: INS-0001
title: Pricing compression
status: draft
confidence: medium
side_states:
  - stale
derived_from_sources:
  - SRC-0002
  - SRC-0001
tags:
  - ai-agents
  - pricing
linked_analysis:
  - ANL-0002
  - ANL-0001
linked_reports:
  - RPT-0001
created_at: 2026-04-11T00:00:00.000Z
updated_at: 2026-04-11T01:00:00.000Z
---

# Insight

## Claim

Margins are tightening across coding-agent products.

## Why It Matters

The market signal is reusable across multiple strategy reports.

## Evidence

- \`SRC-0002\`: Product pricing dropped year over year.
- \`SRC-0001\`: Competitors bundle more features at the same price.

## Caveats

- Pricing pages can lag behind negotiated enterprise discounts.

## Reuse Notes

Use this insight in competitive landscape and pricing reports.
`);

    expect(document.frontmatter.derived_from_sources).toEqual(["SRC-0001", "SRC-0002"]);
    expect(document.frontmatter.side_states).toEqual(["stale"]);
    expect(document.frontmatter.linked_analysis).toEqual(["ANL-0001", "ANL-0002"]);
    expect(document.sections.evidence).toEqual([
      {
        sourceId: "SRC-0002",
        note: "Product pricing dropped year over year.",
      },
      {
        sourceId: "SRC-0001",
        note: "Competitors bundle more features at the same price.",
      },
    ]);
  });

  test("rejects malformed IDs, missing sections, and evidence/frontmatter drift", () => {
    expect(() =>
      parseInsightArtifact(`---
id: INS-99
title: Broken insight
status: draft
confidence: medium
side_states: []
derived_from_sources:
  - SRC-0001
tags: []
linked_analysis: []
linked_reports: []
created_at: 2026-04-11T00:00:00.000Z
updated_at: 2026-04-11T00:00:00.000Z
---

# Insight

## Claim

Broken ID.

## Why It Matters

It should fail.

## Evidence

- \`SRC-0001\`: Supporting note.

## Caveats

- None noted yet.

## Reuse Notes

Do not use.
`),
    ).toThrow("insight frontmatter failed schema validation");

    expect(() =>
      parseInsightArtifact(`---
id: INS-0001
title: Missing caveats
status: draft
confidence: medium
side_states: []
derived_from_sources:
  - SRC-0001
tags: []
linked_analysis: []
linked_reports: []
created_at: 2026-04-11T00:00:00.000Z
updated_at: 2026-04-11T00:00:00.000Z
---

# Insight

## Claim

Claim.

## Why It Matters

Why it matters.

## Evidence

- \`SRC-0001\`: Supporting note.

## Reuse Notes

Reuse notes.
`),
    ).toThrow("Artifact sections must match the canonical order");

    expect(() =>
      parseInsightArtifact(`---
id: INS-0001
title: Drift
status: draft
confidence: medium
side_states: []
derived_from_sources:
  - SRC-0001
tags: []
linked_analysis: []
linked_reports: []
created_at: 2026-04-11T00:00:00.000Z
updated_at: 2026-04-11T00:00:00.000Z
---

# Insight

## Claim

Claim.

## Why It Matters

Why it matters.

## Evidence

- \`SRC-0002\`: Supporting note.

## Caveats

- None noted yet.

## Reuse Notes

Reuse notes.
`),
    ).toThrow("Insight derived_from_sources must match Evidence source IDs");
  });

  test("enforces deterministic duplicate fingerprints and canonical rendering", () => {
    const fingerprint = createInsightFingerprint({
      title: " Pricing  Compression ",
      claim: "Margins are tightening across coding-agent products!",
      derivedFromSources: ["SRC-0002", "SRC-0001", "SRC-0002"],
    });

    expect(fingerprint).toBe(
      "pricing compression::margins are tightening across coding agent products::SRC-0001|SRC-0002",
    );

    const rendered = renderInsightArtifact({
      frontmatter: {
        id: "INS-0001",
        title: "Pricing compression",
        status: "draft",
        confidence: "medium",
        side_states: ["stale"],
        derived_from_sources: ["SRC-0002", "SRC-0001"],
        tags: ["pricing", "ai-agents"],
        linked_analysis: [],
        linked_reports: [],
        created_at: "2026-04-11T00:00:00.000Z",
        updated_at: "2026-04-11T00:00:00.000Z",
      },
      sections: {
        claim: "Margins are tightening across coding-agent products.",
        whyItMatters: "The market signal is reusable.",
        evidence: [
          {
            sourceId: "SRC-0001",
            note: "Competitors bundle more features at the same price.",
          },
          {
            sourceId: "SRC-0002",
            note: "Product pricing dropped year over year.",
          },
        ],
        caveats: ["None noted yet."],
        reuseNotes: "Use this in pricing reports.",
      },
    });

    expect(rendered).toContain("derived_from_sources:");
    expect(rendered).toContain("side_states:");
    expect(rendered).toContain('- `SRC-0001`: Competitors bundle more features at the same price.');
    expect(rendered).toContain("## Reuse Notes");
  });
});
