---
phase: 02-source-registry-evidence-capture
plan: 03
subsystem: source-refresh
tags: [researcher, refresh, captures, freshness, resume]
requires: [02-02]
provides:
  - append-only evidence capture storage under `data/`
  - source refresh core with derived stale detection
  - thin `research-source-refresh` CLI
affects: [researcher, 03-insights-extractions]
tech-stack:
  added: []
  patterns:
    - append-only evidence snapshots per source and timestamp
    - freshness-window-driven stale detection during refresh
    - manual side-state overrides layered after derived state
key-files:
  created:
    - internal/tools/researcher/core/sources/captures.ts
    - internal/tools/researcher/core/sources/refresh.ts
    - internal/tools/researcher/__tests__/source-refresh.spec.ts
    - scripts/research-source-refresh.ts
    - .planning/phases/02-source-registry-evidence-capture/02-03-SUMMARY.md
  modified:
    - internal/tools/researcher/__tests__/resume.spec.ts
key-decisions:
  - "Capture bytes live under `data/<bucket>/<SRC-ID>/<timestamp>/...` and are referenced from `sources.json` rather than embedded in it."
  - "Refresh derives `stale` from `manifest.freshness.window_days`, then applies operator overrides for `stale`, `rejected`, and `superseded`."
  - "Resume compatibility remains a hard requirement even after the richer source schema and refresh metadata land."
patterns-established:
  - "Capture storage, refresh metadata updates, and manifest debt recomputation all reuse the shared Phase 2 source store."
  - "Refresh CLIs stay provider-neutral and JSON-only while still supporting append-only evidence writes."
requirements-completed: [SRC-03, SRC-04]
duration: 15min
completed: 2026-04-11
---

# Phase 02 Plan 03: Evidence Capture and Refresh Summary

**Implemented append-only evidence capture storage, deterministic source refresh semantics, and stale-source detection derived from the manifest freshness window.**

## Performance

- **Duration:** 15 min
- **Completed:** 2026-04-11T08:59:30Z
- **Files modified:** 6

## Accomplishments

- Added `captures.ts` to copy external evidence files into `data/snapshots|exports|transcripts|datasets/<SRC-ID>/<timestamp>/...` and return root-relative capture refs.
- Added `refresh.ts` to preserve stable source IDs, append capture history, update freshness metadata, recompute stale debt, and manage source-layer side states.
- Added `research-source-refresh.ts` as a thin JSON-only CLI over the refresh core.
- Added `source-refresh.spec.ts` and extended `resume.spec.ts` so append-only capture history, derived stale detection, manual side-state overrides, and disk-only resume compatibility are all exercised in tests.

## Verification

- `pnpm exec vitest run internal/tools/researcher/__tests__/source-refresh.spec.ts internal/tools/researcher/__tests__/resume.spec.ts`
- `pnpm exec vitest run internal/tools/researcher/__tests__/contracts.spec.ts internal/tools/researcher/__tests__/source-add.spec.ts internal/tools/researcher/__tests__/source-refresh.spec.ts internal/tools/researcher/__tests__/resume.spec.ts`
- `pnpm typecheck`
- `pnpm lint`

## Notes

- `pnpm lint` completed with the same two pre-existing warnings outside the Researcher surface:
  - `components/presentations/deep-research/slides/02-group-project.tsx`
  - `components/presentations/voice-agents/jarvis/jarvis-sidebar.tsx`

## Next Readiness

- Phase 3 can build insight extraction on top of stable `SRC-*` references, append-only capture history, and refresh-aware freshness metadata.
- Later report and analysis phases can reuse the source-layer stale signal without needing to re-open Phase 2 storage contracts.
