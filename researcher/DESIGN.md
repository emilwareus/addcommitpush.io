# Design

## Core Thesis

Repurpose GSD by keeping its orchestration discipline and replacing its delivery pipeline.

GSD pipeline:

```text
idea -> project context -> requirements -> roadmap -> plan -> execute -> verify
```

Researcher pipeline:

```text
question -> research brief -> sources -> source notes -> insights -> analysis -> reports -> refresh
```

The important shift is that execution is no longer code change. Execution is evidence capture,
synthesis, and packaging.

## What To Preserve From GSD

### 1. Thin orchestrators

Workflows should not do the thinking themselves. They should:

- normalize arguments
- load only the paths and small summaries needed
- spawn focused research subagents
- route outputs into files
- gate progress before the next stage

### 2. Fresh context per subagent

Research decays badly when one agent tries to do everything in one thread. Preserve the GSD
pattern where each worker gets a bounded brief and a clean window.

### 3. File-based state

Do not hide research state inside a database first. Keep the primary system legible in files:

- Markdown for human-readable outputs
- JSON for machine-readable registries
- notebooks and datasets in `data/` and `analysis/`

Mirror GSD's split between shared documents and scoped runtime state:

- shared method documents under `/researcher/`
- scoped investigation state inside each research folder
- a small digest file (`manifest.json`) for fast routing and progress display

### 4. Explicit artifact contracts

Every stage should write a file with a known purpose. Avoid giant, mixed documents.

### 5. Gates before promotion

Not every note should become an insight. Not every insight should become analysis. Not every
analysis should ship as a report. Promotion should be deliberate.

## What To Replace From GSD

| GSD Concept | Researcher Equivalent | Why |
|-------------|-----------------------|-----|
| `PROJECT.md` | `brief.md` | research needs a bounded question, not product scope |
| `STATE.md` | `manifest.json` + status fields in reports/analysis | research state is more graph-like and less phase-linear |
| `REQUIREMENTS.md` | key questions + acceptance criteria for evidence quality | research is answered by confidence and coverage, not feature completion |
| `ROADMAP.md` | research tracks and tasks | work splits by inquiry thread, not delivery phase |
| `PLAN.md` | task contracts and analysis requests | each task is a focused evidence/synthesis job |
| `SUMMARY.md` | insight files and report files | knowledge should stay decomposed and reusable |

## Recommended System Components

### Command layer

User-facing commands or skills that feel like GSD, but for research.

### Workflow layer

Markdown workflows with XML-style blocks that:

- load context
- ask one question at a time when needed
- spawn subagents
- promote artifacts forward

### Tooling layer

A small CLI should manage:

- ID generation
- source registry updates
- backlink maintenance
- report compilation
- stale insight detection
- manifest refresh

Prompts should not be the authoritative writers for structured registries. The tool layer should
own JSON mutation, ID assignment, link maintenance, and freshness propagation.

### Artifact layer

A per-research file tree that preserves evidence lineage.

## Research-Centric Agent Roles

Suggested subagent set:

- `research-scout`: searches and proposes source sets
- `source-auditor`: verifies source quality and extracts metadata
- `insight-extractor`: turns notes into atomic evidence-backed insights
- `analysis-synthesizer`: clusters insights into themes and arguments
- `report-writer`: turns selected analysis into a Markdown report for a chosen audience
- `contradiction-checker`: looks for unsupported claims, stale evidence, or thesis drift
- `progress-router`: inspects a research and tells the operator the next best step

## Promotion Model

Research artifacts should be promoted through these steps:

1. A source is discovered and recorded in `sources.json`.
2. A source note or dataset lands in `data/` or `insights/`.
3. A validated observation becomes an `INS-*.md` insight.
4. Multiple insights become an `ANL-*.md` analysis document or notebook.
5. A selected subset becomes a `RPT-*.md` report.

That promotion model is what allows many reports to come from one research.

## Interaction Style To Borrow Directly

The most transferable interaction patterns from GSD are:

- assumptions mode: inspect existing evidence first, then ask only what remains ambiguous
- progress routing: show current state and suggest the next action instead of dumping options
- resumable checkpoints: pause at natural gates and continue with fresh workers, not bloated threads
- verification debt: track stale sources, unresolved contradictions, and weakly-supported insights

Those patterns matter more than any one command name.

## Recommended Naming

Stable IDs make cross-linking cheap and machine-safe:

- research: `RES-YYYYMMDD-<slug>`
- source: `SRC-0001`
- insight: `INS-0001`
- analysis: `ANL-0001`
- report: `RPT-0001`
- task: `TSK-0001`

## Opinionated Design Decisions

- Reports are always Markdown.
- Source registry is JSON.
- Insights are Markdown with YAML frontmatter.
- Analysis can be Markdown, Python notebooks, CSVs, or small code artifacts.
- XML-style blocks are for orchestration contracts, not primary storage.
- Each research folder is append-friendly and can stay active for months.
- New reports should not duplicate source harvesting if existing insights already answer the angle.
