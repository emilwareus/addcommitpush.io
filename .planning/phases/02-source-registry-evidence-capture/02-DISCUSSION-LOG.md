# Phase 2: Source Registry & Evidence Capture - Discussion Log

**Date:** 2026-04-11
**Mode:** Auto (`--auto`)
**Outcome:** Phase 2 implementation decisions captured without interactive prompts

## Areas Discussed

### 1. Source identity and deduplication
- [auto] Selected all source identity gray areas.
- [auto] Chose one stable `SRC-*` record per external source rather than creating a new source ID
  on every refresh.
- [auto] Chose canonical-locator dedupe so refresh updates the existing source record instead of
  duplicating it.
- [auto] Chose a workflow-oriented status lifecycle: `queued -> read -> quoted`, with
  `rejected`, `stale`, and `superseded` available when needed.

### 2. Source record contract
- [auto] Chose to expand `sources.json` to carry the Phase 2 metadata promised in requirements
  rather than storing source details in separate side files.
- [auto] Chose root-relative capture references instead of embedding raw evidence bodies in JSON.
- [auto] Chose to preserve downstream linkage placeholders such as `linked_insights` in the source
  contract now so later phases extend one provenance model.

### 3. Evidence capture layout
- [auto] Chose to keep raw evidence under `data/` and keep `sources.json` as metadata only.
- [auto] Chose `data/snapshots/` as the primary home for fetched web/document captures, while
  keeping other evidence forms in purpose-specific data subfolders.
- [auto] Chose attributable per-source capture naming/layout so multiple refreshes can coexist for
  one `SRC-*` record.

### 4. Refresh and mutation behavior
- [auto] Chose append-new-capture refresh semantics rather than in-place evidence overwrites.
- [auto] Chose to update freshness metadata and latest pointers on the stable source record while
  preserving historical capture files.
- [auto] Chose to keep all source mutation in shared deterministic tooling and keep runtime
  entrypoints thin and machine-readable.
- [auto] Chose not to lock one search backend in discuss-phase; planner and researcher can pick
  implementation details later.

## Deferred During Discussion

- Downstream stale-impact propagation into insights/analysis/reports
- Search-provider selection and ranking strategy
- Multi-user and collaborative source-registry semantics

## Notes

- Phase 1 decisions D-05 through D-07 strongly constrained the Phase 2 outcome: the public ledger
  stays `sources.json`, but the mutation boundary stays behind shared core tooling.
- Phase 2 discussion intentionally focused on durable artifact semantics, not search UX or web
  crawling implementation details.

---
*Phase: 02-source-registry-evidence-capture*
*Discussion gathered: 2026-04-11*
