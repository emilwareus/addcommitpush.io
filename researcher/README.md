# Researcher

Researcher is a GSD-inspired system design for deep web research, continuous synthesis, and
multi-angle report generation.

The goal is not "one prompt, one report." The goal is a durable research workspace where raw
sources become source notes, source notes become reusable insights, insights become analysis,
and analysis can be repackaged into many Markdown reports.

## Why This Exists

GSD is strong because it gives agents:

- thin orchestration
- fresh context per subtask
- file-based state
- clear artifact contracts
- explicit gates before moving forward

Those same ideas translate well to research if the artifact chain is inverted from code delivery
to knowledge delivery.

## What Changes From GSD

GSD centers on:

- project context
- requirements
- roadmap phases
- plans
- execution
- verification

Researcher should center on:

- a research brief
- a structured source registry
- source notes
- atomic insights
- higher-order analysis
- reusable Markdown reports
- refresh loops when evidence changes

## Proposed Runtime Layout

Each research lives in its own folder:

```text
researcher/
├── README.md
├── DESIGN.md
├── ARTIFACT-MODEL.md
├── WORKFLOWS.md
├── CONTRACTS.md
├── REPORTING.md
├── IMPLEMENTATION-ROADMAP.md
├── schemas/
├── templates/
├── examples/
└── researches/
    └── <research-slug>/
        ├── brief.md
        ├── manifest.json
        ├── sources.json
        ├── insights/
        ├── data/
        ├── analysis/
        └── reports/
```

The required per-research subfolders are:

- `insights/`
- `data/`
- `analysis/`
- `reports/`

## Information Fidelity Ladder

The whole system should behave like a second brain with increasing fidelity:

1. `sources.json` tracks what was seen, trusted, rejected, and reused.
2. `data/` stores raw captures, exports, snapshots, CSVs, notebooks, and transcripts.
3. `insights/` stores atomic, evidence-backed observations that can be linked and reused.
4. `analysis/` stores comparisons, taxonomies, timelines, argument maps, and synthesis.
5. `reports/` turns the same underlying research into audience-specific deliverables.

## Shared Vs Scoped State

One useful GSD pattern is the split between shared memory and active scoped work. Researcher
should keep the same separation:

- shared system docs stay in `/researcher/`
- each bounded investigation lives in `/researcher/researches/<research-slug>/`
- each investigation has its own `manifest.json` and `sources.json`

That keeps long-term method documents stable while each research stays independently editable,
refreshable, and reportable.

## Document Map

- [DESIGN.md](DESIGN.md): how GSD maps into a research-first system
- [ARTIFACT-MODEL.md](ARTIFACT-MODEL.md): folder structure, IDs, and artifact lifecycle
- [WORKFLOWS.md](WORKFLOWS.md): interactive flows, commands, gates, and subagents
- [CONTRACTS.md](CONTRACTS.md): XML-style orchestration contracts and structured file choices
- [REPORTING.md](REPORTING.md): how reports compile from insights and analysis
- [IMPLEMENTATION-ROADMAP.md](IMPLEMENTATION-ROADMAP.md): milestone plan to build this
- [templates/RESEARCH.md](templates/RESEARCH.md): template for starting a research
- [templates/INSIGHT.md](templates/INSIGHT.md): template for atomic insight files
- [templates/REPORT.md](templates/REPORT.md): template for derived reports
- [schemas/sources.schema.json](schemas/sources.schema.json): schema for the source registry
- [examples/research-brief.xml](examples/research-brief.xml): example research brief contract
- [examples/task-contract.xml](examples/task-contract.xml): example task contract
- [examples/report-request.xml](examples/report-request.xml): example report-generation contract

## Grounding In GSD

This design was derived by inspecting the cloned GSD source in
`go-research/external_code/get-shit-done`, especially:

- `docs/ARCHITECTURE.md`
- `get-shit-done/workflows/plan-phase.md`
- `get-shit-done/workflows/research-phase.md`
- `get-shit-done/workflows/explore.md`
- `get-shit-done/workflows/new-project.md`
- `get-shit-done/templates/research.md`
- `get-shit-done/templates/state.md`
- `get-shit-done/bin/gsd-tools.cjs`
