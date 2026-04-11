---
phase: 03-insights-analysis-graph
plan: 02
subsystem: insight-upsert-lineage
tags: [researcher, insights, lineage, cli, dedupe]
requires: [03-01]
provides:
  - canonical `INS-*` upsert flow
  - source-to-insight backlink reconciliation
  - thin `research-insight` CLI
affects: [03-03, researcher]
tech-stack:
  added: []
  patterns:
    - duplicate rejection before ID allocation
    - source backlink reconciliation from forward lineage
    - deterministic JSON-only CLI results
key-files:
  created:
    - internal/tools/researcher/core/insights/backlinks.ts
    - internal/tools/researcher/core/insights/upsert.ts
    - internal/tools/researcher/__tests__/insight-upsert.spec.ts
    - internal/tools/researcher/__tests__/insight-lineage.spec.ts
    - scripts/research-insight.ts
    - .planning/phases/03-insights-analysis-graph/03-02-SUMMARY.md
key-decisions:
  - "Reject missing source IDs and obvious duplicates before writing any new insight file or advancing `manifest.next_ids.insight`."
  - "Treat `sources.json[*].linked_insights` as reconciled output from the insight artifact's forward lineage rather than a separate registry to maintain manually."
  - "Preserve `linked_analysis` and `linked_reports` on insight updates so later phases remain additive instead of re-hydrating from chat state."
patterns-established:
  - "Insight promotion uses one shared core service that owns file writes, manifest inventory sync, and source backlink updates together."
  - "Thin CLIs stay machine-oriented: argv in, deterministic JSON out, no alternate mutation path."
requirements-completed: [INS-01, INS-02]
duration: 12min
completed: 2026-04-11
---

# Phase 03 Plan 02: Insight Upsert and Lineage Summary

**Implemented the canonical insight promotion flow, synchronized source backlinks from forward lineage, and exposed a thin JSON-only `research-insight` CLI.**

## Performance

- **Duration:** 12 min
- **Completed:** 2026-04-11T09:45:30Z
- **Files modified:** 6

## Accomplishments

- Added `upsertInsight()` to allocate stable `INS-*` IDs, write canonical Markdown artifacts, preserve update identity, and keep manifest inventory in sync.
- Added source backlink reconciliation so `sources.json[*].linked_insights` is updated on both create and update, including dropped-source unlink cases.
- Added deterministic duplicate rejection based on normalized claim/title plus overlapping source lineage.
- Added `research-insight.ts` and focused tests covering create, update, CLI output, missing-source failure, and duplicate rejection.

## Verification

- `pnpm exec vitest run internal/tools/researcher/__tests__/insight-upsert.spec.ts internal/tools/researcher/__tests__/insight-lineage.spec.ts`
- `pnpm exec vitest run internal/tools/researcher/__tests__/insight-contract.spec.ts internal/tools/researcher/__tests__/insight-upsert.spec.ts internal/tools/researcher/__tests__/insight-lineage.spec.ts`
- `pnpm typecheck`
- `pnpm lint`

## Notes

- `pnpm lint` completed with the same two pre-existing warnings outside the Researcher surface:
  - `components/presentations/deep-research/slides/02-group-project.tsx`
  - `components/presentations/voice-agents/jarvis/jarvis-sidebar.tsx`

## Next Readiness

- Plan `03-03` can now build higher-order analysis directly on stable `INS-*` artifacts and their persisted lineage.
- Resume and later report flows can trust insight IDs plus source backlinks as the durable bridge between evidence and downstream packaging.
