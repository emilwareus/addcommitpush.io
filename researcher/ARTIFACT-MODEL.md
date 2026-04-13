# Artifact Model

## Per-Research Folder

Every research should live under:

```text
researcher/researches/<research-slug>/
```

Recommended layout:

```text
<research-slug>/
├── brief.md
├── manifest.json
├── sources.json
├── insights/
│   ├── INS-0001-market-shift.md
│   ├── INS-0002-pricing-pressure.md
│   └── INS-0003-tooling-gap.md
├── data/
│   ├── snapshots/
│   ├── exports/
│   ├── transcripts/
│   └── datasets/
├── analysis/
│   ├── ANL-0001-landscape-map.md
│   ├── ANL-0002-timeline.md
│   └── ANL-0003-comparison.ipynb
└── reports/
    ├── RPT-0001-executive-brief.md
    ├── RPT-0002-blog-angle-a.md
    └── RPT-0003-contrarian-thesis.md
```

## Root Files

### `brief.md`

The bounded statement of what this research is trying to answer.

It should contain:

- title
- core question
- audience
- why this matters
- scope
- explicit non-goals
- output expectations

### `manifest.json`

Machine-readable state for the research as a whole.

It should track:

- research ID
- current status
- active questions
- tags
- freshness window
- last source sync
- open contradictions
- report inventory

This file is the research equivalent of GSD's small digest state. It should stay compact enough
to drive a future `/research-status` command.

### `sources.json`

The canonical source registry for the research.

This is where every external source gets one stable record, even if it is never promoted into
an insight.

`sources.json` should be updated by tooling, not freehand by agents whenever possible.

## Insight Files

Insights are the core reusable asset. Each one should be atomic enough to cite in multiple
reports without copy-pasting whole analyses.

Each `INS-*.md` should answer:

- what is the claim
- why it matters
- which sources support it
- how strong the evidence is
- what context or caveats apply
- which analysis documents and reports already reuse it

Recommended frontmatter:

```yaml
id: INS-0001
title: Pricing compression is accelerating in AI coding agents
status: validated
confidence: medium
derived_from_sources:
  - SRC-0004
  - SRC-0011
tags:
  - pricing
  - ai-agents
linked_analysis:
  - ANL-0002
linked_reports:
  - RPT-0001
updated_at: 2026-04-10
```

## Data Assets

`data/` stores lower-level material that should not be hidden inside reports:

- HTML snapshots
- PDFs
- scraped JSON
- CSV exports
- interview transcripts
- audio transcripts
- screenshots
- bibliographic exports

When a data file matters to an insight, the insight should link to it.

## Analysis Assets

`analysis/` is where multiple insights are shaped into higher-order reasoning.

Typical assets:

- comparison matrices
- timelines
- taxonomies
- competitor maps
- methodology notes
- notebooks
- structured model outputs

An analysis document should cite insight IDs, not just raw URLs.

## Reports

Reports are packaging, not the system of record.

Every report should declare:

- audience
- angle
- thesis
- derived insight IDs
- derived analysis IDs
- freshness date

That lets you regenerate a report later from the same knowledge graph.

## Scoped And Shared Documents

Inside a research folder, prefer scoped artifacts that only answer for that one investigation.

At the `/researcher/` root, keep only:

- the method docs
- templates
- schemas
- examples
- optional future global indexes

That avoids mixing the operating system with the research payloads.

## Linking Rules

The minimum viable linking rule is:

- `sources.json` knows which sources feed which insights.
- insight files know which sources support them.
- analysis files know which insights they synthesize.
- report files know which insights and analyses they package.

This gives you a legible provenance chain:

```text
source -> insight -> analysis -> report
```

## Promotion Gates

### Source -> Insight

Only promote when:

- the source has been read or extracted
- the claim is clearly stated
- evidence strength is recorded
- the claim is not a duplicate

### Insight -> Analysis

Only promote when:

- at least two relevant insights are grouped
- the grouping has a clear analytic question
- contradictions are surfaced, not buried

### Analysis -> Report

Only promote when:

- target audience is explicit
- thesis is explicit
- included insights are sufficient for the angle
- unsupported storytelling is removed
