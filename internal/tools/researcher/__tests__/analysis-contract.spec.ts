import { describe, expect, test } from "vitest";

import { parseAnalysisArtifact, renderAnalysisArtifact } from "../core/artifacts/markdown";

describe("analysis artifact contract", () => {
  test("parses a valid analysis document with the required ordered sections", () => {
    const document = parseAnalysisArtifact(`---
id: ANL-0001
title: Pricing landscape
status: draft
confidence: medium
derived_from_insights:
  - INS-0002
  - INS-0001
tags:
  - pricing
linked_reports:
  - RPT-0001
transitional_scaffold: false
created_at: 2026-04-11T00:00:00.000Z
updated_at: 2026-04-11T00:30:00.000Z
---

# Analysis

## Question

What does pricing pressure imply for coding-agent positioning?

## Synthesis

The referenced insights suggest the market is compressing while feature bundles expand.

## Contradictions

- Some vendors keep list price flat while shifting enterprise packaging.

## Caveats

- Public pricing pages may not reflect negotiated enterprise terms.

## Open Questions

- Which price moves are durable versus promotional?

## Next Moves

- Compare enterprise SKU changes over the last two quarters.
`);

    expect(document.frontmatter.derived_from_insights).toEqual(["INS-0001", "INS-0002"]);
    expect(document.sections.contradictions).toEqual([
      "Some vendors keep list price flat while shifting enterprise packaging.",
    ]);
  });

  test("rejects missing structured sections and single-insight analysis unless scaffolded", () => {
    expect(() =>
      parseAnalysisArtifact(`---
id: ANL-0001
title: Broken analysis
status: draft
confidence: medium
derived_from_insights:
  - INS-0001
tags: []
linked_reports: []
transitional_scaffold: false
created_at: 2026-04-11T00:00:00.000Z
updated_at: 2026-04-11T00:00:00.000Z
---

# Analysis

## Question

Question.

## Synthesis

Synthesis.

## Contradictions

- None noted yet.

## Caveats

- None noted yet.

## Open Questions

- None noted yet.

## Next Moves

- Next.
`),
    ).toThrow(
      "Analysis derived_from_insights must include at least two insights unless transitional_scaffold is true",
    );

    expect(() =>
      parseAnalysisArtifact(`---
id: ANL-0001
title: Missing open questions
status: draft
confidence: medium
derived_from_insights:
  - INS-0001
  - INS-0002
tags: []
linked_reports: []
transitional_scaffold: false
created_at: 2026-04-11T00:00:00.000Z
updated_at: 2026-04-11T00:00:00.000Z
---

# Analysis

## Question

Question.

## Synthesis

Synthesis.

## Contradictions

- None noted yet.

## Caveats

- None noted yet.

## Next Moves

- Next.
`),
    ).toThrow("Artifact sections must match the canonical order");
  });

  test("allows the D-40 scaffold exception and renders canonical markdown", () => {
    const scaffolded = parseAnalysisArtifact(`---
id: ANL-0001
title: Scaffold
status: draft
confidence: low
derived_from_insights:
  - INS-0001
tags: []
linked_reports: []
transitional_scaffold: true
created_at: 2026-04-11T00:00:00.000Z
updated_at: 2026-04-11T00:00:00.000Z
---

# Analysis

## Question

Question.

## Synthesis

Synthesis.

## Contradictions

- None noted yet.

## Caveats

- None noted yet.

## Open Questions

- None noted yet.

## Next Moves

- Next.
`);

    expect(scaffolded.frontmatter.transitional_scaffold).toBe(true);

    const rendered = renderAnalysisArtifact({
      frontmatter: {
        id: "ANL-0001",
        title: "Scaffold",
        status: "draft",
        confidence: "low",
        derived_from_insights: ["INS-0001"],
        tags: [],
        linked_reports: [],
        transitional_scaffold: true,
        created_at: "2026-04-11T00:00:00.000Z",
        updated_at: "2026-04-11T00:00:00.000Z",
      },
      sections: {
        question: "Question.",
        synthesis: "Synthesis.",
        contradictions: ["None noted yet."],
        caveats: ["None noted yet."],
        openQuestions: ["None noted yet."],
        nextMoves: ["Next."],
      },
    });

    expect(rendered).toContain("transitional_scaffold: true");
    expect(rendered).toContain("## Open Questions");
  });
});
