# Researcher

## What This Is

Researcher is an installable deep-research operating system for AI runtimes like Codex and
Claude Code. It is modeled directly on GSD's strengths: commands, skills, scripts, workflows,
hooks, and file-based state, but aimed at web research, evidence capture, insight synthesis,
and multi-angle report generation instead of code delivery alone.

The product should let a user install Researcher into a project and work through durable,
structured research flows that turn sources into reusable insights, analysis, and many Markdown
reports from one research base.

## Core Value

Turn research from one-off chat output into durable, source-backed knowledge that can be reused,
extended, and repackaged into multiple high-quality reports.

## Requirements

### Validated

- Phase 1 validated the bounded research workspace contract and disk-only resume flow.
- `RSCH-01`: Users can initialize a new research with a bounded brief and a fixed folder structure.
- `RSCH-03`: Users can resume an existing research without rebuilding context from chat history.
- Phase 2 validated the central source registry, durable evidence capture, and refreshable source state.
- `SRC-01`: Users can add external sources to one central structured source registry for a research.
- `SRC-02`: Users can record source metadata including origin, access time, type, status, and confidence.
- `SRC-03`: Users can store captured evidence or extracted material alongside the research in a durable local structure.
- `SRC-04`: Users can refresh sources later and detect when evidence may have gone stale.

### Active

- [ ] Users can install Researcher into Codex and Claude Code as commands, skills, scripts,
  and supporting workflow assets.
- [ ] Users can promote gathered material into reusable insight artifacts and deeper analysis
  artifacts with clear lineage.
- [ ] Users can generate multiple Markdown reports from a single research base without repeating
  the same research.
- [ ] Users can inspect status, freshness debt, and next suggested action for a research.

## Current State

Phases 1 and 2 are complete. The repo now has:

- a fixed per-research workspace under `researcher/researches/<slug>/`
- a versioned manifest contract and a richer shared `sources.json` registry with stable `SRC-*` IDs
- deterministic `research-init`, `research-resume`, `research-source-add`, and `research-source-refresh` CLIs backed by shared core services
- durable append-only evidence capture under `data/<bucket>/<SRC-ID>/<timestamp>/...`
- refresh semantics that derive stale source state from the manifest freshness window
- disk-only resume that reconstructs stage, inventory, freshness debt, and next action from files

Next focus: Phase 3, Insights & Analysis Graph.

### Out of Scope

- Single-use "one prompt, one answer" research flows — they discard too much structure and
  provenance.
- SaaS-first hosted architecture — the initial product should be file-based, local-first, and
  runtime-installable like GSD.
- Optimizing for only one report type — the core design must support many report angles from one
  evidence base.
- Rebuilding GSD's code-execution workflow inside Researcher — Researcher should borrow the
  orchestration model, not clone the delivery domain.

## Context

This project comes from a direct inspection of GSD and a design exercise captured under
`researcher/`. The current spec already defines a target artifact model:

- a per-research folder with `brief.md`, `manifest.json`, `sources.json`, `insights/`, `data/`,
  `analysis/`, and `reports/`
- Markdown as the main human-readable medium
- JSON for central source and manifest state
- XML-style prompt contracts for orchestration between agents and workflows

The intended operator experience is "just like GSD" for research work:

- small command surface
- thin orchestrators
- focused subagents with fresh context
- file-based artifacts with declared consumers
- progress routing and resumable checkpoints
- verification debt for stale or weak evidence

This repository already contains a blog project and an existing `AGENTS.md`. GSD initialization
must coexist with that reality without assuming a blank repo.

## Constraints

- **Runtime Compatibility**: Must be installable into Codex and Claude Code first — these are the
  primary target runtimes.
- **Local-First State**: Core state must live in files, not require a database or hosted backend.
- **Artifact Discipline**: Reports must be Markdown, and the source registry must be structured and
  machine-readable.
- **GSD Alignment**: The product should feel structurally similar to GSD so users can transfer the
  same mental model.
- **Extensibility**: One research must remain open to additional sources, insights, analysis, and
  reports over time.
- **Source Provenance**: Every report-worthy claim must be traceable back through insights to
  concrete sources.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build Researcher as a GSD-style installable system | The user wants the same operating model as GSD, not a standalone ad hoc prompt pack | Validated in Phase 1 |
| Use file-based artifacts as the primary state model | This preserves inspectability, git friendliness, and durability across context resets | Validated in Phase 1 |
| Center the artifact chain on sources -> insights -> analysis -> reports | This is the core architectural inversion from one-shot chat output to reusable knowledge | Workspace foundation validated in Phase 1 |
| Keep `sources.json` as the single public source ledger | This preserves one inspectable registry while still allowing richer per-source metadata and append-only capture history | Validated in Phase 2 |
| Derive source staleness from manifest freshness windows during refresh | This keeps freshness detection deterministic and file-based without introducing provider-specific logic | Validated in Phase 2 |
| Treat multiple reports from one research as a first-class requirement | This is the defining user value and should shape every artifact contract | — Pending |
| Start with Codex and Claude Code support before broader runtime expansion | This keeps the first implementation focused while matching the intended install surface | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition**:
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone**:
1. Full review of all sections
2. Core Value check -> still the right priority?
3. Audit Out of Scope -> reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-11 after Phase 2 completion*
