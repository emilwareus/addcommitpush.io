---
phase: 01-research-workspace-bootstrap
plan: 04
subsystem: infra
tags: [researcher, filesystem, vitest, tsx, cli, resume]
requires:
  - phase: 01-02
    provides: Manifest and sources validators plus root-confined workspace path guards
  - phase: 01-03
    provides: Init-created research workspaces, shared ID contracts, and the research-init CLI
provides:
  - Disk-only research resume from validated workspace artifacts
  - Inventory-based summary payloads that scan workspace files instead of trusting manifest counters
  - Thin research-resume CLI aligned with the init-created workspace contract
affects: [02-01, 05-01, runtime-adapters, status-routing]
tech-stack:
  added: []
  patterns: [disk-first resume core, inventory-driven status summaries, thin runtime-neutral cli]
key-files:
  created:
    - internal/tools/researcher/core/resume.ts
    - scripts/research-resume.ts
  modified:
    - internal/tools/researcher/__tests__/resume.spec.ts
key-decisions:
  - "Resume derives inventory from sources.json and on-disk artifact scans instead of trusting manifest inventory counters."
  - "nextRecommendedAction stays machine-readable and prioritizes freshness debt once a research has recorded sources."
  - "The resume CLI prints the shared core payload directly so init and resume stay aligned on one public contract."
patterns-established:
  - "Disk-only resume pattern: validate brief.md, manifest.json, and sources.json first, then summarize the workspace from real files."
  - "Progress-router summary pattern: expose stage, state, freshness debt, inventory, and one next action as deterministic JSON."
requirements-completed: [RSCH-03]
duration: 4 min
completed: 2026-04-10
---

# Phase 01 Plan 04: Disk-Only Resume Summary

**Disk-only research resume with validated workspace artifacts, scanned inventory counts, and a thin CLI that returns the next recommended action as machine-readable JSON**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-10T14:49:13Z
- **Completed:** 2026-04-10T14:53:02Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Replaced the placeholder resume spec with integration coverage for real init-created workspaces, stale manifest inventory, and hard-fail validation paths.
- Added a shared `resumeResearchWorkspace(...)` core that validates `brief.md`, `manifest.json`, and `sources.json`, scans `insights/`, `analysis/`, and `reports/`, and returns a deterministic summary payload.
- Added `scripts/research-resume.ts` as a thin runtime-neutral CLI and verified it against a workspace created by `scripts/research-init.ts`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement disk-only resume and inventory-based summary logic** - `00a0480` (test)
2. **Task 1: Implement disk-only resume and inventory-based summary logic** - `17a267a` (feat)
3. **Task 2: Add the thin `research-resume` CLI entrypoint and smoke test it against a real initialized workspace** - `138b767` (feat)
4. **Verification follow-up: remove the new in-scope lint warning from the resume core** - `8aba205` (fix)

## Files Created/Modified

- `internal/tools/researcher/__tests__/resume.spec.ts` - Integration coverage for disk-only resume, stale manifest counters, and fail-fast validation behavior.
- `internal/tools/researcher/core/resume.ts` - Shared resume core that validates workspace files, scans inventories, checks identity consistency, and derives the next action.
- `scripts/research-resume.ts` - Thin CLI wrapper that parses `--project-root` and `--slug` and prints the shared resume JSON payload.

## Decisions Made

- Resume uses the validated source envelope plus directory scans as the source of truth for inventory, keeping manifest counters advisory instead of authoritative.
- Freshness debt is surfaced as a compact string (`clear` or `overdue:<n>`) and can outrank stage progression when recommending the next action.
- The CLI emits the full shared result shape so later runtime adapters can consume one stable resume contract without extra translation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added workspace-identity and workspace-root integrity checks during resume**
- **Found during:** Task 1 (Implement disk-only resume and inventory-based summary logic)
- **Issue:** Schema validation alone would not catch a symlinked workspace root or mismatched research identity across `manifest.json` and `sources.json`, which could poison later status routing.
- **Fix:** Added a workspace-root symlink rejection plus manifest/source identity consistency checks before building the resume summary.
- **Files modified:** `internal/tools/researcher/core/resume.ts`
- **Verification:** `pnpm exec vitest run internal/tools/researcher/__tests__/resume.spec.ts`, `pnpm typecheck`
- **Committed in:** `17a267a`

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** The deviation tightened the resume trust boundary without changing the requested scope or public contract.

## Issues Encountered

- `pnpm lint` surfaced one new unused-binding warning in `internal/tools/researcher/core/resume.ts` during final verification; it was fixed in `8aba205`.
- `pnpm lint` still reports two pre-existing warnings in unrelated presentation files. They were already tracked in `.planning/phases/01-research-workspace-bootstrap/deferred-items.md` and were left untouched.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2 can build source-registry mutation and evidence-capture flows on top of a real init→resume contract that reconstructs state from disk only.
- Phase 5 status work can reuse the new inventory, freshness debt, and next-action summary shape instead of inventing a second status payload.
- The unrelated untracked `researcher/` docs, templates, and examples tree remained untouched, as required.

## Self-Check: PASSED

- Found `.planning/phases/01-research-workspace-bootstrap/01-04-SUMMARY.md`
- Found commit `00a0480`
- Found commit `17a267a`
- Found commit `138b767`
- Found commit `8aba205`

---
*Phase: 01-research-workspace-bootstrap*
*Completed: 2026-04-10*
