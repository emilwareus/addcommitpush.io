# Phase 2: Source Registry & Evidence Capture - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase establishes the durable evidence layer that sits on top of the Phase 1 workspace
contract. It must define how Researcher records external sources in one central registry, how raw
captures are stored under `data/`, how source refresh updates that registry without breaking
lineage, and how deterministic tooling owns all machine-state mutation.

</domain>

<decisions>
## Implementation Decisions

### Source identity and deduplication
- **D-14:** `sources.json` remains the public, canonical source registry for each research in Phase 2.
- **D-15:** Every external source receives one stable `SRC-*` ID and one durable registry record,
  even if that source is refreshed many times later.
- **D-16:** Duplicate prevention should key off a normalized canonical source locator
  (`canonical_url` or equivalent), so refresh updates an existing source record instead of creating
  a second `SRC-*` entry for the same source.
- **D-17:** Source status should model the operator workflow rather than just freshness. The Phase 2
  lifecycle is `queued -> read -> quoted`, with `rejected`, `stale`, and `superseded` as explicit
  side states when applicable.

### Source record contract
- **D-18:** Phase 2 must expand the source contract beyond the Phase 1 empty envelope to include the
  metadata promised in requirements: origin, access time, source type, status, and confidence.
- **D-19:** Source records should store machine-readable capture references as root-relative paths,
  not inline blobs of article text or binary data.
- **D-20:** Source records should keep linkage placeholders for downstream reuse (`linked_insights`
  now, later lineage extensions), so later phases extend one contract instead of inventing a second
  provenance path.

### Evidence capture layout
- **D-21:** Raw source captures belong under the existing `data/` tree, not inside `sources.json`
  or `manifest.json`.
- **D-22:** Web snapshots and fetched documents should live under `data/snapshots/`, while other
  evidence forms continue to use purpose-specific folders already implied by the artifact model
  (`data/exports/`, `data/transcripts/`, `data/datasets/`).
- **D-23:** Capture files should be named or nested in a way that keeps them attributable to one
  stable `SRC-*` record and allows multiple refresh snapshots to coexist.

### Refresh and staleness semantics
- **D-24:** Refresh should append new durable captures and update registry metadata; it should not
  silently overwrite prior evidence in place.
- **D-25:** Refresh must update per-source freshness metadata (`accessed_at`, latest capture
  pointer, status) while preserving the stable source ID.
- **D-26:** Phase 2 only needs to record staleness at the source layer and surface that affected
  evidence may be stale. Downstream impact propagation into insights, analysis, and reports belongs
  to Phase 5.

### Mutation boundary and runtime behavior
- **D-27:** All source add, update, capture, and refresh writes must go through shared deterministic
  tooling in `internal/tools/researcher/`, not prompt-authored JSON edits.
- **D-28:** Runtime entrypoints for source work should stay thin, like Phase 1 init/resume: parse
  operator input, call the shared core, and print deterministic machine-readable output.
- **D-29:** Search/provider choice is an implementation detail for planner/researcher agents. This
  phase locks the durable artifact behavior, not one specific search backend.

### the agent's Discretion
- Exact helper/module boundaries for source add vs refresh vs capture internals
- Exact field names for canonical URL normalization and capture pointers, as long as the contract
  preserves dedupe, refreshability, and root-relative evidence references
- Whether refresh metadata uses explicit timestamps like `last_checked_at` in addition to
  `accessed_at`, as long as staleness remains machine-readable and deterministic

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 delivered foundation
- `.planning/phases/01-research-workspace-bootstrap/01-CONTEXT.md` — Locked workspace, ledger, and runtime-boundary decisions inherited by Phase 2
- `.planning/phases/01-research-workspace-bootstrap/01-RESEARCH.md` — Prior architecture guidance about public `sources.json` vs append-friendly internals
- `.planning/phases/01-research-workspace-bootstrap/01-VERIFICATION.md` — Verified evidence that the Phase 1 contract, init, and resume flows actually exist
- `.planning/phases/01-research-workspace-bootstrap/01-02-SUMMARY.md` — Summary of the shared contract, validators, and path guards that Phase 2 must build on
- `.planning/phases/01-research-workspace-bootstrap/01-03-SUMMARY.md` — Summary of deterministic workspace seeding and init behavior
- `.planning/phases/01-research-workspace-bootstrap/01-04-SUMMARY.md` — Summary of resume behavior and how `sources.json` is currently consumed

### Researcher product design
- `researcher/README.md` — Overall product shape and workspace semantics
- `researcher/CONTRACTS.md` — Recommended source-registry contract and XML workflow patterns
- `researcher/ARTIFACT-MODEL.md` — Data folder semantics, source-to-insight lineage, and evidence storage model
- `researcher/WORKFLOWS.md` — Intended `/research-harvest`, `/research-refresh`, and `/research-status` behaviors
- `researcher/DESIGN.md` — Thin-core / thin-adapter architectural guidance
- `researcher/IMPLEMENTATION-ROADMAP.md` — Product build order and milestone framing

### Existing code and schemas
- `researcher/schemas/sources.schema.json` — Current public source-registry schema prototype
- `internal/tools/researcher/contracts/sources.ts` — Current shared Phase 1 source-envelope boundary
- `internal/tools/researcher/contracts/validators.ts` — Existing Ajv-based validation entrypoints
- `internal/tools/researcher/contracts/workspace.ts` — Fixed workspace constants and root-relative path contract
- `internal/tools/researcher/fs/workspace-paths.ts` — Root-confined path resolution and symlink/traversal protections
- `internal/tools/researcher/core/init.ts` — Current deterministic workspace creation flow that Phase 2 must preserve
- `internal/tools/researcher/core/resume.ts` — Current disk-only consumer of `sources.json`

### Project planning context
- `.planning/PROJECT.md` — Current validated project state and constraints
- `.planning/REQUIREMENTS.md` — User-facing requirement traceability for `SRC-*`
- `.planning/ROADMAP.md` — Phase boundary, goal, requirements, and planned build order

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `internal/tools/researcher/contracts/sources.ts`: Already owns the public source-envelope seed and validation boundary
- `internal/tools/researcher/contracts/validators.ts`: Already validates `sources.json` through shared Ajv tooling
- `internal/tools/researcher/fs/workspace-paths.ts`: Already resolves root-confined workspace and artifact paths safely
- `internal/tools/researcher/core/init.ts`: Already seeds a schema-valid empty `sources.json`
- `internal/tools/researcher/core/resume.ts`: Already reads validated `sources.json` and derives inventory from it
- `researcher/schemas/sources.schema.json`: Existing schema starting point for the richer Phase 2 source registry

### Established Patterns
- Contract-first machine state: schemas and typed helpers define acceptable JSON shapes before runtime mutation
- Deterministic core-owned writes: JSON files are tool-owned and validated before use
- Runtime-neutral CLI pattern: thin `scripts/*.ts` wrappers call shared `internal/tools/researcher/core/*`
- Fixed workspace semantics: all durable research state remains under `researcher/researches/<slug>/`

### Integration Points
- Phase 2 should extend `sources.json`, not replace it with a different public root artifact
- Evidence capture paths must remain root-confined and reusable by later insight/report phases
- Resume should continue to work from disk without learning provider-specific search behavior

</code_context>

<specifics>
## Specific Ideas

- One source should have one stable identity across harvesting, reading, quoting, and refresh.
- Captures are durable evidence, not temporary fetch artifacts; Researcher should retain prior
  snapshots when a source is refreshed.
- The planner should preserve the current `sources.json` public contract while hiding any
  append-friendly internal mechanics behind shared helpers.
- This phase should make `/research-harvest` and `/research-refresh` possible later without
  reopening the storage model in Phase 3.

</specifics>

<deferred>
## Deferred Ideas

- Full downstream impact propagation from stale sources into insights, analysis, and reports belongs
  to Phase 5.
- Rich search-provider selection, ranking strategies, and hosted crawling integrations are not the
  locked decision surface for this phase.
- Collaborative source merges and conflict-safe multi-user registry updates remain future work.

</deferred>

---
*Phase: 02-source-registry-evidence-capture*
*Context gathered: 2026-04-11*
