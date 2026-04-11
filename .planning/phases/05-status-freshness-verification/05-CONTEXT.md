# Phase 5: Status, Freshness & Verification - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 turns the existing Researcher artifact graph into an inspectable health and routing layer.
It must expose research status, freshness debt, and verification debt; propagate stale-source
impact through the existing `SRC-* -> INS-* -> ANL-* -> RPT-*` graph; and recommend the next best
operator action without replacing the current file-based state model.

This phase is not runtime installation/distribution and it is not a redesign of the report,
analysis, or insight contracts. It should extend those contracts only where Phase 5 needs explicit
health signals, while keeping the graph deterministic and inspectable from files.

</domain>

<decisions>
## Implementation Decisions

### Status surface and read model
- **D-57:** Phase 5 should add one dedicated `/research-status` read surface backed by shared core
  tooling and a thin CLI entrypoint. It should return deterministic machine-readable output, while
  `manifest.json` remains the compact durable summary rather than becoming a verbose per-artifact
  status ledger.
- **D-58:** The status payload should behave like a progress router, not a static dashboard. It
  must show: stage/state, unanswered questions, inventory, freshness debt, verification debt,
  impacted artifacts, and one primary `nextRecommendedAction`.

### Freshness propagation model
- **D-59:** Source freshness propagation must stay explicit and deterministic. When a source is
  stale, the tool layer should mark dependent insights stale, surface impacted analyses from their
  linked insights, and mark affected reports stale.
- **D-60:** Analysis artifacts should not gain an independent stale marker in v1. Instead, Phase 5
  should compute impacted analyses from upstream stale insights and surface them in status output,
  avoiding a second wave of derived write amplification for a purely intermediary layer.
- **D-61:** Stale clearing must use the same lineage graph in reverse. When previously stale
  sources are refreshed, the tool layer should recompute dependent insight/report staleness from
  currently linked upstream artifacts instead of blindly clearing stale flags.

### Artifact health contract
- **D-62:** Insights and reports should gain explicit non-lifecycle health flags via a
  `side_states` array in frontmatter. These flags capture Phase 5 concerns like `stale`,
  `unsupported`, and `superseded`, while the existing `status` field continues to represent the
  editorial lifecycle (`draft`, `validated`, `disputed`, `superseded`).
- **D-63:** Analyses should continue to express evidence tension through their existing body
  sections (`Contradictions`, `Caveats`, `Open Questions`) rather than gaining a separate Phase 5
  side-state contract. Their verification and freshness impact are computed from those sections and
  from upstream stale insights.

### Verification debt semantics
- **D-64:** Verification debt should be tracked as compact aggregate counts in `manifest.json`,
  while the detailed affected IDs are derived at read time by `/research-status`. This keeps the
  durable state compact and aligned with the existing manifest pattern.
- **D-65:** Unsupported-claim detection in v1 must remain deterministic and file-based, not
  semantic or model-judged. Phase 5 should treat these as unsupported: an insight with no currently
  valid supporting sources, a report whose referenced lineage no longer resolves, a report built
  from stale/disputed upstream artifacts, and analyses whose contradiction/open-question signals
  remain unresolved enough to create verification debt.
- **D-66:** Verification debt is advisory for drafting and iteration, but blocking for declaring a
  report effectively ready to ship or trustworthy to publish. Phase 5 should surface the blocking
  reasons clearly rather than silently preventing drafting work.

### Routing and operator workflow
- **D-67:** Next-action routing should preserve the existing single-primary-action model. Priority
  order for the primary recommendation is: paused/archive recovery, missing open-question framing,
  stale-source refresh, blocking verification debt resolution, impacted downstream regeneration,
  then normal stage progression.
- **D-68:** Status output should surface impacted artifact IDs grouped by layer
  (`insights`, `analysis`, `reports`) so an operator can refresh only what changed instead of
  rerunning the entire research.
- **D-69:** All Phase 5 freshness propagation, debt aggregation, and status summary logic must go
  through shared deterministic tooling in `internal/tools/researcher/`, with thin runtime wrappers
  only. No prompt-authored edits to `manifest.json` or artifact frontmatter are allowed.

### the agent's Discretion
- Exact helper/module boundaries for status summary, propagation, and debt aggregation
- Exact naming of verification-debt categories as long as the output clearly separates freshness,
  unsupported lineage, and contradiction/open-question risk
- Exact JSON output layout for `/research-status` as long as the payload remains deterministic,
  compact, and centered on one primary next action plus explicit impacted-artifact lists

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior phase decisions
- `.planning/phases/02-source-registry-evidence-capture/02-CONTEXT.md` — Locked source freshness
  semantics and the Phase 2 decision that downstream stale propagation belongs to Phase 5
- `.planning/phases/03-insights-analysis-graph/03-CONTEXT.md` — Locked `INS-*` / `ANL-*`
  contracts, backlink rules, and the Phase 3 decision that downstream stale marking belongs to
  Phase 5
- `.planning/phases/04-report-generation/04-CONTEXT.md` — Locked `RPT-*` contract, lineage
  rendering, backlink semantics, and `fresh_as_of` behavior inherited by Phase 5
- `.planning/phases/04-report-generation/04-VERIFICATION.md` — Verified evidence that report
  lineage and report backlinks now exist on disk

### Prior implementation summaries
- `.planning/phases/02-source-registry-evidence-capture/02-03-SUMMARY.md` — Summary of append-only
  capture storage, refresh semantics, and source freshness handling
- `.planning/phases/03-insights-analysis-graph/03-02-SUMMARY.md` — Summary of lineage linking from
  sources into insights
- `.planning/phases/03-insights-analysis-graph/03-03-SUMMARY.md` — Summary of analysis upsert,
  insight backlink reconciliation, and resume routing
- `.planning/phases/04-report-generation/04-02-SUMMARY.md` — Summary of report upsert and direct
  backlink sync
- `.planning/phases/04-report-generation/04-03-SUMMARY.md` — Summary of transitive report lineage
  rendering and resume compatibility

### Researcher product design
- `researcher/README.md` — Overall product shape, verification expectations, and local-first
  constraints
- `researcher/WORKFLOWS.md` — Intended `/research-status` behavior, refresh workflow, and
  verification debt expectations
- `researcher/REPORTING.md` — Refresh model and the requirement to mark affected reports stale
- `researcher/DESIGN.md` — Thin-core / thin-adapter guidance plus the verification-debt pattern
- `researcher/ARTIFACT-MODEL.md` — Manifest compactness and future `/research-status` expectations
- `researcher/IMPLEMENTATION-ROADMAP.md` — Phase-5/long-lived-research direction around stale
  propagation and freshness windows

### Existing code and schemas
- `internal/tools/researcher/contracts/manifest.ts` — Existing compact freshness summary and
  inventory structure to extend
- `researcher/schemas/manifest.schema.json` — Current schema boundary for manifest mutation
- `internal/tools/researcher/contracts/sources.ts` — Existing `side_states` vocabulary on sources
  that Phase 5 should mirror conceptually for downstream artifacts
- `internal/tools/researcher/contracts/validators.ts` — Shared Ajv validation entrypoints to extend
- `internal/tools/researcher/core/sources/refresh.ts` — Existing stale derivation and source
  refresh mutation boundary
- `internal/tools/researcher/core/sources/store.ts` — Shared manifest/source persistence and debt
  synchronization boundary
- `internal/tools/researcher/core/resume.ts` — Existing progress-router logic and current
  `nextRecommendedAction` priority model
- `internal/tools/researcher/core/artifacts/markdown.ts` — Shared parse/render boundary for
  canonical Markdown artifacts
- `internal/tools/researcher/core/reports/lineage.ts` — Existing transitive report lineage
  resolver to build freshness-impact traversal on
- `internal/tools/researcher/core/reports/upsert.ts` — Existing report-side mutation and backlink
  sync pattern

### Project planning context
- `.planning/PROJECT.md` — Current validated project state and constraints
- `.planning/REQUIREMENTS.md` — User-facing requirement traceability for `RSCH-02` and `STAT-*`
- `.planning/ROADMAP.md` — Phase boundary, goal, requirements, and build order

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `internal/tools/researcher/core/resume.ts`: Already produces a compact progress-routing summary
  with inventory and one `nextRecommendedAction`
- `internal/tools/researcher/core/sources/refresh.ts`: Already derives source staleness from the
  manifest freshness window and is the natural entrypoint for downstream stale propagation
- `internal/tools/researcher/core/sources/store.ts`: Already centralizes manifest persistence and
  freshness debt synchronization
- `internal/tools/researcher/core/artifacts/markdown.ts`: Already owns canonical parse/render paths
  for `INS-*`, `ANL-*`, and `RPT-*` artifacts
- `internal/tools/researcher/core/reports/lineage.ts`: Already expands reports through effective
  insights and deduped sources
- `internal/tools/researcher/core/reports/backlinks.ts`: Already keeps report usage discoverable
  from upstream artifacts

### Established Patterns
- File-based state remains authoritative: compact JSON summaries plus durable Markdown artifacts
- Deterministic core-owned writes: manifest and artifact mutation happen through shared tooling only
- Progress routing prefers one primary next action instead of an unprioritized option list
- Forward lineage and backlinks remain the canonical graph; no separate provenance store is
  introduced for derived status

### Integration Points
- Phase 5 should extend the existing resume/status routing model rather than inventing a second
  progress summary path
- Freshness propagation should start from source refresh operations and traverse existing
  insight/report lineage
- Verification debt aggregation should read artifact contracts from disk through the shared
  Markdown parser instead of ad hoc string inspection

</code_context>

<specifics>
## Specific Ideas

- `/research-status` should feel like GSD progress routing: compact, decisive, and action-oriented
  rather than like a static dashboard dump.
- Reports should be allowed to exist in draft form even when debt exists; the important Phase 5
  behavior is that status makes debt and shipping risk explicit.
- A stale source should not force the operator to rerun everything blindly; the output should show
  the exact impacted insights, analyses, and reports.

</specifics>

<deferred>
## Deferred Ideas

- Recurring refresh automation and scheduled health checks belong in later lifecycle/runtime work.
- Cross-research indexing and shared health views remain future work.
- Runtime installation surfaces for Codex and Claude Code remain Phase 6 scope.
- Any semantic/LLM-judged claim-verification system remains out of scope for v1; Phase 5 stays
  deterministic and file-based.

</deferred>

---
*Phase: 05-status-freshness-verification*
*Context gathered: 2026-04-11*
