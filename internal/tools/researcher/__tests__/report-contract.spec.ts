import { describe, expect, test } from "vitest";

import { parseReportArtifact, renderReportArtifact } from "../core/artifacts/markdown";

describe("report artifact contract", () => {
  test("parses a valid report document with canonical sections", () => {
    const document = parseReportArtifact(`---
id: RPT-0001
title: Pricing brief
audience: founder
angle: pricing-pressure
thesis: Pricing is compressing while bundle complexity grows.
status: draft
derived_from_analysis:
  - ANL-0001
derived_from_insights:
  - INS-0002
  - INS-0001
fresh_as_of: 2026-04-11
created_at: 2026-04-11T00:00:00.000Z
updated_at: 2026-04-11T01:00:00.000Z
---

# Report

## Summary

Margins are tightening and packaging complexity is masking the headline move.

## Key Points

- Pricing compression is now visible in public packaging.
- Bundle expansion is absorbing some of the apparent discounting.

## Body

The analysis and direct insights point to the same operating reality.

## Limitations

- Public pricing pages may lag enterprise negotiation behavior.

## Analysis Inputs

- \`ANL-0001\` Pricing landscape

## Insight References

- \`INS-0001\` Pricing compression (sources: \`SRC-0001\`)
- \`INS-0002\` Feature bundling pressure (sources: \`SRC-0002\`)

## Source References

- \`SRC-0001\` Pricing report - https://example.com/pricing-report
- \`SRC-0002\` Competitive teardown - https://example.com/competitive-teardown
`);

    expect(document.frontmatter.derived_from_analysis).toEqual(["ANL-0001"]);
    expect(document.frontmatter.derived_from_insights).toEqual(["INS-0001", "INS-0002"]);
    expect(document.sections.keyPoints).toHaveLength(2);
    expect(document.sections.analysisInputs).toEqual(["`ANL-0001` Pricing landscape"]);
  });

  test("rejects reports without lineage or with non-canonical sections", () => {
    expect(() =>
      parseReportArtifact(`---
id: RPT-0001
title: Broken report
audience: founder
angle: broken
thesis: Missing lineage
status: draft
derived_from_analysis: []
derived_from_insights: []
fresh_as_of: 2026-04-11
created_at: 2026-04-11T00:00:00.000Z
updated_at: 2026-04-11T00:00:00.000Z
---

# Report

## Summary

Summary.

## Key Points

- Point one.

## Body

Body.

## Limitations

- Limitation.

## Analysis Inputs

- None included.

## Insight References

- None included.

## Source References

- \`SRC-0001\` Pricing report - https://example.com/pricing-report
`),
    ).toThrow("Report must reference at least one analysis or one insight");

    expect(() =>
      parseReportArtifact(`---
id: RPT-0001
title: Wrong order
audience: founder
angle: pricing
thesis: Sections are wrong.
status: draft
derived_from_analysis:
  - ANL-0001
derived_from_insights: []
fresh_as_of: 2026-04-11
created_at: 2026-04-11T00:00:00.000Z
updated_at: 2026-04-11T00:00:00.000Z
---

# Report

## Summary

Summary.

## Body

Body.

## Key Points

- Point one.

## Limitations

- Limitation.

## Analysis Inputs

- \`ANL-0001\` Pricing landscape

## Insight References

- None included.

## Source References

- \`SRC-0001\` Pricing report - https://example.com/pricing-report
`),
    ).toThrow("Artifact sections must match the canonical order");
  });

  test("renders canonical markdown with normalized lineage arrays", () => {
    const rendered = renderReportArtifact({
      frontmatter: {
        id: "RPT-0001",
        title: "Pricing brief",
        audience: "founder",
        angle: "pricing-pressure",
        thesis: "Pricing is compressing while bundle complexity grows.",
        status: "draft",
        derived_from_analysis: ["ANL-0002", "ANL-0001"],
        derived_from_insights: ["INS-0002", "INS-0001"],
        fresh_as_of: "2026-04-11",
        created_at: "2026-04-11T00:00:00.000Z",
        updated_at: "2026-04-11T01:00:00.000Z",
      },
      sections: {
        summary: "Summary.",
        keyPoints: ["Point one.", "Point two."],
        body: "Body.",
        limitations: ["Limitation."],
        analysisInputs: ["`ANL-0001` Pricing landscape", "`ANL-0002` Enterprise packaging"],
        insightReferences: ["`INS-0001` Pricing compression (sources: `SRC-0001`)"],
        sourceReferences: ["`SRC-0001` Pricing report - https://example.com/pricing-report"],
      },
    });

    expect(rendered).toContain('derived_from_analysis:\n  - "ANL-0001"\n  - "ANL-0002"');
    expect(rendered).toContain('derived_from_insights:\n  - "INS-0001"\n  - "INS-0002"');
    expect(rendered).toContain("## Source References");
  });
});
