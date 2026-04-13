# Reporting

## Principle

One research should support many reports.

That only works if reports are derived outputs, not the place where all reasoning lives.

## Reporting Stack

### Sources

External evidence, tracked centrally in `sources.json`.

### Insights

Atomic claims and observations with provenance.

### Analysis

Structured reasoning that groups and interprets insights.

### Reports

Audience-specific packaging of selected insights and analysis.

## Report Types

A single research may produce many Markdown reports, for example:

- executive brief
- technical blog post outline
- full article draft
- competitive landscape memo
- contrarian thesis memo
- source review digest

## Report Frontmatter

Each report should declare its lineage:

```yaml
id: RPT-0002
title: Why Deep Research Needs a Knowledge Graph, Not a Chat Log
audience: senior-engineers
angle: technical-blog
thesis: Reusable insights beat one-shot reports.
derived_from_analysis:
  - ANL-0001
derived_from_insights:
  - INS-0001
  - INS-0004
  - INS-0007
fresh_as_of: 2026-04-10
status: draft
```

## Compilation Rules

When generating a report:

1. Start from a declared angle and audience.
2. Select only relevant analysis and insight IDs.
3. Pull source-level detail only when the insight is too weak on its own.
4. Record the selected IDs in report frontmatter.
5. Mark the report stale if a supporting insight becomes stale.

## Citation Model

Use a two-layer citation model:

- primary in-text support: insight IDs
- appendix or footnote support: source IDs and URLs

Example:

```markdown
This pattern mirrors how GSD routes thinking into structured artifacts instead of keeping it
inside one long thread (`INS-0003`, `INS-0005`).
```

Then resolve those insight IDs in a references section:

```markdown
## Insight References

- `INS-0003` -> supported by `SRC-0004`, `SRC-0008`
- `INS-0005` -> supported by `SRC-0011`
```

## Refresh Model

Reports are not immutable.

If a source changes:

1. mark the source stale in `sources.json`
2. mark dependent insights stale
3. surface impacted analyses
4. mark affected reports stale

That lets you regenerate only what needs regeneration.

## Recommended Writing Flow

For blog work:

1. build a broad source set
2. promote reusable insights
3. create one analysis for the core thesis
4. create one report for the article angle
5. later create another report for a different framing without redoing research

## What Not To Do

- do not dump raw URLs directly into every report draft
- do not let the only synthesis live in one notebook
- do not create giant omnibus reports when the real reusable unit is the insight
- do not allow report claims without insight or source lineage

