# Phase 3: Insights & Analysis Graph - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 sits directly on top of the completed source registry and evidence layer. It must define
how Researcher promotes durable source-backed material into reusable `INS-*` insight artifacts,
how multiple insights become higher-order `ANL-*` analysis artifacts, and how lineage stays
machine-readable enough for later report compilation and freshness propagation.

This phase is not report generation and it is not freshness-impact propagation. It should make
those later phases possible without reopening the source or artifact model.

</domain>

<decisions>
## Implementation Decisions

### Insight identity and granularity
- **D-30:** Insight artifacts are canonical Markdown files under `insights/` with stable `INS-*`
  IDs allocated from `manifest.next_ids.insight`. Filenames should include the ID plus a readable
  slug, but the ID is the authoritative identity.
- **D-31:** One insight must represent one atomic reusable claim. If a finding requires multiple
  unrelated claims or a full thesis, that belongs in multiple insights or in an analysis artifact,
  not one oversized insight file.

### Insight contract and evidence shape
- **D-32:** Insights should use YAML frontmatter plus fixed Markdown sections. The canonical Phase 3
  body shape is: `Claim`, `Why It Matters`, `Evidence`, `Caveats`, and `Reuse Notes`.
- **D-33:** The canonical insight frontmatter should include: `id`, `title`, `status`,
  `confidence`, `derived_from_sources`, `tags`, `linked_analysis`, `linked_reports`,
  `created_at`, and `updated_at`. For Phase 3, the insight status lifecycle is
  `draft -> validated`, with `disputed` and `superseded` available when needed.
- **D-34:** Every insight must link to one or more supporting `SRC-*` records in both machine state
  and human-readable content. Evidence support should be expressed in terms of source IDs and short
  support notes, not raw URLs alone.

### Lineage and backlink behavior
- **D-35:** Source-to-insight lineage must stay explicit and bidirectional. Creating or updating an
  insight must synchronize `sources.json[*].linked_insights` so the source ledger remains the
  canonical entrypoint for downstream provenance.
- **D-36:** Duplicate insight detection should remain deterministic and conservative in Phase 3.
  Use normalized title/claim fingerprints plus overlapping source lineage to catch obvious
  duplicates; do not introduce embedding-based or provider-specific semantic dedupe in this phase.

### Analysis artifact shape
- **D-37:** Analysis artifacts are canonical Markdown files under `analysis/` with stable `ANL-*`
  IDs allocated from `manifest.next_ids.analysis`. Optional notebooks or datasets may exist as
  companions later, but the primary Phase 3 analysis contract is Markdown.
- **D-38:** Every analysis artifact should start from an explicit analytic question or angle and
  reference insight IDs as its primary inputs. Analyses should synthesize insights, not bypass them
  by speaking directly to raw source URLs except where an explicit note is necessary.
- **D-39:** The canonical Phase 3 analysis body shape is: `Question`, `Synthesis`,
  `Contradictions`, `Caveats`, `Open Questions`, and `Next Moves`. Contradictions and unresolved
  questions must be first-class sections, not buried in narrative prose.
- **D-40:** Higher-order analysis should require a grouped insight set rather than a single insight.
  The default expectation is that an analysis references at least two insights unless it is clearly
  acting as a transitional scaffold that the planner explicitly justifies.

### Phase boundaries and runtime behavior
- **D-41:** Phase 3 should preserve the lineage needed for later stale-impact propagation, but it
  should not implement downstream stale marking of insights, analysis, or reports. That remains
  Phase 5 scope.
- **D-42:** All insight and analysis mutation, ID allocation, schema validation, and backlink
  synchronization must go through shared deterministic tooling in `internal/tools/researcher/`,
  with thin runtime entrypoints that parse input and print deterministic machine-readable output.

### the agent's Discretion
- Exact helper/module boundaries for insight creation, analysis creation, and backlink syncing
- Exact filename slugging rules as long as `INS-*` and `ANL-*` remain the authoritative IDs
- Whether some analysis metadata lives in frontmatter vs. fixed body sections, as long as lineage,
  contradictions, caveats, and open questions remain explicit and machine-readable enough for later
  phases

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 2 delivered foundation
- `.planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md` — Locked source identity,
  evidence capture, and runtime-boundary decisions inherited by Phase 3
- `.planning/phases/02-source-registry-evidence-capture/02-RESEARCH.md` — Architecture guidance on
  source contracts, append-only evidence, and provider-neutral mutation paths
- `.planning/phases/02-source-registry-evidence-capture/02-VERIFICATION.md` — Verified evidence
  that the source ledger, durable capture storage, refresh logic, and resume compatibility exist
- `.planning/phases/02-source-registry-evidence-capture/02-01-SUMMARY.md` — Summary of the enriched
  `sources.json` contract and validation boundary
- `.planning/phases/02-source-registry-evidence-capture/02-02-SUMMARY.md` — Summary of canonical
  source add/upsert and manifest/source synchronization
- `.planning/phases/02-source-registry-evidence-capture/02-03-SUMMARY.md` — Summary of append-only
  capture storage, refresh semantics, and freshness metadata

### Researcher product design
- `researcher/README.md` — Overall product shape and fidelity ladder
- `researcher/ARTIFACT-MODEL.md` — Insight/analysis semantics, linking rules, and promotion gates
- `researcher/WORKFLOWS.md` — Intended `/research-insight`, `/research-analyze`, and quality-gate
  behaviors
- `researcher/DESIGN.md` — Thin-core / thin-adapter architectural guidance and promotion model
- `researcher/IMPLEMENTATION-ROADMAP.md` — Insight-promotion and analysis-layer milestone framing
- `researcher/templates/INSIGHT.md` — Existing insight template direction

### Existing code and schemas
- `internal/tools/researcher/contracts/manifest.ts` — Existing `INS-*` and `ANL-*` counter slots in
  `manifest.next_ids`
- `internal/tools/researcher/contracts/sources.ts` — Current Phase 2 source record and
  `linked_insights` placeholder contract
- `internal/tools/researcher/contracts/validators.ts` — Existing shared Ajv-based validation entrypoints
- `internal/tools/researcher/contracts/workspace.ts` — Fixed workspace constants and folder
  boundaries
- `internal/tools/researcher/fs/workspace-paths.ts` — Root-confined path resolution and path guards
- `internal/tools/researcher/core/resume.ts` — Current disk-only consumer of `insights/` and
  `analysis/` inventory
- `internal/tools/researcher/core/sources/store.ts` — Shared manifest/source persistence boundary
- `internal/tools/researcher/core/sources/add.ts` — Proven add/upsert pattern for ID allocation and
  deterministic JSON mutation
- `internal/tools/researcher/core/sources/refresh.ts` — Proven refresh and freshness-sync pattern

### Project planning context
- `.planning/PROJECT.md` — Current validated project state and constraints
- `.planning/REQUIREMENTS.md` — User-facing requirement traceability for `INS-*`
- `.planning/ROADMAP.md` — Phase boundary, goal, requirements, and planned build order

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `internal/tools/researcher/contracts/manifest.ts`: Already has `insight` and `analysis` ID
  counters available for Phase 3
- `internal/tools/researcher/core/sources/store.ts`: Already provides the validated manifest/source
  load and persist boundary that later backlink sync can reuse
- `internal/tools/researcher/core/sources/add.ts`: Already demonstrates the repo-standard pattern
  for deterministic create-vs-update mutation and thin CLI payloads
- `internal/tools/researcher/core/resume.ts`: Already scans `insights/` and `analysis/` from disk,
  so Phase 3 should preserve those folders as the canonical artifact homes
- `researcher/templates/INSIGHT.md`: Already provides the strongest starting shape for an atomic
  insight file

### Established Patterns
- File-based state remains authoritative: JSON for registries and Markdown for durable human-facing
  artifacts
- Deterministic core-owned writes: structured files are mutated through shared tooling, not by
  prompt-authored edits
- Runtime-neutral CLI pattern: thin `scripts/*.ts` wrappers call shared
  `internal/tools/researcher/core/*`
- Provenance-first evolution: Phase 2 already locked `sources.json` and `linked_insights` as the
  source-layer lineage anchor

### Integration Points
- Phase 3 must extend the current Phase 2 source ledger rather than invent a second provenance
  store for source-to-insight linkage
- Insight and analysis IDs should be allocated from the manifest-backed counters already present in
  `manifest.json`
- Resume should continue to work from disk without learning agent-memory shortcuts or database-only
  state

</code_context>

<specifics>
## Specific Ideas

- Insight creation should become the default promotion step from harvested material, not a sidecar
  workflow.
- The minimum viable knowledge graph is still legible text plus IDs: source -> insight -> analysis.
- Analyses should make disagreement and uncertainty more visible, not less visible.
- Markdown should remain the primary artifact format for both `INS-*` and `ANL-*` in v1, even if
  later phases attach notebooks or datasets.

</specifics>

<deferred>
## Deferred Ideas

- Report generation, report-specific packaging, and report citation rendering belong to Phase 4.
- Downstream stale marking of insights, analysis, or reports belongs to Phase 5.
- Embedding-based semantic dedupe, clustering, or auto-taxonomy systems remain future work.
- Collaborative multi-user editing of insights and analysis remains future work.

</deferred>

---
*Phase: 03-insights-analysis-graph*
*Context gathered: 2026-04-11*
