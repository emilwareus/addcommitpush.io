---
phase: 03-insights-analysis-graph
plan: 03
subsystem: analysis-upsert-resume
tags: [researcher, analysis, contradictions, resume, cli]
requires: [03-01, 03-02]
provides:
  - canonical `ANL-*` upsert flow
  - insight backlink reconciliation from analysis lineage
  - thin `research-analysis` CLI
affects: [04-report-generation, researcher]
tech-stack:
  added: []
  patterns:
    - contradiction-aware analysis contracts
    - insight backlink reconciliation from analysis inputs
    - disk-only resume compatibility after Phase 3 artifacts
key-files:
  created:
    - internal/tools/researcher/core/analysis/backlinks.ts
    - internal/tools/researcher/core/analysis/upsert.ts
    - internal/tools/researcher/__tests__/analysis-upsert.spec.ts
    - scripts/research-analysis.ts
    - .planning/phases/03-insights-analysis-graph/03-03-SUMMARY.md
  modified:
    - internal/tools/researcher/__tests__/resume.spec.ts
key-decisions:
  - "Keep contradictions, caveats, open questions, and next moves as required bullet-list sections instead of optional narrative prose."
  - "Use insight IDs as the only authoritative upstream lineage for analysis artifacts; raw source URLs do not belong in machine lineage."
  - "Preserve disk-only resume semantics by treating `INS-*` and `ANL-*` files as filesystem truth rather than adding a sidecar graph index."
patterns-established:
  - "Analysis promotion follows the same deterministic pattern as insight promotion: validate inputs, write one canonical Markdown file, reconcile backlinks, then sync manifest inventory."
  - "Phase 3 artifacts stay resumable and packageable without any hidden in-memory state."
requirements-completed: [INS-03, INS-04]
duration: 15min
completed: 2026-04-11
---

# Phase 03 Plan 03: Analysis Upsert and Resume Summary

**Implemented contradiction-aware analysis artifacts, synchronized insight backlinks from analysis lineage, and extended disk-only resume to understand Phase 3 artifact inventories and routing.**

## Performance

- **Duration:** 15 min
- **Completed:** 2026-04-11T09:49:30Z
- **Files modified:** 5

## Accomplishments

- Added `upsertAnalysis()` to allocate stable `ANL-*` IDs, enforce the fixed analysis contract, preserve update identity, and sync manifest analysis inventory.
- Added insight backlink reconciliation so referenced insights maintain sorted `linked_analysis` arrays when analyses are created or revised.
- Added `research-analysis.ts` as a thin JSON-only CLI over the shared analysis core.
- Extended `resume.spec.ts` with Phase 3 fixtures proving `package-report` routing when insights and analysis are present and `refresh-sources` routing still wins when stale debt exists.

## Verification

- `pnpm exec vitest run internal/tools/researcher/__tests__/analysis-upsert.spec.ts internal/tools/researcher/__tests__/analysis-contract.spec.ts`
- `pnpm exec vitest run internal/tools/researcher/__tests__/resume.spec.ts`
- `pnpm exec vitest run internal/tools/researcher/__tests__/insight-contract.spec.ts internal/tools/researcher/__tests__/insight-upsert.spec.ts internal/tools/researcher/__tests__/insight-lineage.spec.ts internal/tools/researcher/__tests__/analysis-contract.spec.ts internal/tools/researcher/__tests__/analysis-upsert.spec.ts internal/tools/researcher/__tests__/resume.spec.ts`
- `pnpm typecheck`
- `pnpm lint`

## Notes

- `pnpm lint` completed with the same two pre-existing warnings outside the Researcher surface:
  - `components/presentations/deep-research/slides/02-group-project.tsx`
  - `components/presentations/voice-agents/jarvis/jarvis-sidebar.tsx`

## Next Readiness

- Phase 4 can now compile multiple reports from one research base using stable insight and analysis inputs with explicit lineage.
- Phase 5 can build freshness and verification debt routing on top of already-linked `sources -> insights -> analysis` artifacts.
