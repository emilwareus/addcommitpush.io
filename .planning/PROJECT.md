# Researcher

## What This Is

Researcher is an installable deep-research operating system for AI runtimes like Codex and
Claude Code. It takes the GSD model of commands, skills, scripts, checkpoints, and file-based
state, then applies it to durable research work: source capture, evidence tracking, insight
promotion, analysis synthesis, multi-angle report generation, and runtime installation.

## Core Value

Turn research from one-off chat output into durable, source-backed knowledge that can be reused,
extended, and repackaged into multiple high-quality reports.

## Current State

v1.0 is shipped and archived in `.planning/milestones/`.

The shipped system now includes:

- bounded per-research workspaces under `researcher/researches/<slug>/`
- deterministic `sources -> insights -> analysis -> reports` artifact flow
- append-only evidence capture and freshness propagation
- manifest-driven status, verification debt, and next-action routing
- self-contained Codex and Claude runtime installation, update, and inspect flows

## Requirements

### Validated

- ✓ `RSCH-01` / `RSCH-03` — bounded workspace init and disk-only resume shipped in v1.0
- ✓ `SRC-01` through `SRC-04` — central source registry, metadata, evidence capture, and refresh
  shipped in v1.0
- ✓ `INS-01` through `INS-04` — reusable insight and analysis artifacts with explicit lineage
  shipped in v1.0
- ✓ `RPT-01` through `RPT-03` — reusable Markdown report generation with traceable support shipped
  in v1.0
- ✓ `RSCH-02` / `STAT-01` through `STAT-03` — status routing, freshness debt, and verification
  debt shipped in v1.0
- ✓ `INST-01` through `INST-04` — Codex and Claude install, update, and inspect lifecycle shipped
  in v1.0

### Active

- [ ] Define the next milestone with `$gsd-new-milestone`

### Out of Scope

- SaaS-first hosted state
- Generic IDE replacement
- Audio or slideshow outputs as a primary milestone goal
- Automatic trust scoring that is not auditable from files

## Next Milestone Goals

- tighten release and packaging ergonomics around the installed runtime
- decide whether the next milestone should prioritize broader runtime support or deeper research
  workflows like notebooks and datasets
- define collaboration, sharing, or import/export boundaries only after the single-user local-first
  workflow remains stable

## Context

Shipped v1.0 as a local-first research system inside this repository with:

- 6 completed phases
- 19 completed plans
- full test coverage across the Researcher surface
- milestone archives in `.planning/milestones/`

Known follow-up themes:

- keep Codex and Claude runtime surfaces thin and in parity
- preserve the manifest as the single ownership ledger for install, update, and inspect
- avoid reintroducing one-shot prompt workflows that bypass durable artifacts

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build Researcher as a GSD-style installable system | The operator model mattered as much as the feature set | Validated in v1.0 |
| Use file-based artifacts as the primary state model | Durability, git visibility, and inspectability are core product traits | Validated in v1.0 |
| Center the artifact chain on sources -> insights -> analysis -> reports | Reuse and traceability depend on explicit intermediate artifacts | Validated in v1.0 |
| Keep `sources.json` as the central source ledger | One public source registry keeps provenance inspectable | Validated in v1.0 |
| Keep `INS-*`, `ANL-*`, and `RPT-*` canonical as Markdown artifacts | Human-readable durable artifacts are part of the product surface | Validated in v1.0 |
| Keep `research-status` as a progress router, not a passive dashboard | GSD-style workflows need one decisive next action | Validated in v1.0 |
| Build the installed runtime as a self-contained package | Installed execution must not depend on the target project's toolchain | Validated in v1.0 |
| Use the install manifest as the single ownership ledger | Install, update, and inspect need one deterministic source of truth | Validated in v1.0 |

---
*Last updated: 2026-04-13 after v1.0 milestone*
