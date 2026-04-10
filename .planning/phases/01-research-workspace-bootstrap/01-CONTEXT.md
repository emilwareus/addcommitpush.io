# Phase 1: Research Workspace Bootstrap - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase establishes the bounded research workspace that every later capability depends on. It
must create the durable per-research folder contract, the initial manifest / state model, and the
resumeable workspace flow so later phases can safely add source capture, insight lineage,
analysis, and report generation on top.

</domain>

<decisions>
## Implementation Decisions

### Workspace layout
- **D-01:** Each research uses a fixed folder contract rather than user-defined structure.
- **D-02:** The canonical per-research layout includes a brief, machine-readable manifest, source
  ledger, and the four required content folders: `insights/`, `data/`, `analysis/`, and
  `reports/`.
- **D-03:** Shared operating-system docs stay under `/researcher/`, while bounded research state
  lives under `/researcher/researches/<research-slug>/`.
- **D-04:** Resume behavior must restore context from on-disk artifacts, not from prior chat
  history.

### Source ledger shape
- **D-05:** Phase 1 should not hard-code the long-term source ledger as one giant mutable JSON
  object.
- **D-06:** The system should implement an append-friendly structured source-ledger abstraction so
  later phases can support durable provenance and low-conflict updates.
- **D-07:** Structured registry writes belong to deterministic tooling, not ad hoc prompt edits.

### Artifact identity and lineage
- **D-08:** Stable IDs are required across source, insight, analysis, report, and task artifacts.
- **D-09:** The durable dependency chain is `SRC -> INS -> ANL -> RPT`, and Phase 1 should shape
  the workspace so that later phases can enforce that lineage explicitly.
- **D-10:** Human-readable artifacts remain Markdown-first, while authoritative machine state stays
  in structured files validated by tooling.

### Runtime boundary
- **D-11:** Researcher should be built as a runtime-neutral core with thin Codex and Claude Code
  adapters, not two separate product implementations.
- **D-12:** Runtime-specific install surfaces are downstream concerns; this phase should establish
  the shared workspace model they both consume.
- **D-13:** Prompt files should stay thin and declarative; structured mutation logic belongs in the
  shared core.

### the agent's Discretion
- Exact manifest field names, as long as they support status routing, freshness debt, and report
  inventory
- Exact helper / library boundaries for the Phase 1 implementation
- Whether the initial append-friendly source abstraction is represented internally as `sources.jsonl`
  or another equivalent structured format, as long as the public artifact model stays stable

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Researcher system design
- `researcher/README.md` — Top-level system shape, runtime layout, and artifact ladder
- `researcher/DESIGN.md` — GSD-to-Researcher architectural mapping and preserved design principles
- `researcher/ARTIFACT-MODEL.md` — Per-research folder structure, stable IDs, lineage, and promotion model
- `researcher/WORKFLOWS.md` — Intended command surface, checkpoints, and bounded workflow stages
- `researcher/CONTRACTS.md` — Storage choices, XML-style task contracts, and structured registry rationale
- `researcher/IMPLEMENTATION-ROADMAP.md` — Initial implementation milestones and build order

### Existing prototypes and schemas
- `researcher/schemas/sources.schema.json` — Initial source-registry schema prototype
- `researcher/templates/RESEARCH.md` — Initial research-brief template
- `researcher/templates/INSIGHT.md` — Initial atomic-insight template
- `researcher/templates/REPORT.md` — Initial report template
- `researcher/examples/research-brief.xml` — Example research brief orchestration contract
- `researcher/examples/task-contract.xml` — Example bounded worker task contract
- `researcher/examples/report-request.xml` — Example report compilation contract

### GSD grounding
- `go-research/external_code/get-shit-done/docs/ARCHITECTURE.md` — Reference model for thin orchestrators, file-based state, and agent/tool separation
- `.planning/PROJECT.md` — Project-level constraints and non-negotiables for Researcher
- `.planning/REQUIREMENTS.md` — User-facing requirements and traceability expectations
- `.planning/research/SUMMARY.md` — Consolidated project-level research findings used to define the roadmap

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `researcher/templates/RESEARCH.md`: Can seed the initial `brief.md` / research initialization flow
- `researcher/templates/INSIGHT.md`: Encodes the target shape for reusable insight artifacts
- `researcher/templates/REPORT.md`: Encodes the expected Markdown report shape
- `researcher/schemas/sources.schema.json`: Existing validation prototype for the source registry
- `researcher/examples/*.xml`: Existing prompt-contract examples for brief, task, and report flows

### Established Patterns
- File-first architecture: The current spec assumes durable local artifacts, not hidden database state
- Markdown + structured registry split: Human-readable content in Markdown, authoritative machine state in structured files
- Thin orchestrator pattern: Workflow docs route work; deterministic tooling should own structured mutation
- Shared-vs-scoped split: Root `/researcher/` docs define the operating system, while per-research state belongs in bounded subfolders

### Integration Points
- Future implementation should read/write under `researcher/researches/<research-slug>/`
- Later runtime adapters should generate or install assets into Codex and Claude Code project surfaces without changing the shared workspace semantics
- Phase 1 should preserve compatibility with the current `researcher/` spec tree so it can bootstrap the first real implementation

</code_context>

<specifics>
## Specific Ideas

- "The goal is not one prompt, one report" is a hard product constraint for the workspace design.
- The system should feel "just like GSD" in operating model, but the artifact chain must be
  inverted to research work.
- One research must be able to produce multiple reports with different angles from the same
  underlying evidence base.
- Keep runtime-specific layers thin, and keep root instruction files small rather than turning
  them into giant hidden control planes.

</specifics>

<deferred>
## Deferred Ideas

- Rich runtime packaging such as plugin / marketplace distribution belongs in the runtime
  installation lifecycle phase, not Phase 1.
- Notebook-heavy analysis tooling (`uv`, `marimo`, DuckDB, Parquet) is valuable but belongs after
  the core workspace and registry model is stable.
- Collaboration, hosted sync, and broader multi-runtime expansion are explicitly future concerns.

</deferred>

---
*Phase: 01-research-workspace-bootstrap*
*Context gathered: 2026-04-10*
