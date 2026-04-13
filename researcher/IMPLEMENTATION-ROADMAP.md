# Implementation Roadmap

## Milestone 1: Core Research Skeleton

Goal:

- create the folder model and minimum viable files for one research

Deliverables:

- `researches/<slug>/brief.md`
- `manifest.json`
- `sources.json`
- required subfolders
- ID generation utility

## Milestone 2: Source Registry And Harvest

Goal:

- make source intake reliable and append-friendly

Deliverables:

- source add/update commands
- duplicate detection
- credibility classification
- snapshot and transcript capture into `data/`

## Milestone 3: Insight Promotion

Goal:

- make source-to-insight promotion the default knowledge workflow

Deliverables:

- `INS-*.md` template and validator
- backlink updates from `sources.json`
- duplicate insight detection
- stale insight marking

## Milestone 4: Analysis Layer

Goal:

- support higher-order synthesis from existing insights

Deliverables:

- `ANL-*.md` template
- notebook support under `analysis/`
- insight clustering workflow
- contradiction-check workflow

## Milestone 5: Report Compiler

Goal:

- generate many Markdown reports from one research base

Deliverables:

- report request contract
- report template
- lineage frontmatter
- stale-report propagation

## Milestone 6: Interaction Layer

Goal:

- make the system feel like GSD in day-to-day use

Deliverables:

- conversational intake
- checkpoints at harvest, insight, analysis, and report stages
- status command
- refresh command

## Milestone 7: Long-Lived Research Memory

Goal:

- support continuously evolving researches

Deliverables:

- freshness windows
- recurring refresh runs
- report regeneration from updated insight sets
- cross-research indexing if desired later

## Suggested Initial Build Order

1. file skeleton and IDs
2. source registry
3. insight files
4. report lineage
5. analysis notebooks
6. advanced interaction polish

