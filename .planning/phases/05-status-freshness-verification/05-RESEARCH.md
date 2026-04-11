# Phase 5: Status, Freshness & Verification - Research

**Researched:** 2026-04-11
**Domain:** Deterministic status summaries, freshness-impact propagation, verification debt aggregation, and next-action routing for Researcher
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

- Phase 5 must add a dedicated `/research-status` read surface while keeping `manifest.json`
  compact and durable.
- Freshness propagation should mark dependent insights stale, surface impacted analyses, and mark
  affected reports stale through the existing lineage graph.
- Insights and reports should gain explicit `side_states`; analyses should remain computed-impact,
  not heavily stateful.
- Verification debt must stay deterministic and file-based, not semantic or LLM-judged.
- Debt should block “ready to ship” trust decisions but not drafting work.
- Next-action routing should stay single-primary-action and debt-aware.
- All mutation and status logic must live in shared deterministic tooling with thin CLI wrappers.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RSCH-02 | User can inspect a research manifest that shows status, freshness debt, and active report inventory. | Extend the manifest with compact verification summary fields and build one derived status summary payload that keeps detailed affected IDs out of the manifest. |
| STAT-01 | User can run a status flow that shows the next recommended action for a research. | Reuse and extend the existing resume/router model so one primary `nextRecommendedAction` remains debt-aware. |
| STAT-02 | User can detect stale evidence, unsupported claims, and verification debt before shipping a report. | Add explicit downstream health flags plus deterministic debt evaluators over the existing artifact graph. |
| STAT-03 | User can see when downstream insights, analysis, or reports are affected by changed source freshness. | Propagate stale/fresh transitions from source refresh through the graph and surface impacted IDs grouped by layer. |
</phase_requirements>

## Summary

Phase 5 should build on the graph already delivered in Phases 2 through 4, not redesign it.
The clean implementation is:

1. Freeze a health/status contract first.
2. Build one summary/debt evaluator and status CLI on top of canonical artifacts.
3. Extend source refresh with downstream propagation and re-evaluation.

The key architectural recommendation is to keep the manifest compact while deriving detailed
status at read time:

- `manifest.json` should carry aggregate freshness and verification counts.
- `INS-*` and `RPT-*` artifacts should carry explicit `side_states` for persisted health flags.
- `ANL-*` should stay computed-impact: contradictions/open questions are already first-class data,
  and impacted analyses can be derived from stale insights.
- `/research-status` should return the detailed debt and impacted-ID view from canonical files.

### `05-01` — Freeze health/state contracts and the status-summary boundary
- Extend manifest schema/types with compact verification counts.
- Extend insight/report contracts with `side_states` arrays while preserving editorial `status`.
- Add a typed status-summary contract and focused contract tests.

### `05-02` — Build status evaluation, debt aggregation, and the `research-status` entrypoint
- Implement a status summary service that loads canonical artifacts, computes freshness debt,
  verification debt, impacted IDs, and one primary `nextRecommendedAction`.
- Keep unsupported-claim detection deterministic and file-based.
- Add a thin JSON-only `research-status.ts` wrapper.

### `05-03` — Propagate freshness impact through the artifact graph
- Extend source refresh to re-evaluate dependent insights and reports from actual upstream lineage.
- Surface impacted analyses without storing a separate stale marker on analyses.
- Extend resume/status coverage so freshness debt outranks downstream review actions cleanly.

## Recommended Stack

- Reuse the shared Markdown parser/render boundary in
  `internal/tools/researcher/core/artifacts/markdown.ts`.
- Reuse `sources/store.ts` and `sources/refresh.ts` as the authoritative mutation boundary.
- Add no sidecar graph database, cache file, or provider-specific verification engine.

## Key Planning Takeaways

- `SOURCE_SIDE_STATE_VALUES` already gives the design vocabulary for persisted health flags;
  mirror that concept on insights and reports instead of inventing a second health model.
- `resume.ts` already proves the repo wants a compact, decisive router. Phase 5 should extend that
  model, not add a static dashboard and a second router later.
- Freshness-impact propagation should be graph-walk logic over canonical artifacts plus
  `sources.json`, not a new provenance index.
